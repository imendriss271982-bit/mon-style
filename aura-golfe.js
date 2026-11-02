/* My Style — « Abaya & occasions du Golfe » (v142, étape « 8,5/10 » face à ChatGPT/Gemini).
   Ce que les grandes IA connaissent mal : l'abaya selon la silhouette, la sheila selon la forme du visage,
   et les codes des occasions du Golfe (mariage, henné, Ramadan, Garangao, Aïd, bureau, majlis et condoléances,
   fête nationale de SON pays). Tout est calculé sur le téléphone à partir de ses résultats (aucune IA, aucun coût).
   - Page `P.golfe` : 2 onglets « Ton abaya » / « Les occasions ». Page `P.golfe_occ` : le guide d'une occasion (S.gocc).
   - `golfeRegle(occ)` : le code de l'occasion, ajouté aux prompts des tenues (Créer une tenue, Que porter aujourd'hui).
   - Imen peut corriger ou compléter les règles directement dans GOLFE_OCC / GOLFE_ABAYA / GOLFE_SHEILA ci-dessous
     (penser à ajouter la traduction de toute nouvelle phrase dans i18n.js).
   Chargé APRÈS aura-achat.js (utilise S, P, ok, season, SEASONS, SHAPE, pays, GR_OCC, go, render, esc, cap, DOCK_OF). */

// ——— Les occasions ———  k = clé ; occ = occasion de la garde-robe (GR_OCC) pour « Créer ma tenue », si elle existe.
const GOLFE_OCC = [
  { k: "mariage", occ: "mariage", ic: "💍", t: "Mariage", s: "La soirée dans la salle des femmes",
    code: "Robe longue habillée et tissus nobles. La soirée est entre femmes : tu peux oser la couleur et la brillance.",
    oui: ["Robe longue ou jupe longue habillée", "Satin, crêpe lourd, mousseline, broderies", "Bijoux affirmés et sac du soir"],
    non: ["Le blanc, réservé à la mariée", "Le noir total sans accessoire, trop sévère", "Les talons trop hauts : la soirée est longue"],
    abaya: "Une abaya légère ou ouverte par-dessus, que tu retires dans la salle." },
  { k: "henne", occ: "", ic: "🌿", t: "Soirée du henné", s: "La fête avant le mariage",
    code: "Tenue traditionnelle et festive : jalabiya ou kaftan brodé, dans des couleurs vives.",
    oui: ["Jalabiya ou kaftan brodé", "Vert, doré, fuchsia et couleurs vives", "Bijoux dorés"],
    non: ["Le blanc", "Les tenues trop sobres"],
    abaya: "Ton abaya habituelle pour arriver, retirée sur place." },
  { k: "ramadan", occ: "ramadan", ic: "🌙", t: "Ramadan", s: "Iftar, ghabga et visites",
    code: "Élégance douce et confortable : jalabiya, kaftan et robes longues couvrantes. Pour la ghabga, tu peux être plus habillée.",
    oui: ["Jalabiya ou kaftan", "Tissus fluides qui ne serrent pas", "Couleurs douces, pastel et doré discret"],
    non: ["Les coupes moulantes", "Les décolletés et les manches courtes", "Les tenues trop chargées pour un iftar en famille"],
    abaya: "Une abaya légère, parfois brodée, facile à enlever." },
  { k: "garangao", occ: "", ic: "🍬", t: "Garangao", s: "La mi-Ramadan avec les enfants",
    code: "Tenue traditionnelle et gaie, souvent assortie à celle des enfants : jalabiya colorée et broderies dorées.",
    oui: ["Jalabiya colorée", "Broderies dorées", "Une couleur commune avec les enfants"],
    non: ["Les tenues sombres et sévères", "Les talons : on marche de maison en maison"],
    abaya: "Une abaya brodée ou colorée, dans l’esprit de la fête." },
  { k: "aid", occ: "aid", ic: "🎉", t: "Aïd", s: "Les visites en famille et les sorties",
    code: "Ta plus belle tenue, neuve si possible : robe longue, kaftan ou ensemble habillé, avec des accessoires soignés.",
    oui: ["Une pièce neuve", "Des couleurs gaies et lumineuses", "Des chaussures confortables : les visites sont nombreuses"],
    non: ["Les tenues de tous les jours", "Le noir total"],
    abaya: "Ta plus belle abaya : brodée, ou dans une couleur de ta palette." },
  { k: "travail", occ: "travail", ic: "💼", t: "Bureau", s: "Ministère, entreprise et réunions",
    code: "Sobre, nette et professionnelle. Dans les bureaux du gouvernement, l’abaya noire classique reste la règle.",
    oui: ["Abaya noire sobre ou tailleur long", "Coupes structurées", "Sac et chaussures simples"],
    non: ["Les broderies et les brillances", "Les talons qui claquent", "Un parfum trop fort en réunion"],
    abaya: "Une abaya droite ou cloche, noire ou neutre, sans décor." },
  { k: "majlis", occ: "", ic: "☕", t: "Majlis et condoléances", s: "Visites chez la famille et les amies",
    code: "Couvrante et respectueuse. Pour des condoléances, porte du noir ou une couleur très sombre, sans bijoux voyants ni maquillage marqué.",
    oui: ["Des tenues longues et couvrantes", "Des couleurs calmes", "Pour des condoléances : noir, sans brillance"],
    non: ["Les couleurs vives aux condoléances", "Les bijoux qui font du bruit", "Le parfum fort"],
    abaya: "Une abaya noire simple, sans décor." },
  { k: "national", occ: "", ic: "🏳️", t: "Fête nationale", s: "",
    code: "", oui: ["Une touche aux couleurs du drapeau : sheila, broderie ou accessoire", "Une tenue traditionnelle"], non: ["Trop de couleurs du drapeau à la fois"],
    abaya: "Une abaya noire avec une broderie ou une sheila aux couleurs du pays." }
];
// Fête nationale selon le pays de la cliente.
const GOLFE_NAT = {
  QA: { d: "18 décembre", c: "bordeaux et blanc" }, SA: { d: "23 septembre", c: "vert et blanc" },
  AE: { d: "2 décembre", c: "rouge, vert, blanc et noir" }, KW: { d: "25 février", c: "vert, blanc, rouge et noir" },
  BH: { d: "16 décembre", c: "rouge et blanc" }, OM: { d: "20 novembre", c: "rouge, blanc et vert" }
};
function golfeOcc(k) {
  const o = GOLFE_OCC.find(x => x.k === k); if (!o) return null;
  if (k !== "national") return o;
  const n = GOLFE_NAT[typeof pays === "function" ? pays() : "QA"] || GOLFE_NAT.QA;
  return { ...o, s: `Le ${n.d}`, code: `Les couleurs du pays sont à l’honneur : ${n.c}.` };
}

