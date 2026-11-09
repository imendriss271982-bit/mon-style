/* Diva Divina — Accueil v177 (audit de design, validé par Imen le 8 novembre 2026 : « je ne veux pas une home page entassée, facile à utiliser ») :
   5 blocs au lieu de 9, rien n'est supprimé de l'app.
     1. Salutation + météo + Diva (la recherche quitte l'accueil ; le globe de langue est caché sur l'accueil, la langue se change dans le Profil)
     2. UNE grande carte qui change : analyse pas finie → « Découvre ton style » (3 étapes) ; analyse finie → « Ma tenue du jour »
     3. My Stylist « Appeler Diva » (bat comme un cœur)
     4. 3 raccourcis ronds : Outfit check, Ma garde-robe, Créer une tenue
     5. Abaya et occasions du Golfe (v179, carte large, très importante pour Imen)
     6. En descendant : Style Twin et Zifafi Wedding côte à côte (Zifafi toujours visible)
   « Tout Diva Divina » est retiré de l'accueil : Boutique, Beauté, Majlis restent dans la barre du bas et les pages.
   Accueil v176 : carte du jour selon la garde-robe (plus de « Ajoute 7 pièces » quand il y a des vêtements ; la tenue avec ses pièces, « Je la porte » et « Autre idée »).
   Accueil v175 : plus de question en double (météo en haut près de Diva, la question seulement dans la carte du jour).
   Accueil v174 (ordre voulu par Imen, 7 novembre 2026).
   « المجلس حنشيلها من فوق نخليها بس تحت » : la bande du Majlis disparaît du haut de l'accueil (l'onglet Majlis de la barre du bas reste).
   Ordre : salutation + Diva → (cartes d'avis : invitation / message du Majlis, réponse de la styliste, nouveauté)
           1. Que porter aujourd'hui ?  2. Your Style Twin  3. My Stylist (« Appeler Diva » qui bat comme un cœur)
           4. Outfit check  5. Ma garde-robe + Créer une tenue  6. Zifafi Wedding
           puis « Tout Diva Divina » (3 portes : rien n'est perdu) et Inspirations du jour tout en bas.
   Chargé en DERNIER (après aura-majlis.js et aura-chatlook.js) : enveloppe P.home après toutes les autres.
   Arrêter : localStorage.monstyle_accueil = "0" (posé aussi par les tests des anciens accueils). */
const ACC_ON = (() => { try { return localStorage.getItem("monstyle_accueil") !== "0" && localStorage.getItem("monstyle_portes") !== "0"; } catch (e) { return true; } })();

