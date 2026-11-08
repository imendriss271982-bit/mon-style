// My Style — Comptes clientes, sauvegarde dans le cloud et mesure d'usage (v181).
// Base D1 `MAJLIS` (même base que le Majlis et les quotas). Tables créées toutes seules au premier appel :
//   ms_users (id, email, nom, pays, lang, cree, vu)          — la liste unique des clientes
//   ms_otp   (eh, ch, exp, n)                                — code à 6 chiffres envoyé par email (empreintes seulement)
//   ms_sess  (th, uid, exp)                                  — sessions (seule l'empreinte du jeton est gardée)
//   ms_data  (uid, k, v, t)                                  — copie des données du téléphone (une ligne par clé)
//   ms_photo (uid, pid, img, t)                              — photos de la garde-robe (vignettes)
//   ms_ev (d, e, n) · ms_act (d, dev) · ms_dev (dev, d)      — mesure d'usage anonyme (par jour)
// Connexion sans mot de passe : la cliente reçoit un code par email (API Brevo, comme la page Contact).

export const SYNC_KEYS = ["monstyle", "monstyle_gr", "monstyle_pref", "monstyle_zf", "monstyle_avatar", "monstyle_mk", "monstyle_verif", "monstyle_majlis", "monstyle_gouts"];
const SESS_TTL = 365 * 24 * 3600 * 1000, OTP_TTL = 15 * 60 * 1000;
const MAX_VAL = 1800000, MAX_IMG = 400000, MAX_PHOTOS = 800;
const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
const EV_RE = /^[a-z0-9_:]{2,40}$/;

const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
const sha = async t => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(t))));
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const day = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001F]/g, "").trim().slice(0, n);

let READY = false;
async function init(DB) {
  if (READY) return;
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, nom TEXT, pays TEXT, lang TEXT, cree INTEGER, vu INTEGER)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_otp (eh TEXT PRIMARY KEY, ch TEXT NOT NULL, exp INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_sess (th TEXT PRIMARY KEY, uid TEXT NOT NULL, exp INTEGER NOT NULL)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_data (uid TEXT NOT NULL, k TEXT NOT NULL, v TEXT, t INTEGER, PRIMARY KEY (uid, k))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_photo (uid TEXT NOT NULL, pid TEXT NOT NULL, img TEXT, t INTEGER, PRIMARY KEY (uid, pid))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_ev (d TEXT NOT NULL, e TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (d, e))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_act (d TEXT NOT NULL, dev TEXT NOT NULL, PRIMARY KEY (d, dev))"),
    DB.prepare("CREATE TABLE IF NOT EXISTS ms_dev (dev TEXT PRIMARY KEY, d TEXT NOT NULL)")
  ]);
  READY = true;
}

// Email du code (fr / en / ar), envoyé par Brevo.
const MAIL = {
  fr: { s: "Ton code My Style : {c}", h: "Voici ton code pour retrouver ton style sur My Style :", f: "Il est valable 15 minutes. Si tu n'as rien demandé, ignore simplement cet email." },
  en: { s: "Your My Style code: {c}", h: "Here is your code to get your style back on My Style:", f: "It is valid for 15 minutes. If you did not ask for it, simply ignore this email." },
  ar: { s: "كود My Style: {c}", h: "هذا الكود عشان ترجعين ستايلچ في My Style:", f: "صالح لمدة 15 دقيقة. إذا ما طلبتيه، تجاهلي هالإيميل." }
};
async function sendCode(env, email, code, lang) {
  const BK = String(env.BREVO_KEY || "").replace(/[^\x21-\x7E]/g, "");
  if (!BK) return { off: true };
  const m = MAIL[lang] || MAIL.fr, rtl = lang === "ar";
  const html = `<div dir="${rtl ? "rtl" : "ltr"}" style="font-family:Arial,sans-serif;font-size:16px;color:#292421;text-align:${rtl ? "right" : "left"}">
<p style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;color:#8C6D35">My Style</p>
<p>${m.h}</p><p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:18px 0;color:#292421" dir="ltr">${code}</p>
<p style="color:#6E6E6E;font-size:13px">${m.f}</p></div>`;
  const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": BK, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ sender: { name: "My Style", email: env.CONTACT_FROM || "imendriss@divadivina.app" }, to: [{ email }], subject: m.s.replace("{c}", code), htmlContent: html }) });
  if (!r.ok) { console.error("Brevo code", r.status, (await r.text()).slice(0, 300)); return { err: true }; }
  return { ok: true };
}

