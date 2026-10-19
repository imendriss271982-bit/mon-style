// My Style — Worker corrigé : répond toujours avec les en-têtes CORS,
// même en cas de plantage, pour que l'app affiche la vraie erreur.
const ALLOWED = ["https://imendriss271982-bit.github.io"];

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
      });

    try {
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (req.method !== "POST" || !ALLOWED.includes(origin)) return json({ erreur: "Accès refusé." }, 403);
      const KEY = String(env.GEMINI_KEY || "").replace(/[^\x21-\x7E]/g, "").replace(/^["']+|["']+$/g, "");
      if (!KEY) return json({ erreur: "La clé Gemini n'est pas configurée sur Cloudflare." }, 500);

      let body;
      try { body = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }

      const prompt = body && body.prompt;
      const images = Array.isArray(body && body.images) ? body.images : [];
      if (typeof prompt !== "string" || prompt.length > 60000 || images.length > 3)
        return json({ erreur: "Requête invalide." }, 400);

      let size = 0;
      for (const i of images) {
        if (!i || typeof i.data !== "string") return json({ erreur: "Photo invalide." }, 400);
        size += i.data.length;
      }
      if (size > 8e6) return json({ erreur: "Photo trop lourde." }, 413);

      const parts = [
        { text: prompt },
        ...images.map(i => ({ inline_data: { mime_type: i.mime || "image/jpeg", data: i.data } }))
      ];
      const model = String(env.MODEL || "").trim() || "gemini-2.5-flash";

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.4 }
          })
        }
      );

      let data = {};
      try { data = await r.json(); } catch {}

      if (!r.ok) {
        if (r.status === 429) return json({ erreur: "Trop de demandes. Réessaie dans un instant.", code: "rate_limited" }, 429);
        const msg = (data.error && data.error.message) || "inconnue";
        return json({ erreur: "Erreur Gemini " + r.status + " : " + msg, code: "ai_error" }, 502);
      }

      const cand = data.candidates && data.candidates[0];
      const text = ((cand && cand.content && cand.content.parts) || []).map(p => p.text || "").join("");
      if (!text) {
        const why = (cand && cand.finishReason) || (data.promptFeedback && data.promptFeedback.blockReason) || "réponse vide";
        return json({ erreur: "Gemini n'a rien renvoyé (" + why + "). Réessaie avec une autre photo." }, 502);
      }

      const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
      try {
        return json(JSON.parse(clean));
      } catch {
        return json({ erreur: "La réponse n'a pas pu être lue. Réessaie.", code: "invalid_json" }, 502);
      }
    } catch (e) {
      return json({ erreur: "Erreur du serveur : " + (e && e.message ? e.message : String(e)) }, 500);
    }
  }
};