// 1. Que porter aujourd'hui ? — toujours visible, même si la garde-robe n'est pas prête.
// v175 (Imen, 8 novembre 2026) : le titre n'est plus répété. La météo monte près de Diva (en haut),
// la carte garde LA question + un conseil selon la température + une action claire.
function acTemp() { try { return typeof JR_METEO !== "undefined" && JR_METEO && typeof JR_METEO.t === "number" ? JR_METEO.t : null; } catch (e) { return null; } }
function acConseil(pret) {
  const t = acTemp();
  if (t == null) return pret ? "Une tenue avec tes vêtements, selon la météo" : "Chaque matin, je choisis ta tenue avec tes vêtements";
  if (t >= 30) return "Il fait chaud : matières légères et couleurs claires";
  if (t >= 22) return "Temps doux : une couche légère pour le soir";
  return "Il fait frais : pense à une veste";
}
function acJour() {
  // v176 (Imen, 8 novembre 2026 : « الواردروب فيها لبس، ليش هحقله حط 7 ملابس ؟ ») : la carte change selon la garde-robe.
  //  0 pièce → « Ajoute tes premières pièces » ; pas encore de quoi faire une tenue → « Ajouter mes vêtements » ;
  //  de quoi faire une tenue → « Choisis ma tenue » (+ petit lien si moins de GR_MIN pièces) ;
  //  tenue choisie → la tenue avec ses pièces, « Je la porte ✓ » et « Autre idée ↻ ». Plus jamais « Ajoute 7 pièces » quand il y a des vêtements.
  let l = null, pret = false, plein = false, n = 0;
  try { if (typeof jrMeteo === "function") jrMeteo(); } catch (e) {}
  try { l = typeof JR !== "undefined" && typeof jrAuj === "function" && JR.d === jrAuj() ? JR.look : null; } catch (e) {}
  try { pret = typeof jrPret === "function" ? jrPret() : grReady(); } catch (e) {}
  try { plein = grReady(); } catch (e) {}
  try { n = grCount().tot; } catch (e) {}
  if (l && l.titre) {
    const by = id => GR.items.find(x => x.id === id), it = (l.pieces || []).map(by).filter(Boolean).slice(0, 4);
    const porte = typeof JR !== "undefined" && JR.porte;
    return `<div class="hr-card jr-home ac-jour ac-pret" data-go="jour"><span class="hr-lab">Ma tenue du jour</span><b>${esc(l.titre)}</b>
     ${it.length ? `<span class="ac-ph" style="--n:${it.length}">${it.map(x => `<span>${grImg(x)}</span>`).join("")}</span>` : ""}
     ${l.conseil ? `<small>${esc(l.conseil)}</small>` : ""}
     <span class="ac-2">${porte ? `<span class="ac-ok">Portée aujourd’hui ✓</span>` : `<button class="ac-cta" data-jporte>Je la porte ✓</button>`}<button class="ac-sec" data-acshuf>Autre idée ↻</button></span></div>`;
  }
  const cta = pret ? `<button class="ac-cta" data-acgo>Choisis ma tenue ›</button>`
    : `<button class="ac-cta" data-go="garde">${n ? "Ajouter mes vêtements ›" : "Ajoute tes premières pièces ›"}</button>`;
  const txt = pret ? acConseil(true) : n ? "Ajoute un haut et un bas, ou une robe, et je compose ta tenue" : acConseil(false);
  return `<div class="hr-card jr-home ac-jour" data-go="jour"><span class="hr-lab">Ma tenue du jour</span><b>Que porter aujourd’hui ?</b>
   <small>${txt}</small>${cta}${pret && !plein ? `<button class="ac-plus" data-go="garde">Ajoute d’autres pièces pour plus d’idées ›</button>` : ""}</div>`;
}

// « Choisis ma tenue » / « Autre idée » depuis l'accueil : on ouvre la page du jour et Diva compose tout de suite.
addEventListener("click", e => {
  const t = e.target.closest("[data-acgo],[data-acshuf]");
  if (!t || typeof jrChoisir !== "function") return;
  e.stopPropagation();
  S.flow = null; go("jour"); jrChoisir(t.hasAttribute("data-acshuf"));
}, true);

// En haut, près de Diva : la météo à la place de « Qu'est-ce qu'on porte aujourd'hui ? » (la question est dans la carte).
const AC_SOLEIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>';
function acMeteoHaut() {
  let met = "";
  // v200 (Imen, 9 novembre 2026 : « tu as enlevé la température ») : la météo est chargée sur l'accueil pour TOUTES les clientes,
  // pas seulement quand l'analyse est finie (avant, seule la ville s'affichait sans les °C).
  try { if (typeof jrMeteo === "function") jrMeteo(); } catch (e) {}
  try { met = typeof jrMeteoTxt === "function" ? jrMeteoTxt() : ""; } catch (e) {}
  // v200 : le choix de la langue revient sur l'accueil, en pastille à côté de la météo (dans l'en-tête, le globe chevauchait le logo DD).
  let lc = "FR";
  try { lc = (typeof LGC !== "undefined" && LGC[S.lang || "fr"]) || lc; } catch (e) {}
  const lg = `<button type="button" class="ac-lg" data-lgmenu aria-label="Langue" aria-haspopup="true"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg><b class="lgc" data-noi18n>${esc(lc)}</b></button>`;
  return `<div class="ac-pills">${met ? `<p class="ac-met">${AC_SOLEIL}<span data-noi18n>${esc(met)}</span></p>` : ""}${lg}</div>`;
}

// 4. Outfit check
function acOutfit() {
  const oc = typeof ok === "function" ? ok("outfit") : null;
  const cam = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/></svg>';
  return `<button class="hx-oc2 ac-oc" data-go="o_photo"><span class="hx-oc2-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6a2 2 0 1 1 2 2c-1 0-2 .7-2 1.6v.4l8.5 6.2c.8.6.4 1.8-.6 1.8H4.1c-1 0-1.4-1.2-.6-1.8L12 10"/></svg></span>
  <span class="hx-oc2-t"><small>Chaque jour</small><b>Outfit check</b><em>${oc ? `Dernière note : ${esc(String(oc.note))}/10` : "Une note et les changements à faire"}</em></span><span class="hx-oc2-c">${cam}</span></button>`;
}

