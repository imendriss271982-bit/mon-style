/* Diva Divina — Diva se souvient et fait le suivi (v225, Imen 17 novembre 2026 :
   « قالت لها اوتفيت تشيك رايحة للشغل… تخرج برا التليفون كنوتيفيكيشن… كيف صار فرح اختك… دايما في متابعة »).
   Chargé après aura-compte.js, AVANT aura-accueil.js.
   1) SOUVENIRS (`SV.l`, clé `monstyle_souv`, synchronisée avec le compte) : chaque Outfit check (occasion + note), chaque
      tenue du jour portée, et chaque événement dont elle parle à Diva par écrit ou à la voix (« عرس أختي بكرة »,
      « mariage de ma sœur demain », « job interview tomorrow »… : `svDetecte`, sans IA).
   2) SUIVI : une question plus tard (travail → le soir même ; soirée, mariage, Aïd → le lendemain ; événement dit à Diva →
      le lendemain de l'événement si le jour est connu : aujourd'hui, ce soir, demain, après-demain, la semaine prochaine).
      Au plus UNE question par jour. Sur l'accueil : carte « Diva te demande » (😍 Parfait / 🙂 Bien / 😕 Pas à l'aise,
      ou « Écrire à Diva »). Hors de l'app : notification Web Push (sw.js + worker/suivi.js) si elle a accepté.
   3) MÉMOIRE DE DIVA : `PROFIL()` reçoit les derniers souvenirs et ses réponses → Diva (chat écrit et appel vocal)
      reprend les moments d'avant, toujours avec chaleur.
   Rien n'est deviné : seuls ses Outfit checks, ses tenues portées et ses propres mots sont gardés. */

