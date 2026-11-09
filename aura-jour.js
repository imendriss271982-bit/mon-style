/* v176 : jrPret() — tenue du jour possible avant GR_MIN pièces (un haut + un bas, ou une robe).
   Diva Divina — « Que porter aujourd'hui ? » (v140).
   Le geste quotidien : un bouton, et Diva choisit UNE tenue pour aujourd'hui avec les vraies pièces
   de la garde-robe, selon l'occasion du jour et la météo de la ville de la cliente.
   - Météo : Open-Meteo (gratuit, sans clé). La ville vient du fuseau horaire du téléphone (Golfe), sans demander la position.
     Si la météo ne charge pas, la tenue est quand même proposée.
   - « Je la porte aujourd'hui » note la date sur chaque pièce (x.w = dates ISO). Diva évite alors les pièces
     portées ces 3 derniers jours. Ces dates serviront plus tard au coût par port.
   - Tout reste sur le téléphone : clé `monstyle_jour` (tenue du jour) et `monstyle_meteo` (cache du jour).
   Chargé APRÈS aura-twin.js (utilise S, P, GR, grReady, grOccs, GR_OCC, grItemsTxt, grImg, grSave, getSample,
   REF, PROFIL, pfRules, FMT, isVip, paywall, say, toast, render, esc, NOM, homeReco…). */

// Villes du Golfe, retrouvées par le fuseau horaire du téléphone. Week-end : 5 = vendredi, 6 = samedi, 0 = dimanche.
const JR_VILLES = {
  "Asia/Qatar": { fr: "Doha", en: "Doha", ar: "الدوحة", lat: 25.29, lon: 51.53, we: [5, 6] },
  "Asia/Dubai": { fr: "Dubaï", en: "Dubai", ar: "دبي", lat: 25.2, lon: 55.27, we: [6, 0] },
  "Asia/Riyadh": { fr: "Riyad", en: "Riyadh", ar: "الرياض", lat: 24.71, lon: 46.68, we: [5, 6] },
  "Asia/Kuwait": { fr: "Koweït", en: "Kuwait City", ar: "الكويت", lat: 29.37, lon: 47.98, we: [5, 6] },
  "Asia/Bahrain": { fr: "Manama", en: "Manama", ar: "المنامة", lat: 26.23, lon: 50.59, we: [5, 6] },
  "Asia/Muscat": { fr: "Mascate", en: "Muscat", ar: "مسقط", lat: 23.59, lon: 58.41, we: [5, 6] }
};
function jrVille() {
  let tz = "";
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
  return JR_VILLES[tz] || JR_VILLES["Asia/Qatar"];
}
const jrNomVille = v => v[S.lang] || v.fr;
const jrAuj = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const jrIlYa = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

// Tenue du jour : rangée avec sa date ; une tenue d'un autre jour est ignorée.
let JR = { d: "", occ: "", look: null, porte: 0, vus: [] };
try {
  const j = JSON.parse(localStorage.getItem("monstyle_jour") || "null");
  if (j && j.d === jrAuj() && j.look && Array.isArray(j.look.pieces)) {
    JR = { d: j.d, occ: String(j.occ || ""), porte: j.porte ? 1 : 0, vus: Array.isArray(j.vus) ? j.vus.map(String).slice(-6) : [],
      look: { titre: String(j.look.titre || ""), pieces: j.look.pieces.map(String), conseil: String(j.look.conseil || ""), manque: String(j.look.manque || "") } };
  }
} catch (e) {}
function jrSave() { try { localStorage.setItem("monstyle_jour", JSON.stringify(JR)); } catch (e) {} }

// Occasion proposée par défaut : week-end les jours de week-end du pays, sinon bureau si elle l'a choisi, sinon quotidien.
function jrOccDefaut() {
  const v = jrVille(), wd = new Date().getDay();
  if (v.we.includes(wd)) return "weekend";
  const pf = typeof PF !== "undefined" ? PF.occasions || [] : [];
  return pf.includes("Travail") || pf.includes("Réunions") ? "travail" : "quotidien";
}
const jrOcc = () => GR_OCC.some(o => o[0] === S.jrOcc) ? S.jrOcc : (JR.d === jrAuj() && JR.occ) || jrOccDefaut();