// 5. Ma garde-robe + Créer une tenue (garde-robe en premier, comme Imen l'a dit)
function acActs() {
  let n = 0; try { n = grCount().tot; } catch (e) {}
  const cintre = typeof GR_HANGER !== "undefined" ? GR_HANGER : "";
  return `<div class="hz-acts ac-acts">
  <button data-go="garde"><span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M9.5 11v2M14.5 11v2"/></svg></span><b>Ma garde-robe</b><small>${n ? n + " article" + (n > 1 ? "s" : "") : "À remplir"}</small></button>
  <button data-go="tenues"><span aria-hidden="true">${cintre}</span><b>Créer une tenue</b><small>Avec tes vêtements</small></button>
 </div>`;
}

// « Tout Diva Divina » : les 3 portes (Mon style, M'habiller, Acheter) pour garder l'accès à tout le reste. Zifafi a déjà sa carte.
function acPortes() {
  if (typeof PORTES === "undefined" || !PORTES || typeof ptPortes !== "function" || typeof PT_IC === "undefined") return "";
  const P4 = ptPortes();
  return `<section class="pt-sec ac-tout"><h2 class="hz-h">Tout Diva Divina</h2><div class="pt-grid ac-grid">${["style", "habiller", "acheter"].map(k => {
    const p = P4[k];
    return `<button class="pt-door" data-porte="${k}"><span class="pt-di"><svg viewBox="0 0 24 24" aria-hidden="true">${PT_IC[k]}</svg></span><b>${p.t}</b><small>${p.s}</small></button>`;
  }).join("")}</div></section>`;
}


// v177 — 2. La grande carte : l'analyse d'abord (une seule fois), ensuite la tenue du jour.
function acNd() { try { return [ok("visage"), ok("corps"), season()].filter(Boolean).length; } catch (e) { return 3; } }
function acAnalyse(nd) {
  let v = null, bd = null, c = null;
  try { v = ok("visage"); bd = ok("corps"); c = season(); } catch (e) {}
  return `<div class="hx-an ac-an"><span class="hr-lab">Ton analyse de style</span><b>${nd ? "Termine ton analyse de style" : "Découvre ton style"}</b><small>3 étapes, une seule fois : ensuite mes conseils sont faits pour toi.</small>
   <ol class="hx-an-s">${[["Visage", v], ["Silhouette", bd], ["Couleurs", c]].map((x, i) => `<li class="${x[1] ? "ok" : ""}"><i aria-hidden="true">${x[1] ? "✓" : i + 1}</i><span>${x[0]}</span></li>`).join("")}</ol>
   <button class="ac-cta" data-onb>${nd ? "Continuer mon analyse" : "Commencer mon analyse"}<span aria-hidden="true">&nbsp;›</span></button></div>`;
}
function acHero() { const nd = acNd(); return nd < 3 ? acAnalyse(nd) : acJour(); }

// v177 — 4. Trois raccourcis ronds.
function acRonds() {
  let n = 0; try { n = grCount().tot; } catch (e) {}
  const cam = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/></svg>';
  const armoire = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M9.5 11v2M14.5 11v2"/></svg>';
  const cintre = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6a2 2 0 1 1 2 2c-1 0-2 .7-2 1.6v.4l8.5 6.2c.8.6.4 1.8-.6 1.8H4.1c-1 0-1.4-1.2-.6-1.8L12 10"/></svg>';
  const r = (go, ic, t, sub) => `<button class="ac-rd" data-go="${go}"><span class="ac-rd-i">${ic}</span><b>${t}</b><small>${sub}</small></button>`;
  return `<nav class="ac-ronds" aria-label="Raccourcis">
  ${r("o_photo", cam, "Outfit check", "Chaque jour")}
  ${r("garde", armoire, "Ma garde-robe", n ? n + " article" + (n > 1 ? "s" : "") : "À remplir")}
  ${r("tenues", cintre, "Créer une tenue", "Avec tes vêtements")}
 </nav>`;
}