let SV = (() => { try { const o = JSON.parse(localStorage.getItem("monstyle_souv") || "{}"); return o && typeof o === "object" && Array.isArray(o.l) ? o : { l: [] }; } catch (e) { return { l: [] }; } })();
SV.l = SV.l.filter(x => x && typeof x === "object" && x.id && x.t).slice(-60);
const svSave = () => { SV.l = SV.l.slice(-60); try { localStorage.setItem("monstyle_souv", JSON.stringify(SV)); } catch (e) {} };
const svId = () => (Math.random().toString(36).slice(2, 8) + Date.now().toString(36)).replace(/[^a-z0-9]/g, "");
const svJour = ms => { const d = new Date(ms); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
const svA = (base, j, h, m) => { const d = new Date(base); d.setDate(d.getDate() + j); d.setHours(h, m || 0, 0, 0); return d.getTime(); };

// ——— Questions (en français ; traduites par i18n.js) ———
const SV_Q = {
  travail: "Comment s’est passée ta journée au travail ? Tu étais à l’aise dans ta tenue ?",
  quotidien: "Comment tu t’es sentie dans ta tenue aujourd’hui ?",
  soiree: "Alors, ta soirée ? Je suis sûre que tu étais rayonnante. Tu t’es sentie bien dans ta tenue ?",
  mariage: "Alors, ce mariage ? Je suis sûre que tu étais magnifique. Tu t’es sentie bien dans ta tenue ?",
  fete: "Alors, ta fête ? J’espère que tu as passé un beau moment. Ta tenue t’a plu ?",
  voyage: "Alors, ton voyage ? Tu étais à l’aise dans tes tenues ?",
  jour: "Ta tenue du jour, alors ? Tu t’es sentie bien dedans ?",
  event: "Alors, « {0} », ça s’est passé comment ? J’espère que tu as passé un beau moment 💛"
};
// Occasion de l'Outfit check (OCCS) ou de la tenue du jour (GR_OCC) → type de question + moment du suivi.
function svType(occ) {
  const o = String(occ || "").toLowerCase();
  if (/travail|bureau|réunion|reunion/.test(o)) return "travail";
  if (/mariage/.test(o)) return "mariage";
  if (/soir|rendez/.test(o)) return "soiree";
  if (/aïd|aid|ramadan/.test(o)) return "fete";
  if (/voyage/.test(o)) return "voyage";
  return "quotidien";
}
function svQuand(type, now) {
  if (type === "travail" || type === "quotidien" || type === "jour") {
    if (new Date(now).getHours() < 15) return svA(now, 0, 18, 30); // le soir même, après la journée
    const t = now + 4 * 36e5;
    return new Date(t).getHours() >= 22 || new Date(t).getDate() !== new Date(now).getDate() ? svA(now, 1, 11, 0) : t;
  }
  return svA(now, 1, 11, 0); // soirée, mariage, fête, voyage : le lendemain à 11 h
}
function svQuestion(it) { return it.k === "event" ? SV_Q.event.replace("{0}", it.quoi || "") : SV_Q[it.type] || SV_Q.quotidien; }

// ——— Détection d'un événement dans ses propres mots (chat écrit ou vocal) ———
const SV_EVT = /(عرس|زفاف|زواج|فرح|خطوب[ةه]|ملك[ةه]|حن[ةه]|حفل[ةه]?|عزوم[ةه]|غبق[ةه]|مقابل[ةه]|انترفيو|إنترفيو|عيد ميلاد|تخرج|سفر|سفرة|mariage|fian[cç]ailles|soir[ée]e|f[êe]te|anniversaire|entretien|voyage|d[îi]ner|remise de dipl[ôo]me|wedding|engagement|party|birthday|interview|trip|dinner|graduation)/i;
const SV_QUAND = [
  [/(بعد بكر[ةه]|بعد باكر|après-demain|apres-demain|day after tomorrow)/i, 2],
  [/(بكر[ةه]|باكر|بكرا|غد[اًا]?|demain|tomorrow)/i, 1],
  [/(اليوم|الليل[ةه]|هالليل[ةه]|العصر|ce soir|aujourd['’]hui|tonight|today|this evening)/i, 0],
  [/(الأسبوع الجاي|الاسبوع الجاي|الأسبوع الجاي|الأسبوع القادم|la semaine prochaine|next week)/i, 7]
];
function svDetecte(text) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length < 4 || s.length > 600) return null;
  const m = s.match(SV_EVT);
  if (!m) return null;
  // Le morceau de phrase autour de l'événement, dans ses mots à elle (ex. « عرس أختي »).
  const i = m.index, mots = s.slice(i).split(" ");
  // Le mot de l'événement + ce qui suit (« عرس أختي », « mariage de ma sœur », « job interview »).
  let quoi = mots.slice(0, /^(mariage|soir[ée]e|f[êe]te|anniversaire|entretien|voyage|d[îi]ner)$/i.test(mots[0]) ? 4 : /^(عند|مع|في|حق|تبع|متاع)$/.test(mots[1] || "") ? 3 : 2).join(" ");
  const avant = s.slice(0, i).trim().split(" ").pop() || "";
  if (/^(le|la|du|ma|mon|the|my|au|job|un|une|a)$/i.test(avant)) quoi = avant + " " + quoi;
  quoi = quoi.replace(/\s+(après-demain|apres-demain|demain|ce soir|aujourd['’]hui|la semaine prochaine|tomorrow|tonight|today|next week|بعد|بكر[ةه]|باكر|اليوم|الليل[ةه]|الأسبوع|الاسبوع)(\s.*)?$/i, "").replace(/[.,!?؟،:;]+$/g, "");
  quoi = quoi.slice(0, 40);
  let j = null;
  for (const [re, d] of SV_QUAND) if (re.test(s)) { j = d; break; }
  return { quoi, j };
}
function svEcoute(text) {
  try {
    const d = svDetecte(text);
    if (!d) return;
    const now = Date.now();
    // Même événement déjà noté ces 3 derniers jours : rien de nouveau.
    if (SV.l.some(x => x.k === "event" && x.quoi === d.quoi && now - x.t < 3 * 864e5)) return;
    const it = { id: svId(), t: now, k: "event", quoi: d.quoi, quand: d.j == null ? 0 : svA(now, d.j, 12, 0), at: d.j == null ? 0 : svA(now, d.j + 1, 11, 0), rep: "" };
    SV.l.push(it); svPlanifier(it); svSave();
  } catch (e) {}
}
window.svEcoute = svEcoute;

// ——— Ajout d'un souvenir + programmation du suivi (au plus une question par jour) ———
function svPlanifier(it) {
  if (!it.at) return;
  const jour = svJour(it.at);
  if (SV.l.some(x => x !== it && x.at && !x.rep && !x.non && svJour(x.at) === jour)) { it.at = 0; return; }
  if (SV.push === 1) svPushAdd(it);
}
function svOutfit() {
  try {
    const o = typeof ok === "function" ? ok("outfit") : null;
    if (!o || !S.res.outfit || S.res.outfit._sv) return;
    S.res.outfit._sv = 1; save();
    const now = Date.now(), type = svType(S.occ);
    const it = { id: svId(), t: now, k: "oc", occ: String(S.occ || ""), type, note: o.note, at: svQuand(type, now), rep: "" };
    SV.l.push(it); svPlanifier(it); svSave();
  } catch (e) {}
}
if (typeof jrPorter === "function") {
  const jrPorterAvantSv = jrPorter;
  jrPorter = function () {
    const avant = typeof JR !== "undefined" && JR.porte;
    const r = jrPorterAvantSv.apply(this, arguments);
    try {
      if (!avant && typeof JR !== "undefined" && JR.porte && JR.look) {
        const now = Date.now();
        const it = { id: svId(), t: now, k: "jour", occ: String(JR.occ || ""), type: "jour", titre: String(JR.look.titre || ""), at: svQuand("jour", now), rep: "" };
        SV.l.push(it); svPlanifier(it); svSave();
      }
    } catch (e) {}
    return r;
  };
}
// Ses messages écrits à Diva.
if (typeof send === "function") {
  const sendAvantSv = send;
  send = async function (text) { svEcoute(text); return sendAvantSv.apply(this, arguments); };
  window.send = send;
}

// ——— Mémoire donnée à Diva ———
const SV_REP = { top: "parfait, elle s’est sentie très bien", bien: "bien", gene: "pas à l’aise" };
function svMemoire() {
  const now = Date.now(), d = ms => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const l = SV.l.filter(x => now - x.t < 45 * 864e5).slice(-8).map(x => {
    let s = d(x.t) + " : ";
    if (x.k === "oc") s += "Outfit check" + (x.occ ? " pour « " + x.occ + " »" : "") + (x.note != null ? ", note " + x.note + "/10" : "");
    else if (x.k === "jour") s += "elle a porté la tenue du jour « " + (x.titre || "") + " »" + (x.occ ? " (" + x.occ + ")" : "");
    else s += "elle t’a parlé de « " + x.quoi + " »" + (x.quand ? " (prévu le " + d(x.quand) + ")" : "");
    if (x.rep) s += " — sa réponse ensuite : " + (SV_REP[x.rep] || x.rep);
    return s;
  });
  if (!l.length) return "";
  return "SOUVENIRS AVEC TOI (moments récents de sa vie, à reprendre avec chaleur quand c’est naturel : demande comment ça s’est passé, rappelle une tenue qui lui allait bien, félicite-la ; jamais de reproche, jamais tout réciter) : " + l.join(" | ");
}
if (typeof PROFIL === "function") {
  const profilAvantSv = PROFIL;
  PROFIL = function () { const x = profilAvantSv.apply(this, arguments) || "", m = svMemoire(); return m ? (x ? x + " ; " : "") + m : x; };
}

// ——— Notifications hors de l'app (Web Push) ———
const SV_SW = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const svStandalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const svIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const svU8 = b => { const s = atob(b.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b.length + 3) % 4)); return Uint8Array.from(s, c => c.charCodeAt(0)); };
let SV_SUB = null;
async function svAbonnement(demander) {
  if (!SV_SW) return null;
  if (SV_SUB) return SV_SUB;
  const reg = await navigator.serviceWorker.register("sw.js");
  if (Notification.permission !== "granted") {
    if (!demander) return null;
    const p = await Notification.requestPermission();
    if (p !== "granted") return null;
  }
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const r = await aiPost("/suivi/key", {}); const j = await r.json();
    if (!j.key) return null;
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: svU8(j.key) });
  }
  SV_SUB = sub.toJSON();
  return SV_SUB;
}
async function svPushAdd(it) {
  try {
    const sub = await svAbonnement(false);
    if (!sub || !it.at || it.rep) return;
    // v226 : la question ne part jamais sur le serveur ; la notification dit seulement « Diva a un message pour toi ».
    await aiPost("/suivi/add", { sub, id: it.id, at: it.at, lang: S.lang || "fr", mode: SV.mode === "silent" ? "silent" : "on" });
    it.envoye = 1; svSave();
  } catch (e) {}
}
async function svActiver() {
  if (svIOS() && !svStandalone()) { toast("Ajoute Diva Divina à ton écran d’accueil pour recevoir mes messages"); return; }
  if (!SV_SW) { toast("Ton téléphone ne permet pas les notifications ici"); return; }
  try {
    const sub = await svAbonnement(true);
    if (!sub) { SV.push = -1; svSave(); toast("D’accord, je te poserai mes questions ici, dans l’app"); svRender(); return; }
    SV.push = 1; svSave();
    for (const it of SV.l) if (it.at && !it.rep && !it.non && !it.envoye && it.at > Date.now() - 36e5) await svPushAdd(it);
    toast("C’est noté, je te donnerai des nouvelles 💛");
  } catch (e) { toast("Les notifications n’ont pas pu être activées. Réessaie."); }
  svRender();
}
const svRender = () => { if (S.page === "home" || S.page === "o_res") { const y = window.scrollY; render(false); window.scrollTo(0, y); } };

