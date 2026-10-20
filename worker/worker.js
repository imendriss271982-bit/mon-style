// My Style — Worker corrigé : répond toujours avec les en-têtes CORS,
// même en cas de plantage, pour que l'app affiche la vraie erreur.
const ALLOWED = ["https://imendriss271982-bit.github.io"];
let GOOD_MODEL = "";

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

      // Voix d'Aura qui dit le prénom de la cliente (ElevenLabs), avec phrases fixes uniquement.
      if (new URL(req.url).pathname === "/tts") {
        const EK = String(env.ELEVEN_KEY || "").replace(/[^\x21-\x7E]/g, "").replace(/^["']+|["']+$/g, "");
        if (!EK) return json({ erreur: "La clé ElevenLabs n'est pas configurée." }, 500);
        let b2 = {};
        try { b2 = await req.json(); } catch {}
        const nom = String(b2.nom || "").normalize("NFC").replace(/[^\p{L}\p{M} '\-]/gu, "").trim().slice(0, 30);
        const PH = {
          enchantee: n => `Enchantée, ${n} ! Moi, c'est Aura.`,
          retour: n => `Salut ${n} ! C'est Aura, ta personal stylist. Je suis là pour révéler ta beauté.`,
          hello_en: n => `Hi${n ? " " + n : ""}! I'm Aura, your personal stylist. I'm here to bring out your beauty.`,
          hello_ar: n => `هلا${n ? " " + n : ""}! أنا أورا، الستايلست الخاصة فيكِ. أنا هنا عشان أبرز جمالكِ.`
        };
        const kind = PH[b2.type] ? b2.type : "enchantee";
        if (!nom && !kind.startsWith("hello_")) return json({ erreur: "Prénom manquant." }, 400);
        const ck = new Request("https://cache.mon-style/tts/" + kind + "/" + encodeURIComponent(nom.toLowerCase() || "_"));
        const cache = caches.default;
        let hit = await cache.match(ck);
        if (!hit) {
          const voice = env.VOICE_ID || "cgSgspJ2msm6clMCkdW9";
          const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
            method: "POST",
            headers: { "xi-api-key": EK, "Content-Type": "application/json", "Accept": "audio/mpeg" },
            body: JSON.stringify({ text: PH[kind](nom), model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
          });
          if (!r.ok) return json({ erreur: "Erreur ElevenLabs " + r.status }, 502);
          const buf = await r.arrayBuffer();
          hit = new Response(buf, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000" } });
          await cache.put(ck, hit.clone());
        }
        return new Response(hit.body, { headers: { ...cors, "Content-Type": "audio/mpeg" } });
      }
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
      const models = [String(env.MODEL || "").trim(), "gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"].filter(Boolean);
      // Réflexion courte : l'analyse arrive beaucoup plus vite.
      const gen = { responseMimeType: "application/json", temperature: 0.4 };
      const fast = JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { ...gen, thinkingConfig: { thinkingLevel: "low" } } });
      const plain = JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: gen });
      const T0 = Date.now();
      const call = async (model, body) => {
        // Chaque essai est limité dans le temps, pour que la cliente n'attende jamais trop.
        const left = 50000 - (Date.now() - T0);
        if (left < 4000) return new Response(JSON.stringify({ error: { message: "timeout" } }), { status: 504 });
        try {
          return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY }, body, signal: AbortSignal.timeout(Math.min(28000, left)) });
        } catch { return new Response(JSON.stringify({ error: { message: "timeout" } }), { status: 504 }); }
      };
      let r;
      const tryModels = async list => {
        for (const model of list) {
          r = await call(model, fast);
          // Si ce modèle ne connaît pas le réglage de réflexion, on réessaie sans.
          if (r.status === 400) r = await call(model, plain);
          // Modèle surchargé ou trop lent : on passe tout de suite au modèle suivant.
          if (r.status === 503 || r.status === 500 || r.status === 504) continue;
          if (r.status !== 404) { if (r.ok) GOOD_MODEL = model; return true; }
        }
        return false;
      };
      if (GOOD_MODEL) models.unshift(GOOD_MODEL);
      if (!(await tryModels([...new Set(models)]))) {
        // Les noms de modèles Gemini changent : on demande à Google la liste actuelle et on prend un modèle « flash » qui accepte les images.
        try {
          const lr = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": KEY } });
          const lj = await lr.json();
          const names = (lj.models || [])
            .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
            .map(m => String(m.name || "").replace(/^models\//, ""))
            .filter(n => /flash/i.test(n) && !/(image|tts|audio|live|embedding|thinking-exp|lite-preview)/i.test(n));
          names.sort((a, b) => (b.match(/\d+(\.\d+)?/) || [0])[0] - (a.match(/\d+(\.\d+)?/) || [0])[0]);
          await tryModels(names.slice(0, 5));
        } catch {}
      }

      let data = {};
      try { data = await r.json(); } catch {}

      if (!r.ok) {
        if (r.status === 429) return json({ erreur: "Trop de demandes. Réessaie dans un instant.", code: "rate_limited" }, 429);
        if (r.status === 503 || r.status === 500 || r.status === 504) return json({ erreur: "L’analyse est très demandée en ce moment. Réessaie dans une minute.", code: "busy" }, 503);
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