// v179 (Imen : « العباية والإيفنت… العيد والغبقة وحاجات الخليج انشالت، وهو كثير مهم ») : la carte Abaya & occasions du Golfe revient, bien visible, juste sous les raccourcis.
function acGolfe() {
  if (typeof P.golfe !== "function") return "";
  const lune = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M17 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/></svg>';
  return `<button class="ac-golfe" data-view="golfe"><span class="ac-golfe-i">${lune}</span>
  <span class="ac-golfe-t"><small>Golfe</small><b>Abaya et occasions</b><em>Ton abaya, ta sheila et les codes des mariages, du Ramadan et de l’Aïd.</em></span><span class="hx-chev" aria-hidden="true">›</span></button>`;
}
// v177 — 5. Style Twin et Zifafi Wedding côte à côte (petites cartes).
function acDuo() {
  let pct = 0; try { pct = typeof twinPct === "function" ? twinPct() : 0; } catch (e) {}
  const ring = typeof twinRing === "function" ? twinRing(pct, 18) : "";
  const twin = typeof twinCard === "function" ? `<button class="ac-duo-c" data-view="twin" aria-label="Your Style Twin"><span class="ac-duo-ring">${ring}<b>${pct}%</b></span><b data-noi18n>Your Style Twin</b><small>Ta copie de style</small></button>` : "";
  const bague = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="15" r="6"/><path d="M9.5 9.5 8 5.5l2-2h4l2 2-1.5 4"/></svg>';
  const zf = typeof zfHomeCards === "function" ? `<button class="ac-duo-c ac-zf" data-go="zf"><span class="ac-duo-ic">${bague}</span><b><span data-noi18n>Zifafi</span> Wedding</b><small>Ton style de mariée, guidé par Diva.</small></button>` : "";
  return twin || zf ? `<div class="ac-duo">${twin}${zf}</div>` : "";
}