// ——— Carte de l'accueil « Diva te demande » ———
const svDue = () => { const now = Date.now(); return SV.l.filter(x => x.at && x.at <= now && !x.rep && !x.non && now - x.at < 5 * 864e5).slice(-1)[0] || null; };
function svCarte() {
  const it = svDue();
  if (!it) return "";
  return `<section class="sv-home" aria-label="Diva te demande"><div class="sv-h"><img src="aura-face.jpg?v=5" alt="" width="40" height="40"><span class="hr-lab">Diva te demande</span><button class="sv-x" data-svnon="${it.id}" aria-label="Plus tard">✕</button></div>
<p class="sv-q">${esc(svQuestion(it))}</p>
<div class="sv-r" role="group"><button data-svrep="${it.id}:top">😍 Parfait</button><button data-svrep="${it.id}:bien">🙂 Bien</button><button data-svrep="${it.id}:gene">😕 Pas à l’aise</button></div>
<button class="sv-w" data-svdiva="${it.id}">Écrire à Diva ›</button></section>`;
}
if (typeof P.home === "function") {
  const homeAvantSv = P.home;
  P.home = (...a) => { const o = homeAvantSv(...a); if (o && typeof o.html === "string") { const c = svCarte(); if (c) o.html = c + o.html; } return o; };
}
// Après un Outfit check : proposer qu'elle ait des nouvelles de Diva, une seule fois (si les notifications ne sont pas encore choisies).
if (typeof P.o_res === "function") {
  const oresAvantSv = P.o_res;
  P.o_res = (...a) => {
    svOutfit();
    const o = oresAvantSv(...a);
    if (o && typeof o.html === "string" && !SV.push && SV_SW && !(typeof Notification !== "undefined" && Notification.permission === "denied")) {
      const it = SV.l.slice().reverse().find(x => x.k === "oc" && x.at);
      if (it) o.html += `<section class="sv-ask"><b>🔔 Je prends de tes nouvelles ?</b><small>${it.type === "travail" || it.type === "quotidien" ? "Ce soir, je te demanderai comment s’est passée ta journée dans cette tenue." : "Demain, je te demanderai comment s’est passé ton moment."}</small>
<div class="sv-r"><button class="btn" data-svpush="1">Oui, préviens-moi</button><button class="link" data-svpush="0">Non merci</button></div></section>`;
    }
    return o;
  };
}
async function svRep(id, rep) {
  const it = SV.l.find(x => x.id === id);
  if (!it) return;
  it.rep = rep; it.rt = Date.now(); svSave();
  if (it.envoye) aiPost("/suivi/del", { id }).catch(() => {});
  try { if (typeof cpEv === "function") cpEv("suivi_" + rep); } catch (e) {}
}
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-svrep],[data-svnon],[data-svdiva],[data-svpush]");
  if (!t) return;
  e.preventDefault(); e.stopPropagation();
  if (t.dataset.svpush != null) { if (t.dataset.svpush === "1") svActiver(); else { SV.push = -1; svSave(); svRender(); } return; }
  if (t.dataset.svnon) { const it = SV.l.find(x => x.id === t.dataset.svnon); if (it) { it.non = 1; svSave(); } svRender(); return; }
  if (t.dataset.svdiva) { svRep(t.dataset.svdiva, "parle"); S.draft = ""; go("chat"); return; }
  const [id, rep] = t.dataset.svrep.split(":");
  svRep(id, rep);
  if (rep === "gene") { toast("Merci de me le dire. Raconte-moi, on trouve mieux ensemble"); go("chat"); return; }
  toast(rep === "top" ? "Ça me fait tellement plaisir ! Je m’en souviendrai 💛" : "Super ! Je le garde en tête 💛");
  svRender();
}, true);