// ——— L'abaya selon la silhouette (formes renvoyées par SHAPE) ———
const GOLFE_ABAYA = {
  "Sablier": { c: "Une abaya cache-cœur ou ceinturée, qui marque ta taille.", e: "Les abayas très amples et sans forme, qui cachent ta taille." },
  "Poire": { c: "Une abaya trapèze, évasée dès les épaules, avec du détail en haut : manches travaillées ou broderie au col.", e: "Les ceintures basses et les décors sur les hanches." },
  "Triangle inversé": { c: "Une abaya droite aux épaules simples (kimono ou raglan), avec un bas plus ample.", e: "Les épaulettes, les manches papillon volumineuses et les broderies aux épaules." },
  "Rectangle": { c: "Une abaya papillon (farasha), ou avec une ceinture nouée pour dessiner une taille.", e: "Les coupes trop droites et raides." },
  "Pomme": { c: "Une abaya droite et ouverte, sur une robe d’une seule couleur : la ligne verticale allonge.", e: "Les ceintures à la taille et les tissus brillants." }
};
// La sheila selon la forme du visage (formes du cours d'Imen, aura-mesure.js).
const GOLFE_SHEILA = {
  "Ovale": "Presque tous les drapés te vont : amuse-toi.",
  "Rond": "Un drapé qui allonge : un peu de volume en haut de la tête, des pans qui tombent droit, rien de serré sous le menton.",
  "Carré": "Un drapé souple et arrondi qui adoucit la mâchoire, avec des pans asymétriques.",
  "Rectangulaire": "Du volume sur les côtés plutôt qu’en hauteur, et le front un peu couvert.",
  "Cœur": "Plus de volume en bas, autour de la mâchoire, et rien de serré sur le front.",
  "Diamant": "Un drapé doux qui couvre un peu les pommettes, avec du volume au front et au menton.",
  "Triangle": "Du volume en haut, au front et aux tempes, et un drapé plat autour de la mâchoire."
};
const golfeForme = () => { const b = typeof ok === "function" ? ok("corps") : null; return b ? SHAPE(b.forme) : ""; };
const golfeVisage = () => { const v = typeof ok === "function" ? ok("visage") : null; if (!v) return ""; const m = String(v.forme || "").match(/Ovale|Rond|Carré|Rectangulaire|Cœur|Diamant|Triangle/); return m ? m[0] : ""; };
// Mois chauds au Golfe : mai à octobre.
const golfeEte = () => { const m = new Date().getMonth(); return m >= 4 && m <= 9; };

