/* Diva Divina — Garde-robe facile + tenue du matin (v227, Imen 17 novembre 2026 :
   « بدي تعبئة الخزانة يكون سهل… جهزت لك ملابسك… هذا كتير مهم بالنسبة لي »).
   Chargé après aura-souvenirs.js, AVANT aura-accueil.js.
   1) GARDE-ROBE EN 5 MINUTES : en haut de la garde-robe, la carte `.rm-card` remplace l'ancien bloc « x / 7 articles » :
      - une seule grande action « Photographier plusieurs pièces » (3 à 6 pièces posées ensemble sur le lit : Diva les
        sépare et les range toute seule — c'est déjà `grAdd` + `PR_MULTI`), puis « Choisir des photos » et « Ajouter sans photo » ;
      - ce qu'elle a déjà en un coup d'œil (Hauts, Bas, Robes et abayas, Chaussures, Sacs ✓) et le nombre de TENUES
        POSSIBLES (`rmTenues`) : la récompense qui donne envie d'ajouter encore ;
      - après chaque photo : bandeau « ✓ 4 pièces rangées : … · Encore une photo ? » (la voix est coupée hors de la page
        Diva depuis v216, il n'y avait plus aucun retour) + petits paliers fêtés (5, 10, 20, 30, 50 pièces).
   2) TENUE DU MATIN : chaque matin à l'heure choisie (7 h 30 par défaut), notification « Bonjour ☀️ Ta tenue du jour
      t'attend » (texte générique, `sw.js`) ; la toucher ouvre « Que porter aujourd'hui ? » et Diva compose la tenue tout de
      suite (`jrChoisir`). Programmée 7 jours à l'avance (ids « m » + date), seulement si la garde-robe permet une tenue
      (`jrPret`) et si les notifications sont acceptées ; réglage dans le Profil (carte « Messages de Diva »). */

const RM_PALIERS = [5, 10, 20, 30, 50];
function rmStats() {
  const it = GR.items.filter(x => !x.wait), n = c => it.filter(x => c.includes(x.cat)).length;
  const h = n(GR_TOP), b = n(GR_BOT), f = n(GR_FULL);
  return { tot: it.length, hauts: h, bas: b, full: f, chauss: n(["chaussures"]), sacs: n(["sac"]), vestes: n(["veste"]), tenues: Math.min(h * b, 199) + f };
}
const rmPhrase = s => s.tenues ? (s.tenues > 1 ? s.tenues + " tenues possibles" : "1 tenue possible") : "";
function rmCarte() {
  const s = rmStats(), chip = (ok, l, n) => `<span class="rm-chip${ok ? " ok" : ""}">${ok ? "✓" : "+"} ${l}${n ? ` <small data-noi18n>${n}</small>` : ""}</span>`;
  const guide = typeof ggVu === "function" && typeof GG_MAX !== "undefined" && ggVu() < GG_MAX;
  const camera = guide
    ? `<button type="button" class="btn rm-main" data-gguide>📷 Photographier plusieurs pièces</button>`
    : `<label class="btn rm-main">📷 Photographier plusieurs pièces<input type="file" accept="image/*" capture="environment" data-gadd hidden></label>`;
  const d = S.rmDernier && Date.now() - S.rmDernier.t < 5 * 60e3 ? S.rmDernier : null;
  return `<section class="rm-card" aria-label="Remplir ma garde-robe">
${d ? `<div class="rm-ok" role="status"><b>✓ ${d.n > 1 ? `<span data-noi18n>${d.n}</span> pièces rangées` : "1 pièce rangée"}</b><small data-noi18n>${esc(d.noms)}</small></div>` : ""}
<span class="hr-lab">${s.tot ? "Ta garde-robe" : "Ta garde-robe en 5 minutes"}</span>
<b class="rm-t">${s.tot ? `<span data-noi18n>${s.tot}</span> <span>${s.tot > 1 ? "pièces" : "pièce"}</span>${s.tenues ? `<span data-noi18n> · ${s.tenues} </span><span>${s.tenues > 1 ? "tenues possibles" : "tenue possible"}</span>` : ""}` : "Pose 3 à 6 pièces ensemble, une seule photo"}</b>
<small class="rm-s">${s.tot ? (d ? "Encore une photo ? Chaque pièce ajoute de nouvelles tenues." : "Pose plusieurs pièces sur ton lit, prends une photo : je les sépare et je les range toute seule.") : "Sur ton lit ou par terre, sur un fond clair : je sépare chaque pièce et je la range toute seule."}</small>
<div class="rm-chips">${chip(s.hauts, "Hauts", s.hauts)}${chip(s.bas, "Bas", s.bas)}${chip(s.full, "Robes et abayas", s.full)}${chip(s.chauss, "Chaussures", s.chauss)}${chip(s.sacs, "Sacs", s.sacs)}</div>
${camera}
<p class="gr-tip"><span aria-hidden="true">📸 </span><span>Pose tes pièces à plat sur un fond blanc (drap blanc, sol clair), sans qu’elles se touchent : Diva enlève le fond toute seule.</span> <span>Tu peux en photographier plusieurs ensemble, elle range chacune à sa place.</span></p>
<div class="rm-sec"><label class="link">🖼️ Choisir des photos<input type="file" accept="image/*" multiple data-gadd hidden></label><button type="button" class="link" data-gmanual>✍️ Ajouter sans photo</button><button type="button" class="link" data-gguide>💡 Bien photographier</button></div>
</section>`;
}
if (typeof P.garde === "function") {
  const gardeAvantRm = P.garde;
  P.garde = (asT) => {
    const r = gardeAvantRm(asT);
    if (!r || asT || typeof r.html !== "string") return r;
    // L'ancien bloc (progression x / 7, 3 boutons, barres) est remplacé par la carte simple. Le lien du guide d'aura-photo aussi.
    r.html = r.html.replace(/<button type="button" class="link gg-lien" data-gguide>[^<]*<\/button>/, "")
      .replace(/<section class="gr-prog"[\s\S]*?<\/section>/, rmCarte());
    return r;
  };
}