if (ACC_ON && typeof P.home === "function") {
  const acHomeAvant = P.home;
  P.home = (...a) => {
    const o = acHomeAvant(...a);
    if (!o || typeof o.html !== "string") return o;
    const t = document.createElement("template");
    t.innerHTML = o.html;
    const hx = t.content.querySelector(".hx");
    if (!hx) return o;
    const pick = s => hx.querySelector(s);
    const top = pick(".hz-top"), st = pick(".hz-st"), insp = pick(".hz-insp");
    // Cartes qui n'apparaissent que quand il y a quelque chose à lire (la bande fixe du Majlis .mj-bar est retirée).
    // (Le Majlis met ses cartes avant tout l'accueil, hors de .hx : on les cherche dans toute la page.)
    const avis = [".mj-invite", ".mj-msg", ".vf-home", ".fx-new"].map(s => t.content.querySelector(s)).filter(Boolean);
    t.content.querySelectorAll(".mj-bar").forEach(x => x.remove());
    if (st) st.classList.add("ac-st");
    const q = top && top.querySelector(".hz-hi > p");
    if (q) { const m = acMeteoHaut(); if (m) q.outerHTML = m; else q.remove(); }
    if (top) top.querySelectorAll(".hz-q").forEach(x => x.remove());
    // v187 (Imen, 8 novembre 2026 : « Enlève mon visage de home ») : plus de photo de Diva en haut de l'accueil.
    if (top) top.querySelectorAll(".hz-ava").forEach(x => x.remove());
    const neuf = document.createElement("template");
    neuf.innerHTML = `${acHero()}
<span class="ac-stp"></span>
${acRonds()}
${acGolfe()}
${acDuo()}`;
    const place = neuf.content.querySelector(".ac-stp");
    if (st) place.replaceWith(st); else place.remove();
    hx.replaceChildren(...[top, ...avis].filter(Boolean), ...neuf.content.childNodes, ...(insp ? [insp] : []));
    o.html = t.innerHTML;
    return o;
  };

  const st = document.createElement("style");
  st.textContent = `
.hz .ac-jour{margin-top:16px}
.hz .ac-jour b{font-size:19px}
.hz .ac-jour small{display:block;margin-top:4px}
.hz .ac-jour{cursor:pointer}
.hz .ac-jour .ac-cta{display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;min-height:44px;margin-top:12px;padding:9px 18px;border:0;border-radius:999px;background:var(--goldg,linear-gradient(135deg,#8C6D35,#7A5E2C 55%,#6E5428));color:#fff;font:inherit;font-weight:600;font-size:14px;box-shadow:0 4px 12px rgba(140,109,53,.25);cursor:pointer}
.hz .ac-jour .ac-sec{display:inline-flex;align-items:center;justify-content:center;min-height:44px;margin-top:12px;padding:9px 16px;border-radius:999px;border:1.5px solid #C9A063;background:#fff;color:var(--accent,#8C6D35);font:inherit;font-weight:600;font-size:14px;cursor:pointer}
.hz .ac-jour .ac-2{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.hz .ac-jour .ac-2 .ac-cta{flex:1 1 140px}
.hz .ac-jour .ac-ok{margin-top:12px;color:var(--accent,#8C6D35);font-weight:600;font-size:14px;flex:1 1 140px}
.hz .ac-jour .ac-plus{display:block;margin-top:8px;padding:6px 0;border:0;background:none;color:var(--accent,#8C6D35);font:inherit;font-size:13px;text-decoration:underline;text-underline-offset:3px;cursor:pointer;text-align:start}
.hz .ac-jour .ac-ph{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:8px;margin-top:12px;max-width:calc(var(--n) * 110px)}
.hz .ac-jour .ac-ph>span{aspect-ratio:1;border-radius:14px;background:#F5F1EB;overflow:hidden;display:flex;align-items:center;justify-content:center}
.hz .ac-jour .ac-ph img{width:100%;height:100%;object-fit:contain}
.hz .ac-jour .ac-ph svg{max-width:70%;max-height:70%}
.hz .hz-top{min-height:0;margin-bottom:0;align-items:flex-start}
.hz .hz-hi{padding-bottom:0}
.hz .hz-top:before{display:none}
body.pg-home header .lgbtn{display:none}
body.pg-home header #voice{margin-inline-start:auto}
.hz .ac-pills{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0 14px}
.hz .ac-pills .ac-met{margin:0;min-height:44px;padding:6px 14px}
.hz .ac-lg{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,.75);border:1px solid #E6D6B8;color:var(--accent,#8C6D35);font:inherit;font-weight:700;font-size:15px;cursor:pointer;touch-action:pan-y}
.hz .ac-lg svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.6}
.hz .ac-met{display:inline-flex;align-items:center;gap:6px;margin:8px 0 14px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.75);border:1px solid #E6D6B8;color:var(--accent,#8C6D35);font-weight:600;font-size:15px}
.hz .ac-met svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
.hz .tw-card{margin-top:14px}
.hz .ac-st{margin-top:14px}
.hz .ac-oc{margin-top:14px}
.hz .ac-acts{margin-top:14px}
.hz .zf-uni{margin-top:14px}
.hz .ac-tout{margin-top:22px}
/* v177 : accueil aéré */


.hz .hx-an.ac-an{margin:16px 0 0}
.hz .ac-an .ac-cta{align-self:stretch}
.hz .ac-an .ac-cta{display:inline-flex;align-items:center;justify-content:center;min-height:48px;margin-top:6px;padding:10px 18px;border:0;border-radius:999px;background:var(--goldg);color:#fff;font:inherit;font-weight:600;font-size:15px;box-shadow:0 4px 12px rgba(140,109,53,.25);cursor:pointer}
.hz .ac-ronds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:22px}
.hz .ac-rd{display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 2px;border:0;background:none;font:inherit;color:var(--ink);cursor:pointer;text-align:center;min-height:44px}
.hz .ac-rd-i{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:radial-gradient(circle at 35% 28%,#FFFFFF 0%,#FBF8F3 45%,#EFE6D8 100%);border:1px solid #E6DACA;box-shadow:inset 0 2px 2px rgba(255,255,255,.95),inset 0 -5px 9px rgba(140,109,53,.16),0 3px 0 #E2D4BF,0 10px 18px rgba(42,36,32,.12);color:var(--accent,#8C6D35);transition:transform .12s,box-shadow .12s}
.hz .ac-rd:active .ac-rd-i{transform:translateY(2px);box-shadow:inset 0 2px 2px rgba(255,255,255,.9),inset 0 -3px 6px rgba(140,109,53,.16),0 1px 0 #E2D4BF,0 4px 8px rgba(42,36,32,.1)}
.hz .ac-rd-i svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.hz .ac-rd b{font-size:14px;font-weight:600;line-height:1.25}
.hz .ac-rd small{font-size:12.5px;color:#6B625A;line-height:1.2}
.hz .ac-golfe{display:flex;align-items:center;gap:14px;width:100%;margin-top:24px;padding:16px;border-radius:20px;background:#FFFFFF;border:1px solid #EAE3D8;box-shadow:0 4px 16px rgba(42,36,32,.06);font:inherit;color:var(--ink);text-align:start;cursor:pointer;min-height:88px}
.hz .ac-golfe-i{flex:none;display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:radial-gradient(circle at 35% 28%,#FFFFFF 0%,#FBF8F3 45%,#EFE6D8 100%);border:1px solid #E6DACA;box-shadow:inset 0 2px 2px rgba(255,255,255,.95),inset 0 -5px 9px rgba(140,109,53,.16),0 3px 0 #E2D4BF;color:var(--accent,#8C6D35)}
.hz .ac-golfe-i svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round}
.hz .ac-golfe-t{flex:1;display:flex;flex-direction:column;gap:2px;min-width:0}
.hz .ac-golfe-t small{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent,#8C6D35);font-weight:600}
.hz .ac-golfe-t b{font-size:16px;font-weight:600}
.hz .ac-golfe-t em{font-style:normal;font-size:13px;color:#6B625A;line-height:1.4}
.hz .ac-duo{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
.hz .ac-duo-c{display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:16px;border-radius:20px;background:#FFFFFF;border:1px solid #EAE3D8;box-shadow:0 4px 16px rgba(42,36,32,.06);font:inherit;color:var(--ink);text-align:start;cursor:pointer;min-height:132px}
.hz .ac-duo-c>b{font-size:15px;font-weight:600;line-height:1.25;margin-top:6px}
.hz .ac-duo-c small{font-size:12.5px;color:#6B625A;line-height:1.35}
.hz .ac-duo-ring{position:relative;display:grid;place-items:center;width:44px;height:44px}
.hz .ac-duo-ring svg{position:absolute;inset:0;width:44px;height:44px}
.hz .ac-duo-ring b{font-size:11px;color:var(--accent,#8C6D35)}
.hz .ac-duo-ic{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:#F3E7DC;color:var(--accent,#8C6D35)}
.hz .ac-duo-ic svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
/* v178 : boutons dorés de l'accueil bombés, comme « Appeler Diva » */
.hz .ac-cta{position:relative;isolation:isolate;overflow:hidden;background:linear-gradient(180deg,#C4A05C 0%,#96753A 40%,#846630 62%,#624922 100%)!important;box-shadow:inset 0 2px 1px rgba(255,255,255,.75),inset 0 -6px 10px rgba(70,48,14,.45),0 3px 0 #5E4520,0 10px 20px rgba(94,69,32,.35)!important;text-shadow:0 1px 2px rgba(70,46,12,.55);transition:transform .12s}
.hz .ac-cta::before{content:"";position:absolute;left:8%;right:8%;top:2px;height:52%;border-radius:999px;z-index:-1;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,.2) 70%,rgba(255,255,255,0))}
.hz .ac-cta:active{transform:translateY(2px);box-shadow:inset 0 2px 1px rgba(255,255,255,.6),inset 0 -3px 8px rgba(70,48,14,.45),0 1px 0 #5E4520,0 4px 10px rgba(94,69,32,.3)!important}
/* « Appeler Diva » grossit et rapetisse comme un cœur, avec des ondes dorées, pour qu'on comprenne qu'il faut toucher. */
.hz .ac-st{overflow:visible}
.hz .ac-st .hz-call{animation:acBeat 1.6s ease-in-out infinite!important;overflow:visible}
.hz .ac-st .hz-call svg{animation:acRing 1.6s ease-in-out infinite;transform-origin:50% 50%}
@keyframes acBeat{0%,100%{transform:scale(1);box-shadow:0 6px 16px rgba(140,109,53,.25),0 0 0 0 rgba(140,109,53,.7),0 0 0 0 rgba(140,109,53,.45)}15%{transform:scale(1.07)}30%{transform:scale(1)}45%{transform:scale(1.04)}70%{box-shadow:0 6px 16px rgba(140,109,53,.25),0 0 0 12px rgba(140,109,53,0),0 0 0 22px rgba(140,109,53,0)}}
@keyframes acRing{0%,55%,100%{transform:rotate(0)}5%,15%,25%{transform:rotate(-16deg)}10%,20%,30%{transform:rotate(16deg)}}
@media (prefers-reduced-motion:reduce){.hz .ac-st .hz-call,.hz .ac-st .hz-call svg{animation:none!important}}
@media (min-width:341px){.ac-grid{grid-template-columns:1fr 1fr 1fr}.ac-grid .pt-door{min-height:118px;padding:14px 12px}.ac-grid .pt-door small{font-size:12px}}`;
  document.head.appendChild(st);
}