// Ouverture depuis une notification (?suivi=id) : on va sur l'accueil, où la question attend.
(function () {
  try {
    const q = new URLSearchParams(location.search).get("suivi");
    window.SV_Q = q || "";
    if (q != null) { history.replaceState(null, "", location.pathname + location.hash); try { if (typeof cpEv === "function") cpEv("suivi_notif"); } catch (e) {} }
    if (SV_SW) {
      navigator.serviceWorker.addEventListener("message", ev => { if (ev.data && "suivi" in ev.data && typeof home === "function") home(); });
      // Abonnement déjà accepté : on le récupère sans rien demander.
      if (SV.push === 1) setTimeout(() => svAbonnement(false).catch(() => {}), 4000);
    }
  } catch (e) {}
})();

// ——— Réglage du Profil « Messages de Diva » (v226, Imen : « لو بدها silent… أو تشيل الـnotification ») ———
// Activés (avec son) · Silencieux (sans son ni vibration) · Désactivés (plus aucune notification ; les questions restent dans l'app).
function svModeActuel() { return SV.push === 1 ? (SV.mode === "silent" ? "silent" : "on") : "off"; }
function svCarteProfil() {
  if (!SV_SW) return "";
  const m = svModeActuel(), b = (k, l) => `<button type="button" data-svmode="${k}" aria-pressed="${m === k}"${m === k ? ' class="on"' : ""}>${l}</button>`;
  return `<section class="sv-prof"><b>🔔 Messages de Diva</b><small>Diva prend de tes nouvelles après tes tenues et tes événements. Le message ne s’affiche jamais sur l’écran verrouillé : tu le lis en ouvrant l’app.</small>
<div class="sv-seg" role="group" aria-label="Messages de Diva">${b("on", "Activés")}${b("silent", "Silencieux")}${b("off", "Désactivés")}</div></section>`;
}
if (typeof P.profil === "function") {
  const profilAvantSv = P.profil;
  P.profil = (...a) => { const o = profilAvantSv(...a); if (o && typeof o.html === "string") { const c = svCarteProfil(); if (c) { const i = o.html.indexOf("<h2>Contact</h2>"); o.html = i >= 0 ? o.html.slice(0, i) + c + o.html.slice(i) : o.html + c; } } return o; };
}
async function svMode(m) {
  if (m === "off") {
    SV.push = -1; svSave();
    try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) {}
    SV_SUB = null; aiPost("/suivi/wipe", {}).catch(() => {});
    for (const it of SV.l) it.envoye = 0;
    svSave(); toast("C’est noté : plus de notifications. Mes questions restent dans l’app");
  } else {
    SV.mode = m; svSave();
    if (SV.push !== 1) await svActiver();
    if (SV.push === 1) { aiPost("/suivi/mode", { mode: m, lang: S.lang || "fr" }).catch(() => {}); if (m === "silent") toast("C’est noté : mes messages arriveront sans bruit"); }
  }
  if (S.page === "profil") { const y = window.scrollY; render(false); window.scrollTo(0, y); }
}
document.addEventListener("click", e => { const t = e.target.closest && e.target.closest("[data-svmode]"); if (!t) return; e.preventDefault(); e.stopPropagation(); svMode(t.dataset.svmode); }, true);

