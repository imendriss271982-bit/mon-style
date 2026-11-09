/* Diva Divina — Mon compte : connexion par code reçu par email, sauvegarde dans le cloud, mesure d'usage (v181).
   Chargé après aura-chatlook.js, avant aura-accueil.js.
   - Profil (`P.profil` enveloppée) : carte « Sauvegarde ton style » → email → code à 6 chiffres → connectée.
   - Sauvegarde automatique : toutes les 15 s et quand l'app passe en arrière-plan, les clés de `CP_KEYS`
     (profil, analyses, garde-robe, préférences, Zifafi, avatar, routine, styliste, Majlis) qui ont changé
     sont envoyées (`/sync/put`), ainsi que les photos de la garde-robe (IndexedDB `monstyle_gr_img`, par id).
   - Nouveau téléphone : après la connexion, si le compte a des données → récupération (ou choix si ce téléphone
     a déjà un style), puis rechargement. À l'ouverture : ce qui a été changé sur un autre téléphone est récupéré
     si ce téléphone n'a rien changé entre-temps.
   - « Effacer toutes mes données » efface aussi le compte et sa copie (`cpWipe`, `/compte/del`).
   - Mesure d'usage anonyme : ouverture de l'app et écrans visités (`/ev`), sans donnée personnelle.
   Données du téléphone : `monstyle_compte` = { tok, email, h:{clé: empreinte}, t:{clé: date serveur}, ph:{photo: empreinte}, last }. */

