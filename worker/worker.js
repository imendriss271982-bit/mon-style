// Diva Divina — Worker corrigé : répond toujours avec les en-têtes CORS,
// même en cas de plantage, pour que l'app affiche la vraie erreur.
import { expandRef } from "./methode.js";
import { compte, evenements, adminClientes } from "./compte.js";
const ALLOWED = ["https://imendriss271982-bit.github.io"];
// Site vitrine (mystyle.divadivina.app) : seulement la liste d'attente (/liste/…), jamais l'IA.
const SITE = ["https://mystyle.divadivina.app"];
let GOOD_MODEL = "";
let GOOD_IMG = "";
// Limite de demandes par adresse IP (par instance du Worker, au mieux) : l'en-tête Origin peut être imité
// hors navigateur, cette limite évite qu'un robot épuise le crédit Gemini / ElevenLabs.
const HITS = new Map();
const LIMITS = { "/": 60, "/device": 20, "/auth/start": 10, "/auth/verify": 20, "/sync/meta": 120, "/sync/get": 200, "/sync/put": 300, "/ev": 120, "/admin/clientes": 40, "/compte/del": 10, "/auth/out": 20, "/code": 20, "/voice/session": 30, "/makeup": 6, "/tts": 60, "/verif/new": 4, "/verif/get": 60, "/verif/del": 30, "/verif/admin": 40, "/liste/add": 5, "/liste/admin": 40, "/contact/new": 5, "/majlis/msgs": 500, "/majlis/amis": 240, "/majlis/nonlus": 120, "/majlis/send": 150, "/majlis/aura": 60, "/majlis/moi": 20, "/majlis/join": 20, "/majlis/code": 40, "/majlis/quitter": 20, "/majlis/wipe": 10 }; // demandes par 10 minutes
function tooMany(ip, path) {
  const now = Date.now(), win = 600000, key = path + "|" + ip, max = LIMITS[path] || 30;
  const list = (HITS.get(key) || []).filter(t => now - t < win);
  list.push(now); HITS.set(key, list);
  if (HITS.size > 5000) for (const [k, v] of HITS) if (!v.length || now - v[v.length - 1] > win) HITS.delete(k);
  return list.length > max;
}
const MIMES = ["image/jpeg", "image/png", "image/webp"];

// ——— Sécurité des coûts (v180) ———
// 1) Chaque téléphone reçoit un « jeton d'appareil » signé (route /device). Les routes qui coûtent (IA, make-up,
//    voix, appel de Diva) l'exigent : sans jeton valide, rien ne part chez Google ni chez ElevenLabs.
// 2) Quotas par JOUR comptés dans la base D1 (table ms_quota, même base que le Majlis) : par téléphone, par
//    adresse IP et pour toute l'app (un plafond global protège la facture même si quelqu'un fabrique des jetons).
//    Chaque limite peut être changée sans toucher au code avec une variable Cloudflare Q_<NOM> (ex. Q_AI_DEV=120).
// 3) L'IA reçoit une consigne système : elle ne répond que pour l'app de stylisme, en JSON.
const QUOTAS = {
  AI_DEV: 80, AI_IP: 400, AI_ALL: 5000,      // analyses, tenues, chat photo, traductions
  MK_DEV: 5, MK_ALL: 150,                    // essais make-up (images, les plus chers)
  TTS_DEV: 200, TTS_ALL: 6000,               // phrases lues par la voix (seulement si pas déjà en cache)
  VOICE_DEV: 30, VOICE_ALL: 800,             // ouvertures d'appel / de chat avec l'agent Diva
  DEV_IP: 20, DEV_ALL: 3000,                 // nouveaux jetons d'appareil
  CODE_IP: 20,                               // essais de code testeuse
  AUTH_DEV: 6, AUTH_IP: 15, AUTH_MAIL: 5, AUTH_ALL: 1000, // codes de connexion envoyés par email (v181)
  SYNC_USER: 600,                            // sauvegardes dans le cloud par compte et par jour
  EV_DEV: 300                                // envois de mesure d'usage par téléphone et par jour
};
const qmax = (env, k) => { const v = parseInt(env && env["Q_" + k], 10); return v > 0 ? v : QUOTAS[k]; };
const today = () => new Date().toISOString().slice(0, 10);
let QUOTA_READY = false;
async function quotaInit(DB) {
  if (QUOTA_READY) return;
  await DB.prepare("CREATE TABLE IF NOT EXISTS ms_quota (k TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)").run();
  QUOTA_READY = true;
}
// Ajoute 1 à chaque compteur ; renvoie le nom de la première limite dépassée, ou "" si tout va bien.
// Sans base D1 (ne devrait pas arriver), on ne bloque pas : la limite en mémoire (HITS) reste active.
async function quota(env, list) {
  const DB = env.MAJLIS;
  if (!DB || !list.length) return "";
  try {
    await quotaInit(DB);
    const d = today();
    const up = k => DB.prepare("INSERT INTO ms_quota (k, n) VALUES (?1, 1) ON CONFLICT(k) DO UPDATE SET n = n + 1 RETURNING n").bind(d + "|" + k);
    const res = await DB.batch(list.map(([k]) => up(k)));
    if (Math.random() < 0.02) await DB.prepare("DELETE FROM ms_quota WHERE k < ?").bind(d).run();
    for (let i = 0; i < list.length; i++) {
      const n = (res[i] && res[i].results && res[i].results[0] && res[i].results[0].n) || 0;
      if (n > qmax(env, list[i][1])) return list[i][1];
    }
    return "";
  } catch (e) { console.error("quota", e); return ""; }
}
const QUOTA_MSG = "Diva a beaucoup travaillé pour toi aujourd'hui. Reviens demain, elle sera là.";
const BUSY_MSG = "Diva Divina est très demandée aujourd'hui. Réessaie un peu plus tard.";
async function hmacHex(secret, txt) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(txt));
  return [...new Uint8Array(s)].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
