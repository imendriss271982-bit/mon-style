// Diva Divina — Suivi de Diva (v225, Imen 17 novembre 2026 : « بتفتكرها… تخرج برا التليفون كنوتيفيكيشن »).
// Diva pose plus tard une question à la cliente (« Comment s'est passée ta journée au travail ? », « Comment s'est passé
// le mariage de ta sœur ? »). Le téléphone prépare la question et l'heure ; ce fichier la garde jusqu'à l'heure prévue et
// envoie une notification « Web Push » (même app fermée), SANS contenu. v226 (Imen : « الرسالة ما تبان من برا ») : la
// notification dit seulement « Diva a un message pour toi 💛 » ; la question n'est JAMAIS sur le serveur ni sur l'écran
// verrouillé, elle s'affiche dans l'app quand la cliente touche la notification. Mode `silent` : notification sans son ni vibration. Clés VAPID créées toutes seules au premier usage et gardées dans la base (aucune variable à régler).
// Tables D1 (base MAJLIS) : ms_cfg (k, v), ms_push (ep, p256dh, auth, dev, lang, cree), ms_suivi (id, ep, at, t, b, etat, cree).
// etat : 0 = en attente, 1 = notification envoyée (texte pas encore lu par le téléphone), 2 = affichée.

const PUSH_HOSTS = /^(fcm\.googleapis\.com|android\.googleapis\.com|web\.push\.apple\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|[a-z0-9-]+\.notify\.windows\.com)$/i;
const MAX_ATTENTE = 20;           // questions en attente au plus par téléphone
const MAX_DELAI = 30 * 864e5;     // au plus 30 jours à l'avance
const GARDE = 40 * 864e5;         // tout est effacé après 40 jours

const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const txt = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

let INIT = false;
async function init(DB) {
  if (INIT) return;
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_cfg (k TEXT PRIMARY KEY, v TEXT)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_push (ep TEXT PRIMARY KEY, p256dh TEXT, auth TEXT, dev TEXT, lang TEXT, mode TEXT, cree INTEGER)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_suivi (id TEXT PRIMARY KEY, ep TEXT NOT NULL, at INTEGER NOT NULL, t TEXT, b TEXT, etat INTEGER NOT NULL DEFAULT 0, cree INTEGER)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS ms_suivi_at ON ms_suivi (etat, at)")
  ]);
  INIT = true;
}

// Clés VAPID (ECDSA P-256), créées une seule fois.
export async function vapid(DB) {
  const r = await DB.prepare("SELECT v FROM ms_cfg WHERE k='vapid'").first();
  if (r && r.v) { try { return JSON.parse(r.v); } catch (e) {} }
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const v = { jwk: await crypto.subtle.exportKey("jwk", kp.privateKey), pub: b64u(await crypto.subtle.exportKey("raw", kp.publicKey)) };
  await DB.prepare("INSERT INTO ms_cfg (k, v) VALUES ('vapid', ?) ON CONFLICT(k) DO NOTHING").bind(JSON.stringify(v)).run();
  const again = await DB.prepare("SELECT v FROM ms_cfg WHERE k='vapid'").first();
  return JSON.parse(again.v);
}

// En-tête « Authorization: vapid t=…, k=… » pour un abonnement donné.
export async function vapidHeader(v, endpoint, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const enc = o => b64u(new TextEncoder().encode(JSON.stringify(o)));
  const data = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: "mailto:imendriss@divadivina.app" });
  const key = await crypto.subtle.importKey("jwk", v.jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(data));
  return "vapid t=" + data + "." + b64u(sig) + ", k=" + v.pub;
}

function epOk(ep) {
  try { const u = new URL(String(ep || "")); return u.protocol === "https:" && PUSH_HOSTS.test(u.hostname) && ep.length < 800; } catch (e) { return false; }
}