// Météo du jour (cache d'une journée). Ne bloque jamais : sans météo, Diva choisit quand même.
let JR_METEO = null;
try { const m = JSON.parse(localStorage.getItem("monstyle_meteo") || "null"); if (m && m.d === jrAuj() && typeof m.t === "number") JR_METEO = m; } catch (e) {}
let jrMeteoEnCours = false;
async function jrMeteo() {
  if (JR_METEO || jrMeteoEnCours) return JR_METEO;
  jrMeteoEnCours = true;
  try {
    const v = jrVille();
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${v.lat}&longitude=${v.lon}&current=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`);
    const j = await r.json();
    const t = j && j.current && j.current.temperature_2m;
    if (typeof t === "number") {
      JR_METEO = { d: jrAuj(), t: Math.round(t), max: Math.round(j.daily.temperature_2m_max[0]), min: Math.round(j.daily.temperature_2m_min[0]) };
      try { localStorage.setItem("monstyle_meteo", JSON.stringify(JR_METEO)); } catch (e) {}
      if (S && (S.page === "jour" || S.page === "home")) { const y = window.scrollY; render(false); window.scrollTo(0, y); }
    }
  } catch (e) {}
  jrMeteoEnCours = false;
  return JR_METEO;
}
const jrMeteoTxt = () => { const v = jrVille(); return JR_METEO ? `${jrNomVille(v)} · \u2066${JR_METEO.t} °C\u2069` : jrNomVille(v); };

// Pièces portées ces 3 derniers jours (sauf aujourd'hui) : Diva les évite si elle peut.
function jrRecentes() {
  const lim = jrIlYa(3), auj = jrAuj();
  return GR.items.filter(x => Array.isArray(x.w) && x.w.some(d => d >= lim && d < auj));
}

// v176 (Imen : « ليش هحقله حط 7 ملابس ؟ ») : une tenue dès qu'il y a de quoi en faire une
// (un haut + un bas, ou une robe/abaya + une autre pièce), sans attendre GR_MIN pièces.
function jrPret() { try { const c = grCount(); return grReady() || (c.tot >= 2 && c.hauts >= 1 && c.bas >= 1); } catch (e) { return false; } }

const JR_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
async function jrChoisir(autre) {
  if (typeof isVip === "function" && !isVip()) return paywall("garde");
  if (!jrPret() || S.jrBusy) return;
  const occ = jrOcc(), o = GR_OCC.find(x => x[0] === occ);
  const sm = await getSample();
  if (!sm || !sm.json) { toast("La création de tenues n’est pas disponible ici."); return; }
  S.jrBusy = 1; S.jrErr = ""; render(false); say("Je choisis ta tenue, une seconde.");
  await jrMeteo();
  const v = jrVille(), rec = jrRecentes();
  const deja = autre && JR.look ? [...JR.vus, JR.look.pieces.join("+")] : [];
  const meteo = JR_METEO ? `Météo à ${v.fr} aujourd’hui : ${JR_METEO.t} °C maintenant (de ${JR_METEO.min} à ${JR_METEO.max} °C). Adapte les matières et les couches à cette température, et pense à la climatisation forte à l’intérieur (une veste légère si besoin).` : `Climat du Golfe (${v.fr}) : chaleur dehors, climatisation forte à l’intérieur.`;
  const pr = REF_TENUE + " Tu es styliste personnelle. Choisis UNE seule tenue pour aujourd’hui (" + JR_JOURS[new Date().getDay()] + "), occasion « " + o[1] + " » (" + o[2] + ")." + (typeof golfeRegle === "function" ? golfeRegle(occ) : "") + " " + meteo +
    (rec.length ? " Évite si possible ces pièces, portées ces 3 derniers jours : " + rec.map(x => x.id).join(", ") + "." : "") +
    (deja.length ? " Propose une tenue différente de celles-ci (change au moins deux pièces) : " + deja.join(" ; ") + "." : "") +
    " Utilise UNIQUEMENT les pièces de sa garde-robe ci-dessous (leurs identifiants) : un haut et un bas, ou une robe, ou une abaya (avec ce qu’on porte dessous si elle l’a), plus si possible chaussures, sac ou accessoire. Respecte son profil : " + (PROFIL() || "inconnu") + ". " + (typeof pfRules === "function" ? pfRules() : "") +
    " N’invente aucune pièce, aucune marque, aucun prix. Le conseil tient en UNE phrase courte : pourquoi cette tenue lui va aujourd’hui. Si une pièce manque vraiment, mets-la dans « manque » (achat facultatif), sinon laisse vide.\nGarde-robe :\n" + grItemsTxt() + "\n" + FMT +
    'Format : {"titre":"2 à 4 mots","pieces":["id"],"conseil":"1 phrase courte","manque":"pièce à acheter, ou vide"}';
  try {
    const r = await sm.json(pr);
    if (r && r.erreur) throw new Error(r.erreur);
    const ids = new Set(GR.items.map(x => x.id)), pc = ((r && r.pieces) || []).map(String).filter(x => ids.has(x));
    if (pc.length < 2) throw new Error("Je n’ai pas réussi à composer de tenue. Ajoute quelques pièces et réessaie.");
    JR = { d: jrAuj(), occ, porte: 0, vus: deja.slice(-6), look: { titre: String(r.titre || "Tenue du jour").slice(0, 60), pieces: pc, conseil: String(r.conseil || ""), manque: String(r.manque || "") } };
    jrSave(); S.jrBusy = 0;
    if (S.page === "jour") { render(false); say(JR.look.titre + ". " + JR.look.conseil); }
  } catch (e) {
    S.jrBusy = 0; S.jrErr = errMsg(e);
    if (S.page === "jour") { render(false); say(S.jrErr); }
  }
}

// « Je la porte aujourd'hui » : la date est notée sur chaque pièce (une fois par jour).
function jrPorter() {
  if (!JR.look || JR.porte) return;
  const auj = jrAuj();
  JR.look.pieces.forEach(id => { const x = GR.items.find(i => i.id === id); if (!x) return; x.w = (Array.isArray(x.w) ? x.w : []).filter(d => d !== auj); x.w.push(auj); x.w = x.w.slice(-120); });
  grSave(); JR.porte = 1; jrSave();
  const y = window.scrollY; render(false); window.scrollTo(0, y);
  say("Bonne journée " + NOM + ", tu vas être superbe.");
}

P.jour = () => {
  jrMeteo();
  const occ = jrOcc(), by = id => GR.items.find(x => x.id === id);
  const head = `<p class="step">Chaque jour</p><h1>Que porter aujourd’hui ?</h1>
  <p class="jr-meteo"><span aria-hidden="true">☀️</span><span data-noi18n>${esc(jrMeteoTxt())}</span></p>`;
  if (!jrPret()) return { back: true,
    html: head + `<div class="hr-card hr-step"><span class="hr-lab">Prochaine étape</span><b>Ajoute d’abord tes vêtements</b><small>${GR.items.length ? "Ajoute un haut et un bas, ou une robe, et je compose ta tenue." : "Ajoute quelques vêtements, et chaque matin je choisis une tenue pour toi selon la météo et ton programme."}</small></div>`,
    say: "Ajoute d’abord tes vêtements, et chaque matin je choisis ta tenue.",
    foot: `<button class="btn" data-go="garde">Ouvrir ma garde-robe</button>` };
  const chips = `<h2 class="jr-h">Ton occasion du jour</h2><div class="jr-occ">${grOccs().map(o => `<button data-jocc="${o[0]}" aria-pressed="${o[0] === occ}"><span aria-hidden="true">${o[4]}</span>${o[1]}</button>`).join("")}</div>`;
  const l = JR.d === jrAuj() && JR.occ === occ ? JR.look : null;
  let body = "";
  if (S.jrBusy) body = `<div class="note">Je choisis ta tenue…</div>`;
  else if (S.jrErr) body = `<div class="note">${esc(S.jrErr)}</div>`;
  if (l && !S.jrBusy) {
    const it = l.pieces.map(by).filter(Boolean);
    body += `<section class="jr-look"><span class="hr-lab">Ta tenue d’aujourd’hui</span><b class="jr-t">${esc(l.titre)}</b>
     <div class="jr-ph">${it.map(x => `<figure>${grImg(x)}<figcaption>${esc(x.nom || grCat(x.cat))}</figcaption></figure>`).join("")}</div>
     ${l.conseil ? `<p class="jr-c">${esc(l.conseil)}</p>` : ""}
     ${l.manque ? `<p class="jr-m">À ajouter un jour : ${esc(l.manque)}</p>` : ""}
     <div class="jr-acts">${JR.porte ? `<span class="jr-ok">Portée aujourd’hui ✓</span>` : `<button class="btn" data-jporte>Je la porte aujourd’hui</button>`}
     <button class="btn ghost" data-jautre>Autre idée</button></div></section>`;
  }
  const plus = grReady() ? "" : `<button class="link jr-plus" data-go="garde">Ajoute d’autres pièces pour plus d’idées ›</button>`;
  return { back: true, html: head + chips + body + plus,
    say: l ? "" : "Dis-moi ton occasion du jour, et je choisis ta tenue.",
    foot: l || S.jrBusy ? "" : `<button class="btn" data-jgo>Choisis ma tenue</button>` };
};
if (typeof DOCK_OF !== "undefined") DOCK_OF.jour = "home";

addEventListener("click", e => {
  const t = e.target.closest("[data-jocc],[data-jgo],[data-jautre],[data-jporte]");
  if (!t) return;
  if (t.dataset.jocc) { S.jrOcc = t.dataset.jocc; S.jrErr = ""; const y = window.scrollY; render(false); window.scrollTo(0, y); return; }
  if (t.hasAttribute("data-jgo")) return jrChoisir(false);
  if (t.hasAttribute("data-jautre")) return jrChoisir(true);
  if (t.hasAttribute("data-jporte")) return jrPorter();
});

// Accueil « Pour toi aujourd'hui » : la carte du jour remplace la suggestion dès que la garde-robe est prête.
if (typeof homeReco === "function") {
  const homeRecoAvant = homeReco;
  homeReco = function (nd) {
    if (!grReady()) return homeRecoAvant(nd);
    jrMeteo();
    const l = JR.d === jrAuj() ? JR.look : null;
    if (!l) {
      // Une tenue déjà planifiée pour aujourd'hui (semaine) reste prioritaire, comme avant.
      const planifiee = GR.saved.some(t => t.jour === GR_JOURS[(new Date().getDay() + 6) % 7]);
      if (planifiee) return homeRecoAvant(nd);
      // Sinon : la carte du jour, puis la tenue déjà créée (si elle existe), qu'on ne cache pas.
      const avant = homeRecoAvant(nd), carte = `<button class="hr-card jr-home" data-view="jour"><span class="hr-lab">Chaque jour</span><b>Que porter aujourd’hui ?</b><small>Une tenue avec tes vêtements, selon la météo</small><em><span data-noi18n>${esc(jrMeteoTxt())}</span> ›</em></button>`;
      return /hr-step/.test(avant) ? carte : carte + avant;
    }
    // Pas de photo de vêtements sur l'accueil (choix d'Imen, v109) : seulement le titre et le conseil.
    return `<button class="hr-card jr-home" data-view="jour"><span class="hr-lab">Ta tenue d’aujourd’hui</span><b>${esc(l.titre)}</b>
     ${l.conseil ? `<small>${esc(l.conseil)}</small>` : ""}<em>${JR.porte ? "Portée aujourd’hui ✓" : "Voir ma tenue"} ›</em></button>`;
  };
}

(function jrCSS() {
  const st = document.createElement("style");
  st.textContent = `
.jr-meteo{display:inline-flex;align-items:center;gap:8px;margin:4px 0 14px;padding:6px 14px;border-radius:999px;background:var(--surface);color:var(--ink);font-size:.9rem;box-shadow:0 2px 8px rgba(140,109,53,.12)}
.jr-h{font-size:1rem;margin:6px 0 10px}
.jr-occ{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.jr-occ button{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);font:inherit;font-size:.88rem;cursor:pointer}
.jr-occ button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent);color:#fff}
.jr-look{display:flex;flex-direction:column;gap:10px;padding:16px;border-radius:16px;background:var(--surface);box-shadow:0 2px 10px rgba(140,109,53,.12)}
.jr-t{font-size:1.2rem}
.jr-ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px}
.jr-ph figure{margin:0;display:flex;flex-direction:column;gap:4px}
.jr-ph img,.jr-ph .gr-ph{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:12px;background:var(--soft);display:block}
.jr-ph figcaption{font-size:.75rem;color:var(--muted);line-height:1.2}
.jr-c{margin:0;font-size:.95rem;line-height:1.45}
.jr-m{margin:0;font-size:.85rem;color:var(--muted)}
.jr-acts{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.jr-acts .btn{flex:1 1 140px}
.jr-ok{flex:1 1 140px;text-align:center;padding:12px;border-radius:999px;background:var(--soft);color:var(--accent);font-weight:600}
.jr-home em{display:inline-flex;gap:4px}
.jr-home+.hr-card{margin-top:12px}
`;
  document.head.appendChild(st);
})();