// Secret de signature : variable DEVICE_SECRET si elle existe, sinon tiré de la clé Gemini (jamais publiée).
async function devSecret(env) {
  if (env.DEVICE_SECRET) return String(env.DEVICE_SECRET);
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ms-device|" + String(env.GEMINI_KEY || "") + "|" + String(env.ELEVEN_KEY || "")));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
async function devCheck(env, tok) {
  const m = /^([0-9a-f]{16})\.([0-9a-f]{32})$/.exec(String(tok || ""));
  if (!m) return "";
  return (await hmacHex(await devSecret(env), m[1])) === m[2] ? m[1] : "";
}
const DEV_MSG = "Mets à jour Diva Divina : ferme puis rouvre l'application.";
// Consigne système envoyée à Gemini avec chaque demande de l'app.
const GUARD = "Tu es le moteur d'analyse de l'application de stylisme Diva Divina (styliste Diva). Tu ne traites que la mode, les vêtements, la beauté, le maquillage, la coiffure, la colorimétrie, la morphologie, les occasions et l'actualité mode et beauté, ainsi que la traduction des textes de l'application. Pour toute autre demande (code informatique, devoirs, sujets sans rapport), réponds seulement {\"erreur\":\"Je suis ta styliste : je peux t'aider pour ton style, tes tenues et ta beauté.\"}. Réponds toujours en JSON valide, sans texte autour.";

// ——— « Vérifié par une vraie styliste » (v143) ———
// Les demandes des clientes sont rangées dans le KV `VERIF` (namespace « mon-style-styliste », voir wrangler.jsonc),
// 60 jours maximum. La cliente garde un jeton secret pour lire SA réponse ; seule son empreinte est stockée.
// La styliste (page styliste.html) se connecte avec son code : seule son empreinte SHA-256 est comparée.
// v180 : l'empreinte n'est plus dans le code (le dépôt était public). Elle se règle seulement dans Cloudflare :
// variable secrète STYLISTE_HASH = SHA-256 du code de la styliste (en majuscules). Sans elle, l'espace styliste est fermé.
const styHash = env => String(env.STYLISTE_HASH || "").trim().toLowerCase();
const styOk = async (env, code) => !!styHash(env) && (await sha256(txt(code, 40).trim().toUpperCase())) === styHash(env);
const VERIF_TTL = 60 * 24 * 3600;
async function sha256(t) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(t))); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const rndHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");
const txt = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, n);
const okData = (v, mimes, max) => typeof v === "string" && v.length <= max && mimes.some(m => v.startsWith("data:" + m));
async function verif(path, req, env, json) {
  const KV = env.VERIF;
  if (!KV) return json({ erreur: "Le service de la styliste n'est pas encore activé." }, 503);
  let b = {}; try { b = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }
  if (path === "/verif/new") {
    const question = txt(b.question, 1200), profil = txt(b.profil, 6000), quoi = Array.isArray(b.quoi) ? b.quoi.map(x => txt(x, 30)).slice(0, 6) : [];
    if (!question && !quoi.length) return json({ erreur: "Dis-moi ce que tu veux faire vérifier." }, 400);
    const photo = b.photo ? (okData(b.photo, ["image/jpeg", "image/png", "image/webp"], 900000) ? b.photo : null) : "";
    if (photo === null) return json({ erreur: "La photo est trop lourde." }, 400);
    const id = rndHex(8), token = rndHex(16), cree = Date.now();
    const doc = { id, t: await sha256(token), cree, nom: txt(b.nom, 30), lang: txt(b.lang, 2), pays: txt(b.pays, 2), quoi, question, profil, photo, statut: "attente", rep: null };
    await KV.put("d:" + id, JSON.stringify(doc), { expirationTtl: VERIF_TTL, metadata: { statut: "attente", cree, nom: doc.nom, quoi } });
    return json({ id, token, cree });
  }
  if (path === "/verif/get") {
    const id = txt(b.id, 16).replace(/[^0-9a-f]/g, ""), doc = id && await KV.get("d:" + id, "json");
    if (!doc || doc.t !== await sha256(txt(b.token, 64))) return json({ erreur: "Demande introuvable.", code: "introuvable" }, 404);
    return json({ statut: doc.statut, cree: doc.cree, rep: doc.rep });
  }
  // La cliente efface ses données : sa demande est supprimée du serveur (avec son jeton).
  if (path === "/verif/del") {
    const id = txt(b.id, 16).replace(/[^0-9a-f]/g, ""), doc = id && await KV.get("d:" + id, "json");
    if (doc && doc.t === await sha256(txt(b.token, 64))) await KV.delete("d:" + id);
    return json({ ok: true });
  }
  if (path === "/verif/admin") {
    if (!styHash(env)) return json({ erreur: "L'espace styliste n'est pas encore configuré (variable STYLISTE_HASH).", code: "off" }, 503);
    if (!(await styOk(env, b.code))) return json({ erreur: "Code incorrect.", code: "code" }, 401);
    const act = b.action;
    if (act === "list") {
      const out = []; let cur;
      do { const r = await KV.list({ prefix: "d:", cursor: cur }); r.keys.forEach(k => out.push({ id: k.name.slice(2), ...(k.metadata || {}) })); cur = r.list_complete ? null : r.cursor; } while (cur && out.length < 500);
      out.sort((x, y) => (x.statut === "attente" ? 0 : 1) - (y.statut === "attente" ? 0 : 1) || (y.cree || 0) - (x.cree || 0));
      return json({ demandes: out });
    }
    const id = txt(b.id, 16).replace(/[^0-9a-f]/g, ""), doc = id && await KV.get("d:" + id, "json");
    if (!doc) return json({ erreur: "Demande introuvable." }, 404);
    if (act === "read") { const { t, ...rest } = doc; return json(rest); }
    if (act === "reply") {
      const texte = txt(b.texte, 3000), audio = b.audio ? (okData(b.audio, ["audio/"], 3500000) ? b.audio : null) : "";
      if (audio === null) return json({ erreur: "Le message vocal est trop long (2 minutes maximum)." }, 400);
      if (!texte && !audio) return json({ erreur: "Écris ou enregistre ta réponse." }, 400);
      doc.rep = { texte, audio, quand: Date.now() }; doc.statut = "repondu";
      const reste = Math.max(86400, Math.round(VERIF_TTL - (Date.now() - doc.cree) / 1000));
      await KV.put("d:" + id, JSON.stringify(doc), { expirationTtl: reste, metadata: { statut: "repondu", cree: doc.cree, nom: doc.nom, quoi: doc.quoi } });
      return json({ ok: true });
    }
    if (act === "delete") { await KV.delete("d:" + id); return json({ ok: true }); }
    return json({ erreur: "Action inconnue." }, 400);
  }
  return json({ erreur: "Requête invalide." }, 400);
}