const CP_KEYS = ["monstyle", "monstyle_gr", "monstyle_pref", "monstyle_zf", "monstyle_avatar", "monstyle_mk", "monstyle_verif", "monstyle_majlis", "monstyle_gouts"];
let CP = (() => { try { const o = JSON.parse(localStorage.getItem("monstyle_compte") || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } })();
CP.h = CP.h || {}; CP.t = CP.t || {}; CP.ph = CP.ph || {};
const cpSave = () => { try { localStorage.setItem("monstyle_compte", JSON.stringify(CP)); } catch (e) {} };
const cpOn = () => !!CP.tok;
// Empreinte rapide d'un texte (pour savoir ce qui a changé sans tout renvoyer).
function cpHash(s) { s = String(s == null ? "" : s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + "." + s.length; }
const cpGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
async function cpApi(path, body) {
  const r = await aiPost(path, { ...(body || {}), tok: CP.tok });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && j.code === "session") { CP.tok = ""; cpSave(); }
  if (!r.ok) throw Object.assign(new Error(j.erreur || "Le serveur ne répond pas. Réessaie."), { code: j.code || "net" });
  return j;
}

// ——— Ce qui a changé sur ce téléphone ———
function cpPhotos() {
  const out = {};
  if (typeof GR === "undefined") return out;
  for (const x of GR.items || []) if (x && x.id && typeof x.img === "string" && x.img.startsWith("data:image/")) out[x.id] = x.img;
  return out;
}
function cpChanges() {
  const data = {}, photos = {};
  for (const k of CP_KEYS) {
    const v = cpGet(k), h = v == null ? "" : cpHash(v);
    if (h !== (CP.h[k] || "")) data[k] = v;
  }
  const ph = cpPhotos();
  for (const id in ph) { const h = cpHash(ph[id]); if (CP.ph[id] !== h) photos[id] = ph[id]; }
  for (const id in CP.ph) if (!ph[id]) photos[id] = null;
  return { data, photos };
}
const cpLocalRiche = () => (typeof S !== "undefined" && S.res && Object.keys(S.res).some(k => S.res[k])) || (typeof GR !== "undefined" && GR.items && GR.items.length > 0);

// ——— Envoi (sauvegarde) ———
let CP_BUSY = false;
async function cpPush(force) {
  // Pendant le choix « compte ou téléphone », rien ne part (sinon le style du téléphone écraserait celui du compte).
  if (!cpOn() || CP_BUSY || (S.cp && S.cp.etape === "choix")) return;
  const { data, photos } = cpChanges();
  const pids = Object.keys(photos);
  if (!Object.keys(data).length && !pids.length) return;
  CP_BUSY = true;
  try {
    // Les photos partent par petits paquets (jusqu'à ~1,5 Mo par envoi).
    const paquets = []; let cur = {}, taille = 0;
    for (const id of pids) {
      const v = photos[id], n = v ? v.length : 10;
      if (Object.keys(cur).length && (taille + n > 1500000 || Object.keys(cur).length >= 20)) { paquets.push(cur); cur = {}; taille = 0; }
      cur[id] = v; taille += n;
    }
    if (Object.keys(cur).length) paquets.push(cur);
    for (const p of paquets) {
      await cpApi("/sync/put", { photos: p });
      for (const id in p) { if (p[id] === null) delete CP.ph[id]; else CP.ph[id] = cpHash(p[id]); }
      cpSave();
    }
    if (Object.keys(data).length) {
      const r = await cpApi("/sync/put", { data });
      for (const k in data) { CP.h[k] = data[k] == null ? "" : cpHash(data[k]); CP.t[k] = r.t; }
    }
    CP.last = Date.now(); cpSave();
    if (force) toast("Ton style est sauvegardé");
  } catch (e) {
    if (force) toast(e.message);
  } finally { CP_BUSY = false; }
}

// ——— Récupération depuis le compte ———
async function cpPull(keys, pids) {
  const out = { data: {}, photos: {} };
  if (keys.length) Object.assign(out.data, (await cpApi("/sync/get", { keys })).data || {});
  for (let i = 0; i < pids.length; i += 25) Object.assign(out.photos, (await cpApi("/sync/get", { photos: pids.slice(i, i + 25) })).photos || {});
  return out;
}
// Écrit sur le téléphone ce qui vient du compte, puis recharge l'app (l'app relit tout au démarrage).
async function cpAppliquer(got, msg) {
  for (const k in got.data) {
    const it = got.data[k];
    try { localStorage.setItem(k, it.v); } catch (e) {}
    CP.h[k] = cpHash(it.v); CP.t[k] = it.t;
  }
  for (const id in got.photos) {
    try { await GRDB.put(id, got.photos[id]); GR_IN_DB.add(id); } catch (e) {}
    CP.ph[id] = cpHash(got.photos[id]);
  }
  CP.last = Date.now(); cpSave();
  try { sessionStorage.setItem("ms_cp_msg", msg || "Ton style est récupéré"); sessionStorage.setItem("ms_hi", "1"); } catch (e) {}
  location.reload();
}
async function cpRecuperer(tout) {
  const m = await cpApi("/sync/meta", {});
  const keys = Object.keys(m.keys || {}).filter(k => CP_KEYS.includes(k) && (tout || (m.keys[k] > (CP.t[k] || 0) && cpHash(cpGet(k)) === (CP.h[k] || cpHash(null)))));
  const pids = Object.keys(m.photos || {}).filter(id => tout || !CP.ph[id]);
  if (!keys.length && !pids.length) return false;
  await cpAppliquer(await cpPull(keys, pids), tout ? "Ton style est récupéré sur ce téléphone" : "");
  return true;
}
// Après la connexion sur ce téléphone : marque l'état actuel comme « déjà connu » pour ne renvoyer que les changements.
function cpMarquer() { for (const k of CP_KEYS) CP.h[k] = ""; CP.ph = {}; cpSave(); }

// ——— Écran « Mon compte » (dans le Profil) ———
S.cp = { etape: "", email: "", code: "", busy: false, err: "" };
function cpCarte() {
  const c = S.cp;
  if (cpOn() && c.etape !== "choix") {
    const quand = CP.last ? new Date(CP.last).toLocaleString(S.lang === "ar" ? "ar" : S.lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    return `<div class="cp-card on"><span class="cp-ic" aria-hidden="true">☁︎</span><div><b>Ton style est sauvegardé</b>
<small><span>Connectée :</span> <bdi data-noi18n>${esc(CP.email || "")}</bdi>${quand ? ` · <span>Dernière sauvegarde</span> <bdi data-noi18n>${esc(quand)}</bdi>` : ""}</small>
<small>Change de téléphone sans rien perdre : connecte-toi avec le même email.</small></div>
<div class="cp-acts"><button class="btn" data-cp="sauver"${c.busy ? " disabled" : ""}>Sauvegarder maintenant</button><button class="link" data-cp="sortir">Se déconnecter</button></div></div>`;
  }
  if (c.etape === "choix") return `<div class="cp-card"><b>Ce téléphone a déjà un style</b><small>Ton compte contient aussi un style sauvegardé. Lequel veux-tu garder ?</small>
<div class="cp-acts"><button class="btn" data-cp="recup"${c.busy ? " disabled" : ""}>Récupérer celui de mon compte</button><button class="btn ghost" data-cp="garder"${c.busy ? " disabled" : ""}>Garder celui de ce téléphone</button></div>${c.err ? `<p class="cp-err" role="alert">${esc(c.err)}</p>` : ""}</div>`;
  if (c.etape === "code") return `<div class="cp-card"><b>Entre le code reçu</b><small>Je t’ai envoyé un code à 6 chiffres à cette adresse :</small><small><bdi data-noi18n dir="ltr">${esc(c.email)}</bdi></small><small>Regarde aussi dans les spams.</small>
<label class="cp-lab" for="cpCode">Code à 6 chiffres</label><input id="cpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr" value="${esc(c.code)}">
<div class="cp-acts"><button class="btn" data-cp="verif"${c.busy ? " disabled" : ""}>${c.busy ? "Je vérifie…" : "Valider"}</button><button class="link" data-cp="retour">Changer d’email</button></div>${c.err ? `<p class="cp-err" role="alert">${esc(c.err)}</p>` : ""}</div>`;
  const em = c.email || (S.info && S.info.email) || "";
  return `<div class="cp-card"><span class="cp-ic" aria-hidden="true">☁︎</span><div><b>Sauvegarde ton style</b><small>Tes analyses, ta garde-robe et tes tenues restent à toi, même si tu changes de téléphone. Pas de mot de passe : je t’envoie un code par email.</small></div>
<label class="cp-lab" for="cpEmail">Ton email</label><input id="cpEmail" type="email" inputmode="email" autocomplete="email" dir="ltr" value="${esc(em)}">
<div class="cp-acts"><button class="btn" data-cp="envoyer"${c.busy ? " disabled" : ""}>${c.busy ? "J’envoie le code…" : "Recevoir mon code"}</button></div>${c.err ? `<p class="cp-err" role="alert">${esc(c.err)}</p>` : ""}</div>`;
}
if (typeof P.profil === "function") {
  const profilAvantCp = P.profil;
  P.profil = (...a) => { const o = profilAvantCp(...a); if (o && o.html) o.html = o.html.replace(/(<h1>Mon profil<\/h1>)/, "$1\n" + cpCarte()); return o; };
}
const cpRender = () => { if (S.page === "profil") render(false); };
document.addEventListener("input", e => { if (e.target.id === "cpEmail") S.cp.email = e.target.value; if (e.target.id === "cpCode") S.cp.code = e.target.value.replace(/\D/g, "").slice(0, 6); }, true);
document.addEventListener("keydown", e => { if (e.key === "Enter" && (e.target.id === "cpEmail" || e.target.id === "cpCode")) { e.preventDefault(); const b = document.querySelector(`[data-cp="${e.target.id === "cpEmail" ? "envoyer" : "verif"}"]`); if (b) b.click(); } }, true);
document.addEventListener("click", async e => {
  const t = e.target.closest && e.target.closest("[data-cp]");
  if (!t) return;
  e.preventDefault(); e.stopPropagation();
  const c = S.cp, a = t.dataset.cp;
  if (c.busy) return;
  const fin = err => { c.busy = false; c.err = err || ""; cpRender(); };
  try {
    if (a === "envoyer") {
      const em = String((document.getElementById("cpEmail") || {}).value || c.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(em)) return fin("Vérifie ton email.");
      c.email = em; c.busy = true; c.err = ""; cpRender();
      await cpApi("/auth/start", { email: em, lang: S.lang || "fr" });
      c.etape = "code"; c.code = ""; fin();
      setTimeout(() => { const f = document.getElementById("cpCode"); if (f) f.focus(); }, 60);
    } else if (a === "retour") { c.etape = ""; c.err = ""; cpRender(); }
    else if (a === "verif") {
      const code = String((document.getElementById("cpCode") || {}).value || c.code).replace(/\D/g, "");
      if (code.length !== 6) return fin("Entre les 6 chiffres du code.");
      c.busy = true; c.err = ""; cpRender();
      const r = await cpApi("/auth/verify", { email: c.email, code, nom: S.nom || "", pays: typeof pays === "function" ? pays() : "", lang: S.lang || "fr" });
      CP = { tok: r.tok, email: r.email, h: {}, t: {}, ph: {} }; cpMarquer();
      if (S.info && !S.info.email) { S.info.email = r.email; save(); }
      cpEv("compte");
      if (r.donnees && cpLocalRiche()) { c.etape = "choix"; return fin(); }
      if (r.donnees) { await cpRecuperer(true); return; }
      c.etape = ""; fin(); toast("Ton compte est créé : ton style est sauvegardé"); cpPush();
    } else if (a === "recup") { c.busy = true; cpRender(); await cpRecuperer(true); }
    else if (a === "garder") { c.busy = true; cpRender(); c.etape = ""; await cpPush(); fin(); toast("Ton style est sauvegardé"); }
    else if (a === "sauver") { c.busy = true; cpRender(); await cpPush(true); fin(); }
    else if (a === "sortir") {
      if (!confirm(tr("Te déconnecter ? Ton style reste sur ce téléphone, mais il ne sera plus sauvegardé."))) return;
      cpApi("/auth/out", {}).catch(() => {});
      CP = { h: {}, t: {}, ph: {} }; cpSave(); c.etape = ""; cpRender();
    }
  } catch (err) { fin(err.message); }
}, true);

// « Effacer toutes mes données » : le compte et sa copie dans le cloud sont effacés aussi.
function cpWipe() { if (cpOn()) cpApi("/compte/del", {}).catch(() => {}); CP = { h: {}, t: {}, ph: {} }; try { localStorage.removeItem("monstyle_compte"); } catch (e) {} }

// ——— Mesure d'usage anonyme ———
let CP_EV = [];
function cpEv(e) { if (CP_EV.length < 40) CP_EV.push(e); }
function cpEvFlush(beacon) {
  if (!CP_EV.length) return;
  const e = CP_EV.splice(0, 20);
  let dev = ""; try { dev = localStorage.getItem("monstyle_dev") || ""; } catch (x) {}
  if (beacon && dev && navigator.sendBeacon) { try { navigator.sendBeacon(AI_URL + "/ev", JSON.stringify({ dev, e })); return; } catch (x) {} }
  aiPost("/ev", { e }).catch(() => {});
}
{ const prev = window.onPage; window.onPage = pg => { if (prev) prev(pg); if (pg && pg !== CP_PG) { CP_PG = pg; cpEv("p:" + String(pg).toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 36)); } }; }
var CP_PG = "";

// ——— Démarrage ———
(function cpDemarrer() {
  if (window.CP_TEST) return; // les tests pilotent eux-mêmes
  cpEv("open");
  setTimeout(() => cpEvFlush(), 4000);
  setInterval(() => { cpEvFlush(); cpPush(); }, 15000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { cpEvFlush(true); cpPush(); } });
  let msg = ""; try { msg = sessionStorage.getItem("ms_cp_msg") || ""; sessionStorage.removeItem("ms_cp_msg"); } catch (e) {}
  if (msg) setTimeout(() => toast(msg), 900);
  // Changements faits sur un autre téléphone : récupérés si ce téléphone n'a rien changé entre-temps.
  else if (cpOn()) setTimeout(() => { if (!/_run$/.test(S.page || "")) cpRecuperer(false).catch(() => {}); }, 2500);
})();

