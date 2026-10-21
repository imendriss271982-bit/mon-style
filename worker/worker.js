// My Style — Worker corrigé : répond toujours avec les en-têtes CORS,
// même en cas de plantage, pour que l'app affiche la vraie erreur.
const ALLOWED = ["https://imendriss271982-bit.github.io"];
let GOOD_MODEL = "";
let GOOD_IMG = "";

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
          hello_ar: n => `هلا والله${n ? " " + n : ""}! أنا أورا، الستايلست الخاصة فيچ. موجودة عشان أطلّع جمالچ، وأخليچ تحسين بثقة كل يوم.`
        };
        // Arabe : Aura lit à voix haute les phrases de l'application (texte arabe uniquement, 480 caractères max).
        // Anglais : même principe, avec la voix habituelle d'Aura (texte latin uniquement).
        if (b2.type === "say_ar" || b2.type === "say_en") {
          const en = b2.type === "say_en";
          const texte = String(b2.texte || "").normalize("NFC").slice(0, 480).trim();
          if (!texte || (en ? !/^[\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}’'…]+$/u.test(texte) : !/[؀-ۿ]/.test(texte))) return json({ erreur: "Texte invalide." }, 400);
          const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)))].map(x => x.toString(16).padStart(2, "0")).join("");
          const ck2 = new Request("https://cache.mon-style/" + b2.type + "/" + h);
          let hit2 = await caches.default.match(ck2);
          if (!hit2) {
            const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${en ? (env.VOICE_ID || "cgSgspJ2msm6clMCkdW9") : "w0uhBAmNIG5kUDeaFEsA"}?output_format=mp3_44100_64`, {
              method: "POST",
              headers: { "xi-api-key": EK, "Content-Type": "application/json", "Accept": "audio/mpeg" },
              body: JSON.stringify({ text: texte, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
            });
            if (!r.ok) return json({ erreur: "Erreur ElevenLabs " + r.status }, 502);
            hit2 = new Response(await r.arrayBuffer(), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000" } });
            await caches.default.put(ck2, hit2.clone());
          }
          return new Response(hit2.body, { headers: { ...cors, "Content-Type": "audio/mpeg" } });
        }
        const kind = PH[b2.type] ? b2.type : "enchantee";
        if (!nom && !kind.startsWith("hello_")) return json({ erreur: "Prénom manquant." }, 400);
        const ck = new Request("https://cache.mon-style/tts2/" + kind + "/" + encodeURIComponent(nom.toLowerCase() || "_"));
        const cache = caches.default;
        let hit = await cache.match(ck);
        if (!hit) {
          // Arabe : voix féminine khaleeji (Maryam Essa) ; sinon la voix habituelle d'Aura.
          const voice = kind === "hello_ar" ? "w0uhBAmNIG5kUDeaFEsA" : (env.VOICE_ID || "cgSgspJ2msm6clMCkdW9");
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

      // Essai make-up : Gemini (modèle d'images) maquille la photo de la cliente selon sa tenue. Réservé aux abonnées dans l'app.
      if (new URL(req.url).pathname === "/makeup") {
        let b3 = {};
        try { b3 = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }
        const img = b3 && b3.image, mp = String((b3 && b3.prompt) || "").slice(0, 5000);
        if (typeof img !== "string" || !img || img.length > 6e6 || !mp) return json({ erreur: "Requête invalide." }, 400);
        const ibody = JSON.stringify({ contents: [{ role: "user", parts: [{ text: mp }, { inline_data: { mime_type: "image/jpeg", data: img } }] }],
          generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 0.4 } });
        const T1 = Date.now();
        const icall = async model => {
          const left = 85000 - (Date.now() - T1);
          if (left < 5000) return new Response(JSON.stringify({ error: { message: "timeout" } }), { status: 504 });
          try {
            return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
              { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY }, body: ibody, signal: AbortSignal.timeout(Math.min(60000, left)) });
          } catch { return new Response(JSON.stringify({ error: { message: "timeout" } }), { status: 504 }); }
        };
        let ir = null, quotaMsg = "";
        const tryImg = async list => {
          for (const model of list) {
            ir = await icall(model);
            // 429 = quota épuisé ou pas de quota pour ce modèle (souvent : clé gratuite) : on garde le message et on essaie le modèle suivant.
            if (ir.status === 429) { try { const q = await ir.clone().json(); quotaMsg = (q.error && q.error.message) || quotaMsg; } catch {} continue; }
            if (ir.status === 404 || ir.status === 400 || ir.status === 503 || ir.status === 500 || ir.status === 504) continue;
            if (ir.ok) GOOD_IMG = model;
            return true;
          }
          return false;
        };
        const ilist = [GOOD_IMG, String(env.IMAGE_MODEL || "").trim(), "gemini-3.6-flash-image", "gemini-3-pro-image-preview", "gemini-3-flash-image", "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"].filter(Boolean);
        if (!(await tryImg([...new Set(ilist)]))) {
          // Les noms changent : on demande à Google la liste actuelle des modèles qui créent des images.
          try {
            const lr = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": KEY } });
            const lj = await lr.json();
            const names = (lj.models || [])
              .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
              .map(m => String(m.name || "").replace(/^models\//, ""))
              .filter(n => /image/i.test(n) && /gemini/i.test(n) && !/(tts|audio|live|embedding)/i.test(n));
            names.sort((a, b) => (b.match(/\d+(\.\d+)?/) || [0])[0] - (a.match(/\d+(\.\d+)?/) || [0])[0]);
            await tryImg(names.slice(0, 4));
          } catch {}
        }
        let idata = {};
        try { idata = await ir.json(); } catch {}
        if (!ir || !ir.ok) {
          if (quotaMsg || (ir && ir.status === 429)) {
            const free = /limit: ?0|free.?tier|billing|quota/i.test(quotaMsg);
            return json({ erreur: free ? "La création d’images n’est pas incluse dans la version gratuite de la clé Gemini. Active la facturation sur ta clé Gemini (Google AI Studio) pour utiliser l’essai make-up." : "Trop de demandes. Réessaie dans un instant.",
              code: free ? "no_billing" : "rate_limited", detail: quotaMsg.slice(0, 300) }, 429);
          }
          if (ir && (ir.status === 503 || ir.status === 500 || ir.status === 504)) return json({ erreur: "Le make-up est très demandé en ce moment. Réessaie dans une minute.", code: "busy" }, 503);
          return json({ erreur: "Erreur Gemini " + (ir ? ir.status : "") + " : " + ((idata.error && idata.error.message) || "inconnue"), code: "ai_error" }, 502);
        }
        const icand = idata.candidates && idata.candidates[0];
        const iparts = (icand && icand.content && icand.content.parts) || [];
        const pic = iparts.find(x => (x.inlineData || x.inline_data) && /image/.test((x.inlineData || x.inline_data).mimeType || (x.inlineData || x.inline_data).mime_type || ""));
        const said = iparts.map(x => x.text || "").join(" ").trim().slice(0, 600);
        if (!pic) return json({ erreur: "Je n'ai pas réussi à créer ton make-up avec cette photo. Réessaie avec une photo de face, bien éclairée.", code: "no_image" }, 502);
        const d = pic.inlineData || pic.inline_data;
        return json({ image: d.data, mime: d.mimeType || d.mime_type || "image/png", texte: said });
      }

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
