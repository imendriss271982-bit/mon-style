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
    const bloc = `<h2>Robes de créatrice</h2><p class="sub" style="font-size:14px;margin-top:-4px">Maison de couture de Dubaï · livraison dans tout le Golfe</p>
     <div class="fchips">${PTN_FILTRES.map(c => `<button data-ptnf="${c[0]}" aria-pressed="${(S.ptnF || "") === c[0]}">${c[1]}</button>`).join("")}</div>
     <div class="ptn-g">${l.slice(0, n).map(ptnCarte).join("")}</div>
     ${l.length > n ? `<button class="btn ghost" data-ptnplus style="margin-top:10px">Voir plus de robes</button>` : ""}
     <p class="sub" style="font-size:12.5px">Prix en dollars américains, tels qu’affichés par la maison.</p>`;
    const i = o.html.indexOf('<button class="btn" data-askaura');
    o.html = i >= 0 ? o.html.slice(0, i) + bloc + o.html.slice(i) : o.html + bloc;
    return o;
  };
}

document.addEventListener("click", e => {
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
.ptn small{font-size:12px;color:#6E6E6E}`;
  document.head.appendChild(st);
})();