async function session(DB, tok) {
  if (!/^[0-9a-f]{48}$/.test(String(tok || ""))) return null;
  const s = await DB.prepare("SELECT uid, exp FROM ms_sess WHERE th=?").bind(await sha(tok)).first();
  if (!s || s.exp < Date.now()) return null;
  return s.uid;
}

// Routes /auth/…, /sync/…, /compte/del (jeton d'appareil déjà vérifié par le Worker : DEV).
export async function compte(P, B, env, json, ctx) {
  const DB = env.MAJLIS;
  if (!DB) return json({ erreur: "Les comptes ne sont pas encore activés." }, 503);
  await init(DB);
  const now = Date.now(), { DEV, IP, quota, QUOTA_MSG } = ctx;

  if (P === "/auth/start") {
    const email = clean(B.email, 254).toLowerCase(), lang = ["fr", "en", "ar"].includes(B.lang) ? B.lang : "fr";
    if (!EMAIL_RE.test(email)) return json({ erreur: "Vérifie ton email.", code: "email" }, 400);
    const eh = await sha("mail|" + email);
    const over = await quota(env, [["d|" + DEV + "|auth", "AUTH_DEV"], ["ip|" + IP + "|auth", "AUTH_IP"], ["m|" + eh.slice(0, 20) + "|auth", "AUTH_MAIL"], ["all|auth", "AUTH_ALL"]]);
    if (over) return json({ erreur: "Trop de codes demandés. Réessaie demain.", code: "quota" }, 429);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
    await DB.prepare("INSERT INTO ms_otp (eh, ch, exp, n) VALUES (?1, ?2, ?3, 0) ON CONFLICT(eh) DO UPDATE SET ch=?2, exp=?3, n=0")
      .bind(eh, await sha(eh + "|" + code), now + OTP_TTL).run();
    const s = await sendCode(env, email, code, lang);
    if (s.off) return json({ erreur: "L'envoi des codes n'est pas encore activé.", code: "off" }, 503);
    if (s.err) return json({ erreur: "L'email n'est pas parti. Réessaie dans un instant.", code: "envoi" }, 502);
    return json({ ok: true });
  }

  if (P === "/auth/verify") {
    const email = clean(B.email, 254).toLowerCase(), code = clean(B.code, 12).replace(/\D/g, "");
    if (!EMAIL_RE.test(email) || code.length !== 6) return json({ erreur: "Vérifie le code à 6 chiffres.", code: "code" }, 400);
    const eh = await sha("mail|" + email);
    const o = await DB.prepare("SELECT ch, exp, n FROM ms_otp WHERE eh=?").bind(eh).first();
    if (!o || o.exp < now) return json({ erreur: "Ce code a expiré. Demande un nouveau code.", code: "expire" }, 400);
    if (o.n >= 5) return json({ erreur: "Trop d'essais. Demande un nouveau code.", code: "essais" }, 429);
    if (o.ch !== await sha(eh + "|" + code)) {
      await DB.prepare("UPDATE ms_otp SET n = n + 1 WHERE eh=?").bind(eh).run();
      return json({ erreur: "Ce code n'est pas le bon.", code: "faux" }, 400);
    }
    await DB.prepare("DELETE FROM ms_otp WHERE eh=?").bind(eh).run();
    let u = await DB.prepare("SELECT id FROM ms_users WHERE email=?").bind(email).first(), nouveau = false;
    const nom = clean(B.nom, 40), pays = clean(B.pays, 2).toUpperCase(), lang = ["fr", "en", "ar"].includes(B.lang) ? B.lang : "fr";
    if (!u) {
      u = { id: rnd(8) }; nouveau = true;
      await DB.prepare("INSERT INTO ms_users (id, email, nom, pays, lang, cree, vu) VALUES (?,?,?,?,?,?,?)").bind(u.id, email, nom, pays, lang, now, now).run();
    } else {
      await DB.prepare("UPDATE ms_users SET vu=?, nom=COALESCE(NULLIF(?, ''), nom), pays=COALESCE(NULLIF(?, ''), pays), lang=? WHERE id=?").bind(now, nom, pays, lang, u.id).run();
    }
    const tok = rnd(24);
    await DB.prepare("INSERT INTO ms_sess (th, uid, exp) VALUES (?,?,?)").bind(await sha(tok), u.id, now + SESS_TTL).run();
    if (Math.random() < 0.05) await DB.batch([DB.prepare("DELETE FROM ms_sess WHERE exp < ?").bind(now), DB.prepare("DELETE FROM ms_otp WHERE exp < ?").bind(now)]);
    const n = await DB.prepare("SELECT COUNT(*) AS n FROM ms_data WHERE uid=?").bind(u.id).first();
    return json({ tok, email, nouveau, donnees: !!(n && n.n) });
  }

  // Toutes les autres routes : session ouverte.
  const uid = await session(DB, B.tok);
  if (!uid) return json({ erreur: "Reconnecte-toi à ton compte.", code: "session" }, 401);

  if (P === "/auth/out") {
    await DB.prepare("DELETE FROM ms_sess WHERE th=?").bind(await sha(B.tok)).run();
    return json({ ok: true });
  }

  if (P === "/sync/meta") {
    await DB.prepare("UPDATE ms_users SET vu=? WHERE id=?").bind(now, uid).run();
    const k = await DB.prepare("SELECT k, t FROM ms_data WHERE uid=?").bind(uid).all();
    const p = await DB.prepare("SELECT pid, t FROM ms_photo WHERE uid=?").bind(uid).all();
    const u = await DB.prepare("SELECT email FROM ms_users WHERE id=?").bind(uid).first();
    const keys = {}, photos = {};
    (k.results || []).forEach(r => { keys[r.k] = r.t; });
    (p.results || []).forEach(r => { photos[r.pid] = r.t; });
    return json({ email: u && u.email, keys, photos });
  }

  if (P === "/sync/get") {
    const ks = (Array.isArray(B.keys) ? B.keys : []).filter(k => SYNC_KEYS.includes(k));
    const ps = (Array.isArray(B.photos) ? B.photos : []).map(x => clean(x, 40)).filter(Boolean).slice(0, 30);
    const data = {}, photos = {};
    for (const k of ks) { const r = await DB.prepare("SELECT v, t FROM ms_data WHERE uid=? AND k=?").bind(uid, k).first(); if (r) data[k] = { v: r.v, t: r.t }; }
    for (const pid of ps) { const r = await DB.prepare("SELECT img FROM ms_photo WHERE uid=? AND pid=?").bind(uid, pid).first(); if (r) photos[pid] = r.img; }
    return json({ data, photos });
  }

  if (P === "/sync/put") {
    if (await quota(env, [["u|" + uid + "|sync", "SYNC_USER"]])) return json({ erreur: QUOTA_MSG, code: "quota" }, 429);
    const data = B.data && typeof B.data === "object" ? B.data : {}, photos = B.photos && typeof B.photos === "object" ? B.photos : {};
    const st = [];
    for (const k of Object.keys(data)) {
      if (!SYNC_KEYS.includes(k)) continue;
      const v = data[k];
      if (v === null) { st.push(DB.prepare("DELETE FROM ms_data WHERE uid=? AND k=?").bind(uid, k)); continue; }
      if (typeof v !== "string" || v.length > MAX_VAL) return json({ erreur: "Trop de données à sauvegarder.", code: "taille", k }, 413);
      st.push(DB.prepare("INSERT INTO ms_data (uid, k, v, t) VALUES (?1,?2,?3,?4) ON CONFLICT(uid, k) DO UPDATE SET v=?3, t=?4").bind(uid, k, v, now));
    }
    const pids = Object.keys(photos).slice(0, 30);
    let ajout = 0;
    for (const pid0 of pids) {
      const pid = clean(pid0, 40), img = photos[pid0];
      if (!pid) continue;
      if (img === null) { st.push(DB.prepare("DELETE FROM ms_photo WHERE uid=? AND pid=?").bind(uid, pid)); continue; }
      if (typeof img !== "string" || img.length > MAX_IMG || !/^data:image\/(jpeg|png|webp);base64,/.test(img)) continue;
      ajout++;
      st.push(DB.prepare("INSERT INTO ms_photo (uid, pid, img, t) VALUES (?1,?2,?3,?4) ON CONFLICT(uid, pid) DO UPDATE SET img=?3, t=?4").bind(uid, pid, img, now));
    }
    if (ajout) {
      const c = await DB.prepare("SELECT COUNT(*) AS n FROM ms_photo WHERE uid=?").bind(uid).first();
      if (c && c.n + ajout > MAX_PHOTOS) return json({ erreur: "Ta garde-robe a atteint le maximum de photos sauvegardées.", code: "photos" }, 413);
    }
    if (st.length) await DB.batch(st);
    return json({ ok: true, t: now });
  }

  // « Effacer toutes mes données » (ou supprimer mon compte) : tout part du serveur.
  if (P === "/compte/del") {
    await DB.batch([
      DB.prepare("DELETE FROM ms_data WHERE uid=?").bind(uid),
      DB.prepare("DELETE FROM ms_photo WHERE uid=?").bind(uid),
      DB.prepare("DELETE FROM ms_sess WHERE uid=?").bind(uid),
      DB.prepare("DELETE FROM ms_users WHERE id=?").bind(uid)
    ]);
    return json({ ok: true });
  }
  return json({ erreur: "Requête invalide." }, 404);
}