// Retour après chaque photo (la voix ne parle plus dans la garde-robe) + paliers fêtés.
if (typeof grAdd === "function") {
  const grAddAvantRm = grAdd;
  grAdd = async function (files) {
    const avant = new Set(GR.items.map(x => x.id)), n0 = rmStats().tot, t0 = rmStats().tenues;
    const r = await grAddAvantRm.apply(this, arguments);
    try {
      const nouv = GR.items.filter(x => !avant.has(x.id) && !x.wait);
      if (nouv.length) {
        const s = rmStats();
        S.rmDernier = { t: Date.now(), n: nouv.length, noms: nouv.slice(0, 6).map(x => tr(x.type || x.nom || grCat(x.cat))).join(" · ") };
        const pal = RM_PALIERS.find(p => n0 < p && s.tot >= p);
        if (pal) toast(tr("🌟 {0} pièces ! Ta garde-robe prend vie").replace("{0}", pal));
        else if (s.tenues > t0) toast(tr("✨ {0} tenues possibles maintenant").replace("{0}", s.tenues));
        if (S.page === "garde") { const y = window.scrollY; render(false); window.scrollTo(0, y); }
        if (typeof rmMatinPlanifier === "function") rmMatinPlanifier();
      }
    } catch (e) {}
    return r;
  };
}