// ——— Liste d'attente du site vitrine ———
// Rangée dans le même KV (`VERIF`) avec le préfixe « w: », sans date d'expiration.
// Une inscrite = une clé (empreinte de l'email), donc pas de doublon. Lecture : code de la styliste (page inscrites.html du site).
const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
async function liste(path, req, env, json) {
  const KV = env.VERIF;
  if (!KV) return json({ erreur: "La liste n'est pas encore activée." }, 503);
  let b = {}; try { b = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }
  if (path === "/liste/add") {
    if (b.site) return json({ ok: true }); // champ piège rempli par les robots : on ignore sans le dire
    const email = txt(b.email, 254).trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return json({ erreur: "email", code: "email" }, 400);
    const key = "w:" + (await sha256(email)).slice(0, 32);
    const old = await KV.get(key, "json");
    const o = old || {};
    const doc = { email, prenom: txt(b.prenom, 40).trim() || o.prenom || "", pays: txt(b.pays, 30).trim() || o.pays || "", lang: ["fr", "en", "ar"].includes(b.lang) ? b.lang : (o.lang || "fr"), cree: o.cree || Date.now() };
    await KV.put(key, JSON.stringify(doc), { metadata: doc });
    return json({ ok: true, deja: !!old });
  }
  if (path === "/liste/admin") {
    if (!styHash(env)) return json({ erreur: "L'espace styliste n'est pas encore configuré (variable STYLISTE_HASH).", code: "off" }, 503);
    if (!(await styOk(env, b.code))) return json({ erreur: "Code incorrect.", code: "code" }, 401);
    if (b.action === "list") {
      const out = []; let cur;
      do { const r = await KV.list({ prefix: "w:", cursor: cur }); r.keys.forEach(k => k.metadata && out.push(k.metadata)); cur = r.list_complete ? null : r.cursor; } while (cur && out.length < 20000);
      out.sort((x, y) => (y.cree || 0) - (x.cree || 0));
      return json({ inscrites: out });
    }
    if (b.action === "delete") {
      const email = txt(b.email, 254).trim().toLowerCase();
      await KV.delete("w:" + (await sha256(email)).slice(0, 32));
      return json({ ok: true });
    }
    return json({ erreur: "Action inconnue." }, 400);
  }
  return json({ erreur: "Requête invalide." }, 400);
}

