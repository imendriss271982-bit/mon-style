/* Diva Divina — Robes de créatrice des maisons partenaires (v215, demandé par Imen le 14 novembre 2026 :
   « pas une seule robe, toutes les robes »).
   Données : partenaires-data.js (BARUNI, chargé juste avant). Lien d'affiliation Awin (éditeur 3154850).
   Le nom de la boutique n'est jamais affiché (règle v137) : « Maison de couture de Dubaï ».
   Grille 2 colonnes, filtres (S.ptnF), 12 robes puis « Voir plus » (S.ptnN). Toucher une robe ouvre sa page chez la maison. */
const AWIN_AFF = "3154850";
const awinLien = (mid, url) => "https://www.awin1.com/cread.php?awinmid=" + mid + "&awinaffid=" + AWIN_AFF + "&ued=" + encodeURIComponent(url);
const PTN_IMG = "https://cdn.shopify.com/s/files/1/0436/0113/3728/files/";
const PTN_FAV = "layan-dress-v-neck-maxi-wedding-guest-dress"; // le coup de cœur de Diva, toujours en premier

const PTN_ROBES = (typeof BARUNI !== "undefined" ? BARUNI : []).map(r => ({
  id: r[0], nom: r[1], type: r[2], prix: r[3], avant: r[4],
  img: (/^https?:/.test(r[5]) ? r[5] : PTN_IMG + r[5]) + "?width=480",
  nc: r[6] ? r[6].split("/").length : 0, manches: !!r[7],
  lien: awinLien("130995", "https://baruni.co/products/" + r[0]),
})).sort((a, b) => (b.id === PTN_FAV) - (a.id === PTN_FAV));

/* v218 (16 novembre 2026, Imen : « ajoute les brands avec logo, le nom exact ») : chaque maison a son en-tête
   avec son logo et son nom exact (remplace la règle v137 « aucun nom de boutique » pour ces deux maisons). */
function ptnMarque(logo, nom, lieu) {
  return `<div class="ptn-mq"><img src="${esc(logo)}" alt="${esc(nom)}" referrerpolicy="no-referrer"><div><b data-noi18n>${esc(nom)}</b><small>${lieu}</small></div></div>`;
}
const PTN_FILTRES = [
  ["", "Tout"],
  ["manches", "Avec manches"],
  ["kaftan", "Kaftans et abaya"],
  ["promo", "Promos"],
];
function ptnListe() {
  const f = S.ptnF || "";
  return PTN_ROBES.filter(r => !f || (f === "manches" && r.manches) || (f === "kaftan" && r.type !== "dress") || (f === "promo" && r.avant > 0));
}
function ptnCarte(r) {
  return `<a class="ptn" href="${esc(r.lien)}" target="_blank" rel="noopener sponsored">
    <span class="ptn-ph"><img src="${esc(r.img)}" alt="${esc(r.nom)}" loading="lazy" referrerpolicy="no-referrer">${r.id === PTN_FAV ? `<span class="ptn-fav">♥︎ Coup de cœur</span>` : r.avant ? `<span class="ptn-fav promo">Promo</span>` : ""}</span>
    <b data-noi18n>${esc(r.nom)}</b>
    <span class="ptn-px" data-noi18n>${r.prix} $${r.avant ? ` <s>${r.avant} $</s>` : ""}</span>
    ${r.nc > 1 ? `<small>${r.nc} couleurs</small>` : ""}</a>`;
}

if (typeof P.boutique === "function") {
  const boutPtn = P.boutique;
  P.boutique = () => {
    const o = boutPtn();
    if (!PTN_ROBES.length) return o;
    const l = ptnListe(), n = S.ptnN || 12;
    const bloc = `${ptnMarque("https://cdn.shopify.com/s/files/1/0436/0113/3728/files/Untitled_design_7.png?v=1734889670&width=340", "BARUNI", "Dubaï · robes, kaftans et abaya")}<p class="sub" style="font-size:14px;margin-top:-2px">Livraison dans tout le Golfe</p>
     <div class="fchips">${PTN_FILTRES.map(c => `<button data-ptnf="${c[0]}" aria-pressed="${(S.ptnF || "") === c[0]}">${c[1]}</button>`).join("")}</div>
     <div class="ptn-g">${l.slice(0, n).map(ptnCarte).join("")}</div>
     ${l.length > n ? `<button class="btn ghost" data-ptnplus style="margin-top:10px">Voir plus de robes</button>` : ""}
     <p class="sub" style="font-size:12.5px">Prix en dollars américains, tels qu’affichés par la maison.</p>`;
    const i = o.html.indexOf('<button class="btn" data-askaura');
    const tout = bloc + scBloc() + elBloc();
    o.html = i >= 0 ? o.html.slice(0, i) + tout + o.html.slice(i) : o.html + tout;
    return o;
  };
}