// Mesure d'usage anonyme : quels écrans sont ouverts, combien de téléphones actifs par jour, qui revient.
// Aucune donnée personnelle : seulement l'identifiant au hasard du téléphone (jeton d'appareil) et des compteurs par jour.
export async function evenements(B, env, json, ctx) {
  const DB = env.MAJLIS;
  if (!DB) return json({ ok: true });
  await init(DB);
  const { DEV, quota } = ctx;
  if (await quota(env, [["d|" + DEV + "|ev", "EV_DEV"]])) return json({ ok: true });
  const d = day(), es = [...new Set((Array.isArray(B.e) ? B.e : []).map(x => String(x || "")).filter(x => EV_RE.test(x)))].slice(0, 20);
  const st = [DB.prepare("INSERT OR IGNORE INTO ms_act (d, dev) VALUES (?, ?)").bind(d, DEV), DB.prepare("INSERT OR IGNORE INTO ms_dev (dev, d) VALUES (?, ?)").bind(DEV, d)];
  for (const e of es) st.push(DB.prepare("INSERT INTO ms_ev (d, e, n) VALUES (?1, ?2, 1) ON CONFLICT(d, e) DO UPDATE SET n = n + 1").bind(d, e));
  await DB.batch(st);
  if (Math.random() < 0.01) await DB.batch([DB.prepare("DELETE FROM ms_ev WHERE d < ?").bind(day(Date.now() - 400 * 864e5)), DB.prepare("DELETE FROM ms_act WHERE d < ?").bind(day(Date.now() - 400 * 864e5))]);
  return json({ ok: true });
}