// Règle courte d'une occasion pour les prompts d'Aura (Créer une tenue, Que porter aujourd'hui).
function golfeRegle(occ) {
  const o = GOLFE_OCC.find(x => x.occ === occ || x.k === occ); if (!o) return "";
  const g = golfeOcc(o.k);
  return " CODES DU GOLFE pour cette occasion : " + g.code + " À éviter : " + g.non.join(", ").toLowerCase() + ".";
}

// ——— Pages ———
function golfeAbayaHTML() {
  const f = golfeForme(), v = golfeVisage(), s = typeof season === "function" ? season() : null, h = +((S.info || {}).taille) || 0;
  const g = f && GOLFE_ABAYA[f];
  const cols = s && SEASONS[s] ? SEASONS[s].c.filter(x => !/Noir|Blanc/.test(x[1])).slice(0, 5) : [];
  const bloc = (t, body) => `<div class="go-q"><b>${t}</b>${body}</div>`;
  return `<section class="go-card">
   ${bloc("La coupe qui te va", g ? `<p>${g.c}</p><p class="go-non"><span>À éviter :</span> ${g.e}</p>` : `<p>Fais ton analyse de silhouette pour connaître ta coupe d’abaya.</p><button class="btn ghost go-btn" data-mod="corps">Faire mon analyse</button>`)}
   ${bloc("La longueur", h ? (h < 160 ? `<p>Une seule couleur de la tête aux pieds et une longueur au ras du sol : tu parais plus grande. Préfère les petits motifs.</p>` : h >= 172 ? `<p>Tu peux tout porter : abayas très amples, longues capes et grands motifs.</p>` : `<p>Une longueur au ras du sol, avec une chaussure qui dépasse à peine.</p>`) : `<p>Ajoute ta taille dans ton profil pour un conseil sur la longueur.</p>`)}
   ${bloc("Le tissu de la saison", golfeEte() ? `<p>Il fait chaud : lin, crêpe léger et nidha fluide, qui respirent.</p>` : `<p>Il fait plus frais : crêpe épais, laine légère, et velours le soir.</p>`)}
   ${bloc("Les couleurs", `<p>Le noir reste le classique.${cols.length ? " Pour une abaya de couleur, choisis dans ta palette :" : ""}</p>${cols.length ? `<span class="go-sw">${cols.map(x => `<i style="background:${x[0]}" title="${esc(x[1])}"></i>`).join("")}</span>` : `<p class="go-non">Fais ton analyse des couleurs pour connaître ta palette.</p>`}`)}
   ${bloc("Ta sheila", v ? `<p>${GOLFE_SHEILA[v]}</p>` : `<p>Fais ton analyse du visage pour savoir comment draper ta sheila.</p>`)}
  </section>`;
}
function golfeOccListHTML() {
  return `<div class="go-list">${GOLFE_OCC.map(o => { const g = golfeOcc(o.k); return `<button class="go-row" data-golfe="${o.k}"><span class="go-ic" aria-hidden="true">${o.ic}</span><span class="go-rt"><b>${g.t}</b>${g.s ? `<small>${g.s}</small>` : ""}</span><span class="hx-chev" aria-hidden="true">›</span></button>`; }).join("")}</div>`;
}
P.golfe = () => {
  const tab = S.gtab === "occ" ? "occ" : "abaya";
  return { back: true,
    html: `<p class="step">Golfe</p><h1>Abaya et occasions</h1>
   <p class="sub">Les codes du Golfe, adaptés à ta silhouette, ton visage et tes couleurs.</p>
   <div class="fchips" role="tablist"><button role="tab" data-gtab="abaya" aria-pressed="${tab === "abaya"}">Ton abaya</button><button role="tab" data-gtab="occ" aria-pressed="${tab === "occ"}">Les occasions</button></div>
   ${tab === "abaya" ? golfeAbayaHTML() : golfeOccListHTML()}`,
    say: tab === "abaya" ? (golfeForme() ? "Voici l’abaya faite pour ta silhouette." : "Fais ton analyse, et je te dis quelle abaya te va.") : "Choisis une occasion, je te donne ses codes." };
};
P.golfe_occ = () => {
  const g = golfeOcc(S.gocc) || golfeOcc("mariage"), f = golfeForme(), a = f && GOLFE_ABAYA[f];
  const li = arr => `<ul>${arr.map(x => `<li>${x}</li>`).join("")}</ul>`;
  const gr = g.occ && typeof GR_OCC !== "undefined" && GR_OCC.some(x => x[0] === g.occ);
  return { back: true,
    html: `<p class="step">Les occasions du Golfe</p><h1><span aria-hidden="true">${g.ic}</span> ${g.t}</h1>${g.s ? `<p class="sub">${g.s}</p>` : ""}
   <section class="go-card"><div class="go-q"><b>Le code</b><p>${g.code}</p></div>
   <div class="go-q go-oui"><b>À porter</b>${li(g.oui)}</div>
   <div class="go-q go-nn"><b>À éviter</b>${li(g.non)}</div>
   <div class="go-q"><b>L’abaya</b><p>${g.abaya}</p>${a ? `<p class="go-pt">Pour ta silhouette (${f}) :</p><p>${a.c}</p>` : ""}</div></section>`,
    say: g.code,
    foot: gr ? `<button class="btn" data-gotenue="${g.occ}">Créer ma tenue avec ma garde-robe</button>` : "" };
};
if (typeof DOCK_OF !== "undefined") { DOCK_OF.golfe = "home"; DOCK_OF.golfe_occ = "home"; }