/* v217 (16 novembre 2026, Imen : lien Awin de The Shirt Company à ajouter) : chemises et robes-chemises d'une maison
   londonienne, annonceur Awin 115010. Données : shirtco-data.js (SHIRTCO). Prix en QAR (vus depuis le Qatar).
   Nom de la maison jamais affiché (règle v137). Filtres S.scF, nombre affiché S.scN. */
const SC_IMG = "https://cdn.shopify.com/s/files/1/0557/5547/2956/";
const SC_ART = (typeof SHIRTCO !== "undefined" ? SHIRTCO : []).map(r => ({
  id: r[0], nom: r[1], type: r[2], prix: r[3], avant: r[4], img: SC_IMG + r[5] + "?width=480", coul: r[6],
  lien: awinLien("115010", "https://www.theshirtcompany.com/products/" + r[0]),
}));
const SC_FILTRES = [["", "Tout"], ["shirt", "Chemises"], ["dress", "Robes-chemises"], ["curve", "Grandes tailles"], ["promo", "Promos"]];
function scListe() {
  const f = S.scF || "";
  return SC_ART.filter(r => !f || (f === "promo" ? r.avant > 0 : r.type === f));
}
function scCarte(r) {
  return `<a class="ptn" href="${esc(r.lien)}" target="_blank" rel="noopener sponsored">
    <span class="ptn-ph"><img src="${esc(r.img)}" alt="${esc(r.nom)}" loading="lazy" referrerpolicy="no-referrer">${r.avant ? `<span class="ptn-fav promo">Promo</span>` : ""}</span>
    <b data-noi18n>${esc(r.nom)}</b>
    <span class="ptn-px" data-noi18n>${r.prix} QAR${r.avant ? ` <s>${r.avant}</s>` : ""}</span>
    ${r.coul ? `<small data-noi18n>${esc(r.coul)}</small>` : ""}</a>`;
}
function scBloc() {
  if (!SC_ART.length) return "";
  const l = scListe(), n = S.scN || 12;
  return `${ptnMarque("logo-tsc.svg?v=1", "The Shirt Company", "Londres · chemises et robes-chemises")}<p class="sub" style="font-size:14px;margin-top:-2px">Pensées pour le corps féminin</p>
   <div class="fchips">${SC_FILTRES.map(c => `<button data-scf="${c[0]}" aria-pressed="${(S.scF || "") === c[0]}">${c[1]}</button>`).join("")}</div>
   <div class="ptn-g">${l.slice(0, n).map(scCarte).join("")}</div>
   ${l.length > n ? `<button class="btn ghost" data-scplus style="margin-top:10px">Voir plus de chemises</button>` : ""}
   <p class="sub" style="font-size:12.5px">Prix en riyals qataris, tels qu’affichés par la maison pour le Qatar.</p>`;
}

/* v230 (17 novembre 2026, Imen : lien Awin d'Elvorique Jewelry à ajouter) : bijoux en diamants de laboratoire,
   annonceur Awin 128211. Données : elvorique-data.js (ELVORIQUE). Prix en $. Logo et nom exact comme les autres
   maisons (v218). Filtres S.elF, nombre affiché S.elN. */