// Page privée clientes.html (code de la styliste) : la liste unique des clientes + l'usage.
export async function adminClientes(B, env, json) {
  const DB = env.MAJLIS;
  if (!DB) return json({ erreur: "Base non activée." }, 503);
  await init(DB);
  const jours = Math.min(90, Math.max(7, parseInt(B.jours, 10) || 30)), depuis = day(Date.now() - (jours - 1) * 864e5);
  if (B.action === "delete") {
    const u = await DB.prepare("SELECT id FROM ms_users WHERE email=?").bind(clean(B.email, 254).toLowerCase()).first();
    if (u) await DB.batch(["ms_data", "ms_photo", "ms_sess"].map(t => DB.prepare(`DELETE FROM ${t} WHERE uid=?`).bind(u.id)).concat([DB.prepare("DELETE FROM ms_users WHERE id=?").bind(u.id)]));
    return json({ ok: true });
  }
  const users = (await DB.prepare(`SELECT u.email, u.nom, u.pays, u.lang, u.cree, u.vu,
      (SELECT COUNT(*) FROM ms_photo p WHERE p.uid = u.id) AS photos
    FROM ms_users u ORDER BY u.cree DESC LIMIT 5000`).all()).results || [];
  const actifs = (await DB.prepare("SELECT d, COUNT(*) AS n FROM ms_act WHERE d >= ? GROUP BY d ORDER BY d").bind(depuis).all()).results || [];
  const nouveaux = (await DB.prepare("SELECT d, COUNT(*) AS n FROM ms_dev WHERE d >= ? GROUP BY d ORDER BY d").bind(depuis).all()).results || [];
  const ecrans = (await DB.prepare("SELECT e, SUM(n) AS n FROM ms_ev WHERE d >= ? GROUP BY e ORDER BY n DESC LIMIT 60").bind(depuis).all()).results || [];
  // Retour à J+1 et J+7 : téléphones apparus pendant la période (assez anciens), revenus exactement ce jour-là.
  const ret = async k => {
    const fin = day(Date.now() - k * 864e5);
    const r = await DB.prepare(`SELECT COUNT(*) AS base, SUM(CASE WHEN EXISTS (SELECT 1 FROM ms_act a WHERE a.dev = f.dev AND a.d = date(f.d, '+${k} day')) THEN 1 ELSE 0 END) AS rev
      FROM ms_dev f WHERE f.d >= ? AND f.d <= ?`).bind(depuis, fin).first();
    return { base: (r && r.base) || 0, rev: (r && r.rev) || 0 };
  };
  return json({ users, actifs, nouveaux, ecrans, j1: await ret(1), j7: await ret(7), jours });
}
