// Mini-serveur My Style (Cloudflare Worker) : analyse des photos avec Google Gemini.
// La clé Gemini n'est jamais dans le code : elle est enregistrée dans Cloudflare
// comme variable secrète nommée GEMINI_KEY.

const ALLOWED = ["https://imendriss271982-bit.github.io"];

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST" || !ALLOWED.includes(origin)) return json({ erreur: "Accès refusé." }, 403);
    if (!env.GEMINI_KEY) return json({ erreur: "La clé Gemini n'est pas configurée." }, 500);

    let body;
    try { body = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }
    const prompt = body && body.prompt;
    const images = Array.isArray(body && body.images) ? body.images : [];
    if (typeof prompt !== "string" || prompt.length > 60000 || images.length > 3) return json({ erreur: "Requête invalide." }, 400);
    let size = 0;
    for (const i of images) {
      if (!i || typeof i.data !== "string") return json({ erreur: "Photo invalide." }, 400);
      size += i.data.length;
    }
    if (size > 8000000) return json({ erreur: "Photo trop lourde." }, 413);

    const parts = [{ text: prompt }, ...images.map(i => ({ inline_data: { mime_type: i.mime || "image/jpeg", data: i.data } }))];
    const model = env.MODEL || "gemini-flash-latest";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    });
    let data = {};
    try { data = await r.json(); } catch {}
    if (!r.ok) {
      return json({ erreur: r.status === 429 ? "Trop de demandes. Réessaie dans un instant." : "Erreur Gemini " + r.status + " : " + ((data.error && data.error.message) || "inconnue"), code: r.status === 429 ? "rate_limited" : "ai_error" }, r.status === 429 ? 429 : 502);
    }
    const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    try { return json(JSON.parse(text)); }
    catch { return json({ erreur: "La réponse n'a pas pu être lue. Réessaie.", code: "invalid_json" }, 502); }
  },
};