// ——— Contact et séance privée (v156) ———
// La cliente écrit depuis la page Contact de l'app : le message part par email (API Brevo) vers l'adresse d'Imen.
// Variables Cloudflare : BREVO_KEY (secrète, obligatoire), CONTACT_TO et CONTACT_FROM (facultatives,
// imendriss@divadivina.app par défaut ; l'expéditeur doit être validé dans Brevo). Rien n'est gardé sur le serveur.
const CONTACT_MAIL = "imendriss@divadivina.app";
const h = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function contact(req, env, json) {
  const BK = String(env.BREVO_KEY || "").replace(/[^\x21-\x7E]/g, "");
  if (!BK) return json({ erreur: "L'envoi des messages n'est pas encore activé.", code: "off" }, 503);
  let b = {}; try { b = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }
  if (b.site) return json({ ok: true }); // champ piège
  const type = b.type === "seance" ? "seance" : "aide";
  const email = txt(b.email, 254).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ erreur: "Vérifie ton email.", code: "email" }, 400);
  const nom = txt(b.nom, 40).trim(), tel = txt(b.tel, 30).trim(), message = txt(b.message, 3000).trim();
  const photo = b.photo ? (okData(b.photo, ["image/jpeg", "image/png", "image/webp"], 900000) ? b.photo : null) : "";
  if (photo === null) return json({ erreur: "La photo est trop lourde." }, 400);
  const lignes = [["Prénom", nom || "—"], ["Email", email], ["WhatsApp", tel || "—"], ["Pays", txt(b.pays, 30) || "—"], ["Langue", txt(b.lang, 2) || "—"]];
  let sujet;
  if (type === "aide") {
    if (!message) return json({ erreur: "Écris ton message.", code: "vide" }, 400);
    const quoi = { bug: "Problème technique", question: "Question", idee: "Suggestion" }[b.quoi] || "Message";
    lignes.unshift(["Type", quoi]);
    lignes.push(["Version de l'app", txt(b.version, 12) || "—"], ["Téléphone", txt(b.appareil, 160) || "—"]);
    sujet = `[Diva Divina] ${quoi} — ${nom || email}`;
  } else {
    const mode = b.mode === "doha" ? "En présentiel à Doha" : "En ligne (appel vidéo)";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date || "")) ? b.date : "";
    if (!date) return json({ erreur: "Choisis une date.", code: "date" }, 400);
    const creneau = { matin: "Matin (9 h – 12 h)", aprem: "Après-midi (13 h – 17 h)", soir: "Soir (18 h – 21 h)" }[b.creneau] || "Peu importe";
    const obj = Array.isArray(b.objectifs) ? b.objectifs.map(x => txt(x, 40)).slice(0, 6).join(", ") : "";
    lignes.unshift(["Type", "Demande de séance privée (1 heure)"], ["Prix affiché", txt(b.prix, 20) || "—"], ["Format", mode], ["Date souhaitée", date], ["Créneau", creneau], ["Objectif", obj || "—"]);
    lignes.push(["Ses résultats Diva Divina", txt(b.profil, 6000) || "Pas encore d'analyse"]);
    sujet = `[Diva Divina] Séance privée — ${nom || email} — ${date}`;
  }
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#292421">
<h2 style="color:#8C6D35;margin:0 0 12px">${h(sujet.replace("[Diva Divina] ", ""))}</h2>
<table style="border-collapse:collapse">${lignes.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6E6E6E;vertical-align:top;white-space:nowrap">${h(k)}</td><td style="padding:4px 0">${h(v)}</td></tr>`).join("")}</table>
${message ? `<p style="margin:16px 0 4px;color:#6E6E6E">Son message :</p><div style="white-space:pre-wrap;padding:12px;background:#F5F5F5;border-radius:8px">${h(message)}</div>` : ""}
<p style="margin-top:18px;color:#6E6E6E;font-size:13px">Réponds simplement à cet email : ta réponse ira directement à la cliente.</p></div>`;
  const mail = { sender: { name: "Diva Divina", email: env.CONTACT_FROM || CONTACT_MAIL }, to: [{ email: env.CONTACT_TO || CONTACT_MAIL }],
    replyTo: { email, name: nom || email }, subject: sujet, htmlContent: html };
  if (photo) mail.attachment = [{ name: "photo." + (photo.startsWith("data:image/png") ? "png" : photo.startsWith("data:image/webp") ? "webp" : "jpg"), content: photo.split(",")[1] }];
  const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": BK, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(mail) });
  if (!r.ok) { console.error("Brevo", r.status, (await r.text()).slice(0, 300)); return json({ erreur: "Le message n'est pas parti. Réessaie ou écris directement par email.", code: "envoi" }, 502); }
  return json({ ok: true });
}

// Diva Divina — « Le Majlis » (v159, demandé par Imen) : discuter avec ses amies qui ont aussi Diva Divina.
// Base D1 `MAJLIS` (base « mon-style-majlis », id dans wrangler.jsonc). Tables :
//   mj_users (id, th = empreinte SHA-256 du jeton, nom, code d'invitation, cree, vu)
//   mj_amis  (a, b, cree)  — rangée dans les deux sens
//   mj_msgs  (id, conv = "idA|idB" triés, de, t, txt, img = photo JPEG en data URL, look = titre de tenue, lu)
// Pas de compte ni d'email : chaque téléphone reçoit un identifiant + un jeton secret (seule son empreinte est gardée).
// On ne devient amies QUE par le lien d'invitation (code). Les messages sont effacés au bout de 60 jours.
// Les photos arrivent déjà avec le visage caché (fait sur le téléphone, aura-majlis.js).

const MJ_TTL = 60 * 24 * 3600 * 1000;
const MJ_ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans 0/O, 1/I/L
const mjHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(x => x.toString(16).padStart(2, "0")).join("");
const mjCode6 = () => [...crypto.getRandomValues(new Uint8Array(6))].map(x => MJ_ALPHA[x % MJ_ALPHA.length]).join("");
async function mjSha(t) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(t))); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
const mjTxt = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
const mjIdOk = v => /^[0-9a-f]{16}$/.test(String(v || ""));
const mjConv = (a, b) => (a < b ? a + "|" + b : b + "|" + a);

async function majlis(path, req, env, json) {
  const DB = env.MAJLIS;
  if (!DB) return json({ erreur: "Le Majlis n'est pas encore activé." }, 503);
  let b = {}; try { b = await req.json(); } catch { return json({ erreur: "Requête invalide." }, 400); }
  const now = Date.now();

  // Aperçu d'une invitation (sans compte) : seulement le prénom de celle qui invite.
  if (path === "/majlis/code") {
    const c = mjTxt(b.code, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const u = c && await DB.prepare("SELECT nom FROM mj_users WHERE code=?").bind(c).first();
    if (!u) return json({ erreur: "Ce lien d'invitation ne marche plus.", code: "introuvable" }, 404);
    return json({ nom: u.nom || "" });
  }

  // Création du compte du téléphone, ou mise à jour du prénom.
  if (path === "/majlis/moi") {
    const nom = mjTxt(b.nom, 30);
    if (mjIdOk(b.uid)) {
      const u = await DB.prepare("SELECT th, code FROM mj_users WHERE id=?").bind(b.uid).first();
      if (u && u.th === await mjSha(mjTxt(b.token, 64))) {
        if (nom) await DB.prepare("UPDATE mj_users SET nom=?, vu=? WHERE id=?").bind(nom, now, b.uid).run();
        return json({ uid: b.uid, code: u.code });
      }
    }
    if (!nom) return json({ erreur: "Dis-moi ton prénom." }, 400);
    const uid = mjHex(8), token = mjHex(16), th = await mjSha(token);
    for (let i = 0; i < 6; i++) {
      const c = mjCode6();
      try { await DB.prepare("INSERT INTO mj_users (id, th, nom, code, cree, vu) VALUES (?,?,?,?,?,?)").bind(uid, th, nom, c, now, now).run(); return json({ uid, token, code: c }); }
      catch (e) { if (!/UNIQUE/i.test(String(e && e.message))) throw e; }
    }
    return json({ erreur: "Réessaie dans un instant." }, 500);
  }

  // Toutes les autres routes : identifiant + jeton du téléphone.
  if (!mjIdOk(b.uid)) return json({ erreur: "Ouvre d'abord ton Majlis.", code: "compte" }, 401);
  const me = await DB.prepare("SELECT th, nom FROM mj_users WHERE id=?").bind(b.uid).first();
  if (!me || me.th !== await mjSha(mjTxt(b.token, 64))) return json({ erreur: "Ouvre d'abord ton Majlis.", code: "compte" }, 401);
  const uid = b.uid;
  const amie = async id => mjIdOk(id) && !!(await DB.prepare("SELECT 1 FROM mj_amis WHERE a=? AND b=?").bind(uid, id).first());

  if (path === "/majlis/join") {
    const c = mjTxt(b.code, 8).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const o = c && await DB.prepare("SELECT id, nom FROM mj_users WHERE code=?").bind(c).first();
    if (!o) return json({ erreur: "Ce lien d'invitation ne marche plus.", code: "introuvable" }, 404);
    if (o.id === uid) return json({ erreur: "C'est ton propre lien : envoie-le à une amie.", code: "moi" }, 400);
    await DB.batch([
      DB.prepare("INSERT OR IGNORE INTO mj_amis (a, b, cree) VALUES (?,?,?)").bind(uid, o.id, now),
      DB.prepare("INSERT OR IGNORE INTO mj_amis (a, b, cree) VALUES (?,?,?)").bind(o.id, uid, now)
    ]);
    return json({ ami: { id: o.id, nom: o.nom || "" } });
  }

  if (path === "/majlis/amis") {
    await DB.prepare("UPDATE mj_users SET vu=? WHERE id=?").bind(now, uid).run();
    const r = await DB.prepare(
      `SELECT u.id, u.nom, a.cree,
        (SELECT COUNT(*) FROM mj_msgs m WHERE m.conv = CASE WHEN u.id < ?1 THEN u.id||'|'||?1 ELSE ?1||'|'||u.id END AND m.de = u.id AND m.lu = 0) AS nl,
        (SELECT m.id||'\u0001'||m.de||'\u0001'||m.t||'\u0001'||COALESCE(m.txt,'')||'\u0001'||(m.img IS NOT NULL AND m.img!='')||'\u0001'||COALESCE(m.look,'')
           FROM mj_msgs m WHERE m.conv = CASE WHEN u.id < ?1 THEN u.id||'|'||?1 ELSE ?1||'|'||u.id END ORDER BY m.id DESC LIMIT 1) AS der
       FROM mj_amis a JOIN mj_users u ON u.id = a.b WHERE a.a = ?1`).bind(uid).all();
    const amis = (r.results || []).map(x => {
      let d = null;
      if (x.der) { const p = String(x.der).split("\u0001"); d = { id: +p[0], de: p[1], t: +p[2], txt: (p[3] || "").slice(0, 80), img: p[4] === "1", look: p[5] || "" }; }
      return { id: x.id, nom: x.nom || "", cree: x.cree, nl: x.nl || 0, der: d };
    }).sort((x, y) => ((y.der && y.der.t) || y.cree || 0) - ((x.der && x.der.t) || x.cree || 0));
    return json({ amis });
  }

  if (path === "/majlis/nonlus") {
    const r = await DB.prepare("SELECT COUNT(*) AS n FROM mj_msgs WHERE (conv LIKE ?1||'|%' OR conv LIKE '%|'||?1) AND de != ?1 AND lu = 0").bind(uid).first();
    return json({ n: (r && r.n) || 0 });
  }

  if (path === "/majlis/msgs") {
    if (!await amie(b.ami)) return json({ erreur: "Cette amie n'est plus dans ton Majlis.", code: "amie" }, 404);
    const cv = mjConv(uid, b.ami), apres = Math.max(0, parseInt(b.apres, 10) || 0);
    const r = await DB.prepare("SELECT id, de, t, txt, img, look, lu FROM mj_msgs WHERE conv=? AND id>? ORDER BY id DESC LIMIT 60").bind(cv, apres).all();
    const msgs = (r.results || []).reverse();
    if (msgs.some(m => m.de === b.ami && !m.lu)) await DB.prepare("UPDATE mj_msgs SET lu=1 WHERE conv=? AND de=? AND lu=0").bind(cv, b.ami).run();
    // « Vu » : jusqu'où l'amie a lu mes messages
    const v = await DB.prepare("SELECT MAX(id) AS v FROM mj_msgs WHERE conv=? AND de=? AND lu=1").bind(cv, uid).first();
    // Messages de Diva (de = "aura") : le conseil de la styliste, visible par les deux amies ; « ref » = la photo commentée.
    return json({ msgs: msgs.map(m => m.de === "aura"
      ? { id: m.id, aura: true, moi: false, t: m.t, txt: m.txt || "", img: "", look: "", ref: parseInt(String(m.look || "").slice(1), 10) || 0 }
      : { id: m.id, moi: m.de === uid, t: m.t, txt: m.txt || "", img: m.img || "", look: m.look || "" }), vu: (v && v.v) || 0 });
  }

  if (path === "/majlis/send") {
    if (!await amie(b.ami)) return json({ erreur: "Cette amie n'est plus dans ton Majlis.", code: "amie" }, 404);
    const t = mjTxt(b.txt, 1000), look = mjTxt(b.look, 120);
    const img = b.img ? (typeof b.img === "string" && b.img.length <= 700000 && /^data:image\/(jpeg|webp|png);base64,/.test(b.img) ? b.img : null) : "";
    if (img === null) return json({ erreur: "La photo est trop lourde." }, 400);
    if (!t && !img) return json({ erreur: "Écris ton message." }, 400);
    const r = await DB.prepare("INSERT INTO mj_msgs (conv, de, t, txt, img, look, lu) VALUES (?,?,?,?,?,?,0)").bind(mjConv(uid, b.ami), uid, now, t, img, look).run();
    if (Math.random() < 0.05) await DB.prepare("DELETE FROM mj_msgs WHERE t < ?").bind(now - MJ_TTL).run();
    return json({ id: (r.meta && r.meta.last_row_id) || 0, t: now });
  }

  // Diva (v160, demandé par Imen) : un conseil ÉCRIT de la styliste au milieu de la conversation (pas de voix : moins cher).
  // Le téléphone de celle qui envoie la photo (ou qui écrit « Diva ») prépare le conseil avec l'IA, puis le range ici.
  // Un seul conseil par photo (ref = id du message photo) ; rangé déjà lu, pour ne pas faire sonner les pastilles.
  if (path === "/majlis/aura") {
    if (!await amie(b.ami)) return json({ erreur: "Cette amie n'est plus dans ton Majlis.", code: "amie" }, 404);
    const cv = mjConv(uid, b.ami), ref = Math.max(0, parseInt(b.ref, 10) || 0), kind = String(b.kind || "");
    // « fin » (petit mot à la fin d'une vraie discussion) et « conseil » (quand elles parlent de style) : Diva ne parle
    // pas trop. fin = au moins 6 messages des DEUX amies depuis le dernier mot de Diva ; conseil = Diva n'a rien dit
    // dans les 4 derniers messages. check = 1 : on demande seulement la permission (avant de payer l'IA).
    if (kind === "fin" || kind === "conseil") {
      const der = await DB.prepare("SELECT MAX(id) AS id FROM mj_msgs WHERE conv=? AND de='aura'").bind(cv).first();
      const apres = (der && der.id) || 0;
      if (kind === "fin") {
        const c = await DB.prepare("SELECT COUNT(*) AS n, COUNT(DISTINCT de) AS d FROM mj_msgs WHERE conv=? AND id>? AND de!='aura'").bind(cv, apres).first();
        if (!c || c.n < 6 || c.d < 2) return json({ non: true });
      } else {
        const r4 = await DB.prepare("SELECT de FROM mj_msgs WHERE conv=? ORDER BY id DESC LIMIT 4").bind(cv).all();
        if ((r4.results || []).some(m => m.de === "aura")) return json({ non: true });
      }
      if (b.check) return json({ ok: true });
    }
    const t = mjTxt(b.txt, 400);
    if (!t) return json({ erreur: "Conseil vide." }, 400);
    if (ref) {
      const ph = await DB.prepare("SELECT id FROM mj_msgs WHERE id=? AND conv=? AND img IS NOT NULL AND img!=''").bind(ref, cv).first();
      if (!ph) return json({ erreur: "Photo introuvable." }, 404);
      const deja = await DB.prepare("SELECT id, t, txt FROM mj_msgs WHERE conv=? AND de='aura' AND look=?").bind(cv, "@" + ref).first();
      if (deja) return json({ id: deja.id, t: deja.t, txt: deja.txt, deja: true });
    }
    const r = await DB.prepare("INSERT INTO mj_msgs (conv, de, t, txt, img, look, lu) VALUES (?,?,?,?,?,?,1)").bind(cv, "aura", now, t, "", ref ? "@" + ref : "").run();
    return json({ id: (r.meta && r.meta.last_row_id) || 0, t: now, txt: t });
  }

  // Retirer une amie : l'amitié et la conversation disparaissent des deux côtés.
  if (path === "/majlis/quitter") {
    if (!mjIdOk(b.ami)) return json({ erreur: "Amie introuvable." }, 400);
    await DB.batch([
      DB.prepare("DELETE FROM mj_amis WHERE (a=? AND b=?) OR (a=? AND b=?)").bind(uid, b.ami, b.ami, uid),
      DB.prepare("DELETE FROM mj_msgs WHERE conv=?").bind(mjConv(uid, b.ami))
    ]);
    return json({ ok: true });
  }

  // « Effacer toutes mes données » : tout ce qui concerne ce téléphone est supprimé du serveur.
  if (path === "/majlis/wipe") {
    await DB.batch([
      DB.prepare("DELETE FROM mj_msgs WHERE conv LIKE ?1||'|%' OR conv LIKE '%|'||?1").bind(uid),
      DB.prepare("DELETE FROM mj_amis WHERE a=?1 OR b=?1").bind(uid),
      DB.prepare("DELETE FROM mj_users WHERE id=?").bind(uid)
    ]);
    return json({ ok: true });
  }

  return json({ erreur: "Action inconnue." }, 400);
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": (ALLOWED.includes(origin) || SITE.includes(origin)) ? origin : ALLOWED[0],
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
      const pth = new URL(req.url).pathname, deSite = SITE.includes(origin) && pth.startsWith("/liste/");
      if (req.method !== "POST" || !(ALLOWED.includes(origin) || deSite)) return json({ erreur: "Accès refusé." }, 403);
      {
        const path = new URL(req.url).pathname;
        const ip = req.headers.get("CF-Connecting-IP") || "?";
        if (tooMany(ip, LIMITS[path] ? path : "/")) return json({ erreur: "Trop de demandes. Réessaie dans quelques minutes.", code: "rate_limited" }, 429);
      }

      { const vp = new URL(req.url).pathname; if (vp.startsWith("/verif/")) return await verif(vp, req, env, json); if (vp.startsWith("/liste/")) return await liste(vp, req, env, json); if (vp === "/contact/new") return await contact(req, env, json); if (vp.startsWith("/majlis/")) return await majlis(vp, req, env, json); }

      const P = new URL(req.url).pathname;
      // L'adresse IP n'est jamais gardée telle quelle : seulement une empreinte courte, dans un compteur effacé après le jour.
      const IP = (await sha256("ip|" + (req.headers.get("CF-Connecting-IP") || "?"))).slice(0, 16);
      // Corps de la demande lu une seule fois (les routes ci-dessous en ont toutes besoin).
      let B = {};
      try { B = await req.json(); } catch { B = {}; }
      if (!B || typeof B !== "object" || Array.isArray(B)) B = {};

      // Nouveau jeton d'appareil (v180).
      if (P === "/device") {
        const over = await quota(env, [["ip|" + IP + "|dev", "DEV_IP"], ["all|dev", "DEV_ALL"]]);
        if (over) return json({ erreur: BUSY_MSG, code: "quota" }, 429);
        const id = rndHex(8);
        return json({ dev: id + "." + await hmacHex(await devSecret(env), id) });
      }

      // Code testeuse (v180) : vérifié ici, jamais écrit dans l'app. Variable Cloudflare TEST_CODES = codes séparés par des virgules.
      if (P === "/code") {
        if (await quota(env, [["ip|" + IP + "|code", "CODE_IP"]])) return json({ erreur: "Trop d'essais. Réessaie demain.", code: "quota" }, 429);
        const norm = v => String(v || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        const codes = String(env.TEST_CODES || "").split(",").map(norm).filter(x => x.length >= 6);
        const c = norm(B.code);
        return json({ ok: !!c && codes.includes(c) });
      }

      // Page privée « Mes clientes » (clientes.html, v181) : code de la styliste.
      if (P === "/admin/clientes") {
        if (!styHash(env)) return json({ erreur: "L'espace styliste n'est pas encore configuré (variable STYLISTE_HASH).", code: "off" }, 503);
        if (!(await styOk(env, B.code))) return json({ erreur: "Code incorrect.", code: "code" }, 401);
        return await adminClientes(B, env, json);
      }

      // Toutes les routes qui coûtent exigent un jeton d'appareil valide.
      const DEV = await devCheck(env, B.dev);
      if (!DEV) return json({ erreur: DEV_MSG, code: "device" }, 401);

      // Comptes clientes, sauvegarde dans le cloud, mesure d'usage (v181) : worker/compte.js.
      if (P.startsWith("/auth/") || P.startsWith("/sync/") || P === "/compte/del") return await compte(P, B, env, json, { DEV, IP, quota, QUOTA_MSG });
      if (P === "/ev") return await evenements(B, env, json, { DEV, quota });

      // Appel / chat avec l'agent Diva (v180) : lien signé à usage unique, délivré seulement aux téléphones de l'app.
      // Une fois l'authentification activée sur l'agent dans ElevenLabs, son identifiant seul ne suffit plus pour l'appeler.
      if (P === "/voice/session") {
        const EK = String(env.ELEVEN_KEY || "").replace(/[^\x21-\x7E]/g, "").replace(/^["']+|["']+$/g, "");
        if (!EK) return json({ erreur: "La clé ElevenLabs n'est pas configurée." }, 500);
        const over = await quota(env, [["d|" + DEV + "|voice", "VOICE_DEV"], ["all|voice", "VOICE_ALL"]]);
        if (over) return json({ erreur: over === "VOICE_DEV" ? QUOTA_MSG : BUSY_MSG, code: "quota" }, 429);
        const agent = String(env.AGENT_ID || "agent_3801m58kjga8fddsm7bz46gcz4wf").replace(/[^A-Za-z0-9_]/g, "");
        const r = await fetch("https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=" + agent, { headers: { "xi-api-key": EK } });
        let d = {}; try { d = await r.json(); } catch {}
        if (!r.ok || !d.signed_url) { console.error("signed-url", r.status, JSON.stringify(d).slice(0, 300)); return json({ erreur: "Diva n'est pas joignable pour le moment.", code: "voice" }, 502); }
        return json({ signedUrl: d.signed_url });
      }

      // Voix de Diva qui dit le prénom de la cliente (ElevenLabs), avec phrases fixes uniquement.
      if (new URL(req.url).pathname === "/tts") {
        const EK = String(env.ELEVEN_KEY || "").replace(/[^\x21-\x7E]/g, "").replace(/^["']+|["']+$/g, "");
        if (!EK) return json({ erreur: "La clé ElevenLabs n'est pas configurée." }, 500);
        const b2 = B;
        const ttsQuota = async () => quota(env, [["d|" + DEV + "|tts", "TTS_DEV"], ["all|tts", "TTS_ALL"]]);
        const nom = String(b2.nom || "").normalize("NFC").replace(/[^\p{L}\p{M} '\-]/gu, "").trim().slice(0, 30);
        const PH = {
          enchantee: n => `Enchantée, ${n} ! Moi, c'est Diva.`,
          retour: n => `Salut ${n} ! C'est Diva, ta personal stylist. Je suis là pour révéler ta beauté.`,
          hello_en: n => `Hi${n ? " " + n : ""}! I'm Diva, your personal stylist. I'm here to bring out your beauty.`,
          hello_ar: n => `هلا والله${n ? " " + n : ""}! أنا ديفا، الستايلست الخاصة فيچ. موجودة عشان أطلّع جمالچ، وأخليچ تحسين بثقة كل يوم.`
        };
        // Arabe : Diva lit à voix haute les phrases de l'application (texte arabe uniquement, 480 caractères max).
        // Anglais : même principe, avec la voix habituelle de Diva (texte latin uniquement).
        if (b2.type === "say_ar" || b2.type === "say_en") {
          const en = b2.type === "say_en";
          const texte = String(b2.texte || "").normalize("NFC").slice(0, 480).trim();
          if (!texte || (en ? !/^[\p{Script=Latin}\p{M}\p{N}\p{P}\p{Zs}’'…]+$/u.test(texte) : !/[؀-ۿ]/.test(texte))) return json({ erreur: "Texte invalide." }, 400);
          const h = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texte)))].map(x => x.toString(16).padStart(2, "0")).join("");
          const ck2 = new Request("https://cache.mon-style/" + b2.type + "/" + h);
          let hit2 = await caches.default.match(ck2);
          if (!hit2) {
            const over = await ttsQuota();
            if (over) return json({ erreur: over === "TTS_DEV" ? QUOTA_MSG : BUSY_MSG, code: "quota" }, 429);
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
        const ck = new Request("https://cache.mon-style/tts3/" + kind + "/" + encodeURIComponent(nom.toLowerCase() || "_"));
        const cache = caches.default;
        let hit = await cache.match(ck);
        if (!hit) {
          const over = await ttsQuota();
          if (over) return json({ erreur: over === "TTS_DEV" ? QUOTA_MSG : BUSY_MSG, code: "quota" }, 429);
          // Arabe : voix féminine khaleeji (Maryam Essa) ; sinon la voix habituelle de Diva.
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
        const b3 = B;
        const img = b3 && b3.image, mp = expandRef(String((b3 && b3.prompt) || "").slice(0, 5000));
        if (typeof img !== "string" || !img || img.length > 6e6 || !mp) return json({ erreur: "Requête invalide." }, 400);
        { const over = await quota(env, [["d|" + DEV + "|mk", "MK_DEV"], ["all|mk", "MK_ALL"]]);
          if (over) return json({ erreur: over === "MK_DEV" ? "Tu as utilisé tous tes essais make-up pour aujourd'hui. Reviens demain." : BUSY_MSG, code: "quota" }, 429); }
        const ibody = JSON.stringify({ system_instruction: { parts: [{ text: "Tu es l'outil d'essai make-up de l'application de stylisme Diva Divina : tu maquilles la photo du visage fournie selon la demande, sans rien changer d'autre. Pour toute autre demande, ne crée pas d'image." }] }, contents: [{ role: "user", parts: [{ text: mp }, { inline_data: { mime_type: "image/jpeg", data: img } }] }],
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

      if (P !== "/") return json({ erreur: "Requête invalide." }, 404);
      const body = B;
      const images = Array.isArray(body && body.images) ? body.images : [];
      if (typeof body.prompt !== "string" || !body.prompt || body.prompt.length > 30000 || images.length > 3)
        return json({ erreur: "Requête invalide." }, 400);
      // La méthode d'Imen est ajoutée ICI (repères §REF§ / §REFP:…§ envoyés par l'app) : elle n'est plus publiée.
      const prompt = expandRef(body.prompt);

      let size = 0;
      for (const i of images) {
        if (!i || typeof i.data !== "string" || (i.mime && !MIMES.includes(i.mime))) return json({ erreur: "Photo invalide." }, 400);
        size += i.data.length;
      }
      if (size > 8e6) return json({ erreur: "Photo trop lourde." }, 413);
      { const over = await quota(env, [["d|" + DEV + "|ai", "AI_DEV"], ["ip|" + IP + "|ai", "AI_IP"], ["all|ai", "AI_ALL"]]);
        if (over) return json({ erreur: over === "AI_DEV" ? QUOTA_MSG : BUSY_MSG, code: "quota" }, 429); }

      const parts = [
        { text: prompt },
        ...images.map(i => ({ inline_data: { mime_type: MIMES.includes(i.mime) ? i.mime : "image/jpeg", data: i.data } }))
      ];
      const models = [String(env.MODEL || "").trim(), "gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash-lite"].filter(Boolean);
      // Réflexion courte : l'analyse arrive beaucoup plus vite.
      const gen = { responseMimeType: "application/json", temperature: 0.4 };
      const sys = { parts: [{ text: GUARD }] };
      const fast = JSON.stringify({ system_instruction: sys, contents: [{ role: "user", parts }], generationConfig: { ...gen, thinkingConfig: { thinkingLevel: "low" } } });
      const plain = JSON.stringify({ system_instruction: sys, contents: [{ role: "user", parts }], generationConfig: gen });
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
      // v182 (vitesse) : demande « couverte ». On interroge le 1er modèle ; s'il n'a pas répondu après HEDGE_MS
      // (8 s par défaut, variable Cloudflare HEDGE_MS) ou s'il échoue, on lance aussitôt le 2e modèle en parallèle
      // et on garde la 1re bonne réponse (l'autre est annulée). Avant, un modèle lent faisait attendre 28 s de plus.
      const uniq = [...new Set(models)];
      const hedge = async (m1, m2) => {
        const HEDGE = Math.max(1500, parseInt(env.HEDGE_MS, 10) || 8000), ctl = [new AbortController(), new AbortController()];
        const one = (m, i) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
          { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": KEY }, body: fast, signal: AbortSignal.any([ctl[i].signal, AbortSignal.timeout(28000)]) })
          .then(res => res.ok ? { m, r: res } : Promise.reject(res.status));
        let timer = null, lance = false;
        const a = one(m1, 0);
        const b = m2 ? new Promise((res, rej) => {
          const go = () => { if (lance) return; lance = true; clearTimeout(timer); one(m2, 1).then(res, rej); };
          timer = setTimeout(go, HEDGE); a.catch(go);
        }) : Promise.reject(0);
        try {
          const w = await Promise.any([a, b]);
          clearTimeout(timer); ctl[w.m === m1 ? 1 : 0].abort();
          return w;
        } catch { clearTimeout(timer); ctl.forEach(c => c.abort()); return null; }
      };
      const hw = await hedge(uniq[0], uniq[1]);
      if (hw) { r = hw.r; GOOD_MODEL = hw.m; }
      else if (!(await tryModels(uniq))) {
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
      // Le détail technique reste dans les journaux Cloudflare, pas dans l'app.
      console.error(e);
      return json({ erreur: "Erreur du serveur. Réessaie dans un instant.", code: "server" }, 500);
    }
  }
};