addEventListener("click", e => {
  const t = e.target.closest("[data-gtab],[data-golfe],[data-gotenue]"); if (!t) return;
  if (t.dataset.gtab) { S.gtab = t.dataset.gtab; render(false); return; }
  if (t.dataset.golfe) { S.gocc = t.dataset.golfe; go("golfe_occ"); return; }
  if (t.dataset.gotenue) { S.grOcc = t.dataset.gotenue; go("tenues"); }
});

// ——— Entrées : carte de l'accueil (avant « Pour toi aujourd'hui ») et lien depuis « Que porter aujourd'hui ? » ———
const golfeCarte = () => `<button class="go-entree" data-view="golfe"><span class="go-ic" aria-hidden="true">🌙</span>
  <span class="go-rt"><small>Golfe</small><b>Abaya et occasions</b><em>Ton abaya, ta sheila et les codes des mariages, du Ramadan et de l’Aïd.</em></span><span class="hx-chev" aria-hidden="true">›</span></button>`;
if (typeof P.home === "function") {
  const homeAvant = P.home;
  P.home = (...a) => { const o = homeAvant(...a); if (o && o.html) o.html = o.html.replace(/<section><h2 class="hz-h">Pour toi aujourd’hui<\/h2>/, m => golfeCarte() + m); return o; };
}
if (typeof P.jour === "function") {
  const jourAvant = P.jour;
  P.jour = () => {
    const o = jourAvant(), occ = typeof jrOcc === "function" ? jrOcc() : "", g = GOLFE_OCC.find(x => x.occ === occ);
    if (g && o && o.html) o.html = o.html.replace(/(<div class="jr-occ">[\s\S]*?<\/div>)/, `$1<button class="go-lien" data-golfe="${g.k}">Les codes du Golfe pour cette occasion ›</button>`);
    return o;
  };
}

(function goCSS() {
  const st = document.createElement("style");
  st.textContent = `
.go-entree{display:flex;align-items:center;gap:14px;width:100%;margin:6px 0 18px;padding:14px 16px;border:0;border-radius:16px;background:var(--surface);color:var(--ink);text-align:start;font:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(140,109,53,.12)}
.go-ic{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--soft);font-size:1.35rem}
.go-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.go-rt small{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.go-rt b{font-size:1.02rem}.go-rt em{font-style:normal;font-size:.85rem;color:var(--muted);line-height:1.35}
.go-list{display:flex;flex-direction:column;gap:8px;margin-top:6px}
.go-row{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);text-align:start;font:inherit;cursor:pointer}
.go-row .go-rt small{text-transform:none;letter-spacing:0;font-size:.82rem}
.go-row .go-ic{width:40px;height:40px;font-size:1.15rem}
.go-card{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:16px;background:var(--surface);box-shadow:0 2px 10px rgba(140,109,53,.12);margin-top:10px}
.go-q+.go-q{border-top:1px solid var(--line);padding-top:12px}
.go-q b{font-size:.98rem}.go-q p{margin:5px 0 0;font-size:.92rem;line-height:1.5}
.go-q ul{margin:6px 0 0;padding-inline-start:20px;font-size:.92rem;line-height:1.55}
.go-oui li::marker{color:#2F6B2A}.go-nn li::marker{color:#9A3B2B}
.go-non{color:var(--muted)}
.go-pt{color:var(--accent);font-weight:600}
.go-sw{display:flex;gap:6px;margin-top:8px}.go-sw i{width:26px;height:26px;border-radius:50%;border:1px solid rgba(0,0,0,.08)}
.go-btn{margin-top:10px;width:100%}
.go-lien{display:block;margin:-6px 0 14px;padding:0;border:0;background:none;color:var(--accent);font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;text-align:start}
`;
  document.head.appendChild(st);
})();