// Routes appelées par l'app (jeton d'appareil déjà vérifié : DEV).
export async function suivi(P, B, env, json, DEV) {
  const DB = env.MAJLIS;
  if (!DB) return json({ erreur: "Les rappels ne sont pas encore activés." }, 503);
  await init(DB);
  const now = Date.now();
  if (P === "/suivi/key") return json({ key: (await vapid(DB)).pub });

  if (P === "/suivi/add") {
    const s = B.sub || {}, ep = String(s.endpoint || ""), k = s.keys || {};
    if (!epOk(ep)) return json({ erreur: "Notifications non prises en charge sur ce téléphone.", code: "ep" }, 400);
    // Ni titre ni texte gardés : seulement l'heure.
    const id = txt(B.id, 24).replace(/[^a-z0-9]/gi, ""), at = Math.round(Number(B.at)), t = "Diva", b = "";
    if (id.length < 8 || !(at > now - 36e5 && at < now + MAX_DELAI)) return json({ erreur: "Rappel invalide.", code: "data" }, 400);
    const n = await DB.prepare("SELECT COUNT(*) AS n FROM ms_suivi s JOIN ms_push p ON p.ep = s.ep WHERE p.dev = ? AND s.etat = 0").bind(DEV).first();
    if (n && n.n >= MAX_ATTENTE) return json({ erreur: "Trop de rappels en attente.", code: "quota" }, 429);
    // La langue et le mode ne changent que si le téléphone les envoie (sinon on garde le réglage du Profil).
    const lang = ["fr", "en", "ar"].includes(B.lang) ? B.lang : null, mode = B.mode === "silent" || B.mode === "on" ? B.mode : null;
    await DB.batch([
      DB.prepare("INSERT INTO ms_push (ep, p256dh, auth, dev, lang, mode, cree) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(ep) DO UPDATE SET p256dh=?2, auth=?3, dev=?4, lang=COALESCE(?5, lang), mode=COALESCE(?6, mode)")
        .bind(ep, txt(k.p256dh, 200), txt(k.auth, 60), DEV, lang, mode, now),
      DB.prepare("INSERT INTO ms_suivi (id, ep, at, t, b, etat, cree) VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6) ON CONFLICT(id) DO UPDATE SET at=?3, t=?4, b=?5, etat=0")
        .bind(id, ep, at, t, b, now)
    ]);
    return json({ ok: true });
  }

  if (P === "/suivi/del") {
    const ids = (Array.isArray(B.ids) ? B.ids : [B.id]).map(x => txt(x, 24).replace(/[^a-z0-9]/gi, "")).filter(Boolean).slice(0, 50);
    for (const id of ids) await DB.prepare("DELETE FROM ms_suivi WHERE id = ? AND ep IN (SELECT ep FROM ms_push WHERE dev = ?)").bind(id, DEV).run();
    return json({ ok: true });
  }

  // Réglage du Profil « Messages de Diva » : avec son ou silencieux (et la langue du texte de la notification).
  if (P === "/suivi/mode") {
    const mode = B.mode === "silent" ? "silent" : "on", lang = ["fr", "en", "ar"].includes(B.lang) ? B.lang : "fr";
    await DB.prepare("UPDATE ms_push SET mode = ?, lang = ? WHERE dev = ?").bind(mode, lang, DEV).run();
    return json({ ok: true });
  }

  if (P === "/suivi/wipe") {
    await DB.batch([
      DB.prepare("DELETE FROM ms_suivi WHERE ep IN (SELECT ep FROM ms_push WHERE dev = ?)").bind(DEV),
      DB.prepare("DELETE FROM ms_push WHERE dev = ?").bind(DEV)
    ]);
    return json({ ok: true });
  }
  return json({ erreur: "Action inconnue." }, 400);
}

// Appelée par le service worker du téléphone quand une notification arrive (pas de jeton : l'adresse d'abonnement suffit,
// elle est secrète et propre à ce téléphone). Renvoie les questions envoyées et pas encore affichées.
export async function suiviPending(B, env, json) {
  const DB = env.MAJLIS;
  if (!DB) return json({ msgs: [] });
  await init(DB);
  const ep = String(B.ep || "");
  if (!epOk(ep)) return json({ msgs: [] });
  const p = await DB.prepare("SELECT lang, mode FROM ms_push WHERE ep = ?").bind(ep).first();
  const r = await DB.prepare("SELECT id FROM ms_suivi WHERE ep = ? AND etat = 1 ORDER BY at LIMIT 3").bind(ep).all();
  const msgs = (r.results || []).map(x => ({ id: x.id }));
  for (const m of msgs) await DB.prepare("UPDATE ms_suivi SET etat = 2 WHERE id = ?").bind(m.id).run();
  return json({ msgs, lang: (p && p.lang) || "fr", silent: !!(p && p.mode === "silent") });
}

// Toutes les 10 minutes (wrangler.jsonc « triggers.crons ») : envoie les questions arrivées à l'heure.
export async function suiviCron(env, now = Date.now(), fetcher = fetch) {
  const DB = env.MAJLIS;
  if (!DB) return { envoyes: 0 };
  await init(DB);
  const r = await DB.prepare("SELECT s.id, s.ep FROM ms_suivi s WHERE s.etat = 0 AND s.at <= ? ORDER BY s.at LIMIT 200").bind(now).all();
  const rows = r.results || [];
  let envoyes = 0;
  if (rows.length) {
    const v = await vapid(DB);
    const parEp = new Map();
    for (const x of rows) { if (!parEp.has(x.ep)) parEp.set(x.ep, []); parEp.get(x.ep).push(x.id); }
    for (const [ep, ids] of parEp) {
      let st = 0;
      try {
        const res = await fetcher(ep, { method: "POST", headers: { Authorization: await vapidHeader(v, ep, now), TTL: "86400", Urgency: "normal", "Content-Length": "0" } });
        st = res.status;
      } catch (e) { st = 0; }
      if (st === 404 || st === 410) {
        // Abonnement expiré (notifications retirées, app désinstallée) : on oublie ce téléphone.
        await DB.batch([DB.prepare("DELETE FROM ms_suivi WHERE ep = ?").bind(ep), DB.prepare("DELETE FROM ms_push WHERE ep = ?").bind(ep)]);
      } else if (st >= 200 && st < 300) {
        for (const id of ids) await DB.prepare("UPDATE ms_suivi SET etat = 1 WHERE id = ?").bind(id).run();
        envoyes += ids.length;
      }
      // Autre erreur (réseau, 429, 5xx) : on réessaiera au prochain passage.
    }
  }
  await DB.prepare("DELETE FROM ms_suivi WHERE cree < ?").bind(now - GARDE).run();
  return { envoyes };
}