// « Effacer toutes mes données ».
function svWipe() { SV = { l: [] }; try { localStorage.removeItem("monstyle_souv"); } catch (e) {} aiPost("/suivi/wipe", {}).catch(() => {}); }

(function () {
  const st = document.createElement("style");
  st.textContent = `
.sv-home{margin:14px 0 6px;padding:16px;border-radius:20px;background:var(--dd-nacre,#FFFDF9);border:1px solid var(--dd-champagne,#E9D6AE);box-shadow:0 6px 18px rgba(42,36,32,.08)}
.sv-home .sv-h{display:flex;align-items:center;gap:10px}
.sv-home .sv-h img{width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:50% 20%}
.sv-home .sv-h .hr-lab{flex:1;margin:0}
.sv-home .sv-x{width:44px;height:44px;border:0;background:none;color:#8A7F76;font-size:16px;cursor:pointer}
.sv-home .sv-q{margin:10px 0 12px;font-size:16px;line-height:1.45;color:var(--ink,#1C1714)}
.sv-r{display:flex;flex-wrap:wrap;gap:8px}
.sv-home .sv-r button{flex:1 1 30%;min-height:44px;padding:8px 10px;border-radius:999px;border:1px solid var(--dd-champagne,#E9D6AE);background:#fff;color:var(--ink,#1C1714);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.sv-home .sv-w{display:block;margin-top:10px;min-height:44px;padding:8px 0;border:0;background:none;color:var(--accent,#7A5B26);font:inherit;font-weight:600;cursor:pointer}
.sv-ask{margin:18px 0 0;padding:16px;border-radius:18px;background:var(--dd-nacre,#FFFDF9);border:1px solid var(--dd-champagne,#E9D6AE)}
.sv-ask b{display:block;font-size:16px}
.sv-ask small{display:block;margin:6px 0 12px;color:#5D534B;font-size:14px;line-height:1.4}
.sv-ask .sv-r{align-items:center}
.sv-prof{margin:18px 0;padding:16px;border-radius:18px;background:var(--dd-nacre,#FFFDF9);border:1px solid var(--dd-champagne,#E9D6AE)}
.sv-prof b{display:block;font-size:16px}
.sv-prof small{display:block;margin:6px 0 12px;color:#5D534B;font-size:14px;line-height:1.45}
.sv-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:4px;border-radius:999px;background:#F3EEE6}
.sv-seg button{min-height:44px;border:0;border-radius:999px;background:none;color:#5D534B;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.sv-seg button.on{background:#fff;color:var(--ink,#1C1714);box-shadow:0 2px 8px rgba(42,36,32,.12)}`;
  document.head.appendChild(st);
})();