(function cpCSS() {
  const st = document.createElement("style");
  st.textContent = `
.cp-card{position:relative;display:grid;gap:8px;margin:0 0 16px;padding:16px;border-radius:18px;background:var(--surface,#fff);box-shadow:0 2px 12px rgba(140,109,53,.12)}
.cp-card>div:first-child{display:grid;gap:4px}
.cp-card b{font-size:1.02rem}
.cp-card small{display:block;color:var(--muted,#6E6E6E);font-size:.86rem;line-height:1.45}
.cp-card.on{grid-template-columns:auto 1fr}
.cp-card.on .cp-acts{grid-column:1/-1}
.cp-ic{font-size:1.4rem;color:var(--accent,#8C6D35);line-height:1}
.cp-card:not(.on) .cp-ic{position:absolute;inset-inline-end:16px;top:14px}
.cp-lab{font-size:.84rem;font-weight:600;color:var(--ink,#292421);margin-top:4px}
.cp-card input{width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #E6E6E6;border-radius:12px;font:inherit;font-size:1rem;background:#fff;color:#292421}
#cpCode{letter-spacing:.4em;font-size:1.3rem;text-align:center}
.cp-acts{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:4px}
.cp-acts .btn{flex:1 1 auto}
.cp-err{margin:2px 0 0;color:#A23B2A;font-size:.88rem}`;
  document.head.appendChild(st);
})();