// ——— Tenue du matin ———
// SV.matin : { h: "07:30" } (h = "" : désactivée). Par défaut 7 h 30.
const RM_HEURES = ["07:00", "07:30", "08:00", "09:00"];
const rmMatinH = () => (typeof SV !== "undefined" && SV.matin && typeof SV.matin.h === "string") ? SV.matin.h : "07:30";
const rmJourId = d => "m" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
let RM_EN_COURS = null;
function rmMatinPlanifier(refaire) {
  // Un seul calcul à la fois (ouverture, garde-robe, réglage peuvent l'appeler en même temps).
  const suite = (RM_EN_COURS || Promise.resolve()).then(() => rmMatinPlan(refaire));
  RM_EN_COURS = suite.finally(() => { if (RM_EN_COURS === suite) RM_EN_COURS = null; });
  return suite;
}
async function rmMatinPlan(refaire) {
  try {
    if (typeof SV === "undefined" || SV.push !== 1 || typeof svAbonnement !== "function") return;
    const ids = Array.isArray(SV.mp) ? SV.mp : [];
    if (refaire && ids.length) { aiPost("/suivi/del", { ids }).catch(() => {}); SV.mp = []; svSave(); }
    const h = rmMatinH();
    if (!h || !(typeof jrPret === "function" ? jrPret() : false)) return;
    const sub = await svAbonnement(false);
    if (!sub) return;
    const [hh, mm] = h.split(":").map(Number), now = Date.now(), deja = new Set(SV.mp || []);
    for (let j = 0; j < 7; j++) {
      const d = new Date(now); d.setDate(d.getDate() + j); d.setHours(hh, mm, 0, 0);
      const id = rmJourId(d);
      if (d.getTime() < now + 60e3 || deja.has(id)) continue;
      await aiPost("/suivi/add", { sub, id, at: d.getTime(), lang: S.lang || "fr", mode: SV.mode === "silent" ? "silent" : "on" });
      deja.add(id);
    }
    // On ne garde que les jours à venir.
    const auj = rmJourId(new Date(now));
    SV.mp = [...deja].filter(id => id >= auj).slice(-10); svSave();
  } catch (e) {}
}
window.rmMatinPlanifier = rmMatinPlanifier;
// Réglage dans la carte « Messages de Diva » du Profil.
if (typeof P.profil === "function") {
  const profilAvantRm = P.profil;
  P.profil = (...a) => {
    const o = profilAvantRm(...a);
    if (!o || typeof o.html !== "string" || o.html.indexOf('<section class="sv-prof">') < 0) return o;
    const h = rmMatinH(), b = (v, l) => `<button type="button" data-rmh="${v}" aria-pressed="${h === v}"${h === v ? ' class="on"' : ""}>${l}</button>`;
    const bloc = `<div class="rm-matin"><b>☀️ Ma tenue du matin</b><small>Chaque matin, je te prépare une tenue avec tes vêtements, selon la météo et ta journée.</small>
<div class="rm-h" role="group" aria-label="Heure">${RM_HEURES.map(v => b(v, `<span data-noi18n dir="ltr">${v.replace(/^0/, "")}</span>`)).join("")}${b("", "Non")}</div></div>`;
    o.html = o.html.replace(/(<section class="sv-prof">[\s\S]*?)(<\/section>)/, "$1" + bloc + "$2");
    return o;
  };
}
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-rmh]");
  if (!t) return;
  e.preventDefault(); e.stopPropagation();
  SV.matin = { h: t.dataset.rmh }; svSave();
  if (SV.push !== 1 && t.dataset.rmh && typeof svActiver === "function") svActiver().then(() => rmMatinPlanifier(true));
  else rmMatinPlanifier(true);
  toast(t.dataset.rmh ? tr("C’est noté : ta tenue t’attendra chaque matin à {0}").replace("{0}", t.dataset.rmh.replace(/^0/, "")) : "D’accord, plus de tenue du matin");
  if (S.page === "profil") { const y = window.scrollY; render(false); window.scrollTo(0, y); }
}, true);
// Quand elle accepte les notifications (svActiver), la tenue du matin est programmée aussi.
if (typeof svActiver === "function") {
  const svActiverAvantRm = svActiver;
  svActiver = async function () { const r = await svActiverAvantRm.apply(this, arguments); rmMatinPlanifier(); return r; };
}
// Ouverture depuis la notification du matin (?suivi=m…) ou app déjà ouverte (message du service worker).
let RM_OUVRIR = false;
try { const q = window.SV_Q || new URLSearchParams(location.search).get("suivi") || ""; if (/^m\d{8}$/.test(q)) RM_OUVRIR = true; } catch (e) {}
function rmOuvrirJour() {
  RM_OUVRIR = false;
  try {
    if (typeof cpEv === "function") cpEv("matin_notif");
    go("jour");
    const fait = typeof JR !== "undefined" && typeof jrAuj === "function" && JR.d === jrAuj() && JR.look;
    if (!fait && typeof jrChoisir === "function" && (typeof jrPret !== "function" || jrPret())) jrChoisir(false);
  } catch (e) {}
}
// On attend que l'écran d'ouverture soit passé (« Commencer ») et qu'elle soit sur l'accueil, puis on ouvre la tenue du jour.
(function rmAttendre(n) {
  if (!RM_OUVRIR || n > 240) return;
  const sp = document.getElementById("splash");
  const ouvert = sp && sp.isConnected && !sp.hidden && getComputedStyle(sp).display !== "none" && getComputedStyle(sp).visibility !== "hidden";
  if (!ouvert && typeof S !== "undefined" && S.page === "home") return setTimeout(rmOuvrirJour, 300);
  if (!ouvert && typeof S !== "undefined" && S.flow) { RM_OUVRIR = false; return; } // elle est dans un parcours (email, analyse) : on ne l'interrompt pas
  setTimeout(() => rmAttendre(n + 1), 500);
})(0);
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", ev => { if (ev.data && /^m\d{8}$/.test(String(ev.data.suivi || ""))) setTimeout(rmOuvrirJour, 300); });
// À chaque ouverture : les 7 prochains matins sont reprogrammés (les jours passés tombent tout seuls).
setTimeout(() => rmMatinPlanifier(), 6000);