const EL_IMG = "https://cdn.shopify.com/s/files/1/0760/5485/5928/";
const EL_LOGO = "https://elvoriquejewelry.com/cdn/shop/files/LOGO_c8d4d48c-e300-4e13-b958-eb50df8990b7.png?v=1784902640&width=360";
const EL_ART = (typeof ELVORIQUE !== "undefined" ? ELVORIQUE : []).map(r => ({
  id: r[0], nom: r[1], type: r[2], prix: r[3], avant: r[4], img: EL_IMG + r[5] + "&width=480", met: r[6],
  lien: awinLien("128211", "https://elvoriquejewelry.com/products/" + r[0]),
}));
const EL_FILTRES = [["", "Tout"], ["bague", "Bagues"], ["alliance", "Alliances"], ["oreilles", "Boucles d’oreilles"], ["collier", "Colliers"], ["bracelet", "Bracelets"], ["promo", "Promos"]];
function elListe() {
  const f = S.elF || "";
  return EL_ART.filter(r => !f || (f === "promo" ? r.avant > 0 : r.type === f));
}
function elCarte(r) {
  return `<a class="ptn" href="${esc(r.lien)}" target="_blank" rel="noopener sponsored">
    <span class="ptn-ph"><img src="${esc(r.img)}" alt="${esc(r.nom)}" loading="lazy" referrerpolicy="no-referrer">${r.avant ? `<span class="ptn-fav promo">Promo</span>` : ""}</span>
    <b data-noi18n>${esc(r.nom)}</b>
    <span class="ptn-px" data-noi18n>${r.prix} $${r.avant ? ` <s>${r.avant} $</s>` : ""}</span>
    ${r.met ? `<small>${esc(r.met)}</small>` : ""}</a>`;
}
function elBloc() {
  if (!EL_ART.length) return "";
  const l = elListe(), n = S.elN || 12;
  return `${ptnMarque(EL_LOGO, "ELVORIQUE", "Bijoux en diamants de laboratoire")}<p class="sub" style="font-size:14px;margin-top:-2px">Bagues, alliances, colliers et boucles d’oreilles</p>
   <div class="fchips">${EL_FILTRES.map(c => `<button data-elf="${c[0]}" aria-pressed="${(S.elF || "") === c[0]}">${c[1]}</button>`).join("")}</div>
   <div class="ptn-g">${l.slice(0, n).map(elCarte).join("")}</div>
   ${l.length > n ? `<button class="btn ghost" data-elplus style="margin-top:10px">Voir plus de bijoux</button>` : ""}
   <p class="sub" style="font-size:12.5px">Prix en dollars américains, tels qu’affichés par la maison.</p>`;
}

document.addEventListener("click", e => {
  const ef = e.target.closest("[data-elf]");
  if (ef) { S.elF = ef.getAttribute("data-elf"); S.elN = 12; render(false); return; }
  if (e.target.closest("[data-elplus]")) { S.elN = (S.elN || 12) + 12; render(false); return; }
  const g = e.target.closest("[data-scf]");
  if (g) { S.scF = g.getAttribute("data-scf"); S.scN = 12; render(false); return; }
  if (e.target.closest("[data-scplus]")) { S.scN = (S.scN || 12) + 12; render(false); return; }
  const f = e.target.closest("[data-ptnf]");
  if (f) { S.ptnF = f.getAttribute("data-ptnf"); S.ptnN = 12; render(false); return; }
  if (e.target.closest("[data-ptnplus]")) { S.ptnN = (S.ptnN || 12) + 12; render(false); }
});

(function () {
  const st = document.createElement("style");
  st.textContent = `
.ptn-g{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:10px 0 4px}
@media (min-width:640px){.ptn-g{grid-template-columns:repeat(3,minmax(0,1fr))}}
.ptn{display:flex;flex-direction:column;gap:4px;background:#fff;border-radius:16px;padding:8px 8px 10px;text-decoration:none;color:inherit;box-shadow:0 4px 14px rgba(90,64,30,.09);border:1px solid #EADFC9;min-width:0}
.ptn-ph{position:relative;display:block;border-radius:12px;overflow:hidden;background:#F5F1EA;aspect-ratio:3/4}
.ptn-ph img{width:100%;height:100%;object-fit:cover;display:block}
.ptn-fav{position:absolute;top:8px;left:8px;background:rgba(255,255,255,.92);color:#8C6D35;font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px}
.ptn-fav.promo{color:#fff;background:#7A5E2C}
[dir=rtl] .ptn-fav{left:auto;right:8px}
.ptn b{font-size:14.5px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ptn-px{font-size:14px;font-weight:600;color:#292421}
.ptn-px s{font-weight:400;color:#8E8072;margin-inline-start:4px}
.ptn small{font-size:12px;color:#6E6E6E}
.ptn-mq{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #EADFC9;border-radius:18px;padding:12px 16px;margin:22px 0 8px;box-shadow:0 4px 14px rgba(90,64,30,.07)}
.ptn-mq img{height:44px;width:auto;max-width:120px;object-fit:contain;flex:none}
.ptn-mq div{display:flex;flex-direction:column;gap:2px;min-width:0}
.ptn-mq b{font-size:17px;letter-spacing:.04em;color:#1C1714}
.ptn-mq small{font-size:13px;color:#6E6E6E}`;
  document.head.appendChild(st);
})();