(function () {
  const st = document.createElement("style");
  st.textContent = `
.rm-card{margin:8px 0 18px;padding:18px;border-radius:22px;background:var(--dd-nacre,#FFFDF9);border:1px solid var(--dd-champagne,#E9D6AE);box-shadow:0 6px 18px rgba(42,36,32,.07)}
.rm-card .hr-lab{display:block;margin-bottom:4px}
.rm-card .rm-t{display:block;font-family:var(--fh,inherit);font-size:21px;line-height:1.25;color:var(--ink,#1C1714)}
.rm-card .rm-s{display:block;margin:6px 0 12px;color:#5D534B;font-size:14px;line-height:1.45}
.rm-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
.rm-chip{display:inline-flex;align-items:center;gap:4px;padding:6px 11px;border-radius:999px;border:1px dashed #D9C9A8;color:#8A7F76;font-size:13px;font-weight:600}
.rm-chip.ok{border-style:solid;border-color:var(--dd-champagne,#E9D6AE);background:#fff;color:var(--ink,#1C1714)}
.rm-chip small{color:var(--accent,#7A5B26);font-weight:700}
.rm-card .rm-main{display:flex;width:100%;justify-content:center;min-height:56px;font-size:16px}
.rm-sec{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 16px;margin-top:10px}
.rm-sec .link{min-height:44px;display:inline-flex;align-items:center;font-size:14px;cursor:pointer}
.rm-ok{margin:-4px 0 12px;padding:10px 12px;border-radius:14px;background:#F3EEE6}
.rm-ok b{display:block;font-size:15px;color:var(--ink,#1C1714)}
.rm-ok small{display:block;margin-top:2px;color:#5D534B;font-size:13px}
.rm-matin{margin-top:16px;padding-top:14px;border-top:1px solid #EFE7DA}
.rm-matin b{display:block;font-size:15px}
.rm-matin small{display:block;margin:4px 0 10px;color:#5D534B;font-size:14px;line-height:1.45}
.rm-h{display:flex;flex-wrap:wrap;gap:6px}
.rm-h button{min-height:44px;padding:6px 14px;border-radius:999px;border:1px solid var(--dd-champagne,#E9D6AE);background:#fff;color:#5D534B;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.rm-h button.on{background:var(--ink,#1C1714);border-color:var(--ink,#1C1714);color:#fff}`;
  document.head.appendChild(st);
})();
