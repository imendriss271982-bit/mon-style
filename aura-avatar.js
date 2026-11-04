/* My Style — Your Style Twin, niveau 2 : l'avatar cartoon (v157, choix d'Imen).
   Une petite poupée dessinée SUR LE TÉLÉPHONE (SVG, aucune IA, coût 0) qui reprend :
   - la silhouette de la cliente (S.res.corps.forme → SHAPE : épaules, taille, hanches) ;
   - le teint, la couleur et la coiffure qu'ELLE choisit (rien n'est deviné ; couleur des cheveux du questionnaire si elle l'a rempli) ;
   - les VRAIES pièces de sa garde-robe (catégorie + couleur `hex` de chaque article).
   Tenue portée : tenue du jour (JR, aura-jour.js) si elle existe, sinon ses tenues enregistrées (GR.saved, « Autre tenue »), sinon une tenue de base neutre.
   Données : localStorage `monstyle_avatar` = { peau, cheveux, coiffure, sheila } (indices / hex). Effacé avec « Effacer toutes mes données ».
   Où : page P.twin (carte en haut), page P.avatar (personnaliser), page P.jour (l'avatar porte la tenue du jour).
   Chargé après aura-portes.js. Test : node tests/avatar.js */

const AV_KEY = "monstyle_avatar";
const AV_PEAUX = [["#F6D9C6", "Très claire"], ["#EDC2A3", "Claire"], ["#D7A07A", "Moyenne"], ["#B98058", "Mate"], ["#8F5C3C", "Brune"], ["#5F3B25", "Foncée"]];
const AV_CHEV = [["#D8B878", "Blond"], ["#7A5434", "Châtain"], ["#A4502A", "Roux"], ["#3A2418", "Brun foncé"], ["#121212", "Noir"]];
const AV_COIF = [["longs", "Longs"], ["attaches", "Attachés"], ["courts", "Courts"], ["sheila", "Sheila"]];
const AV_SHEILAS = [["#1B1B1B", "Noire"], ["#F3E7D3", "Crème"], ["#C9A47A", "Camel"], ["#6E1230", "Bordeaux"], ["#14213D", "Bleu nuit"]];
const avHex = h => /^#[0-9a-f]{6}$/i.test(String(h || "")) ? String(h) : "";

let AV = (() => {
  const d = { peau: -1, cheveux: "", coiffure: "longs", sheila: AV_SHEILAS[0][0] };
  try {
    const j = JSON.parse(localStorage.getItem(AV_KEY) || "null");
    if (j && typeof j === "object") {
      if (Number.isInteger(j.peau) && j.peau >= 0 && j.peau < AV_PEAUX.length) d.peau = j.peau;
      if (avHex(j.cheveux)) d.cheveux = j.cheveux;
      if (AV_COIF.some(c => c[0] === j.coiffure)) d.coiffure = j.coiffure;
      if (avHex(j.sheila)) d.sheila = j.sheila;
    }
  } catch (e) {}
  return d;
})();
function avSave() { try { localStorage.setItem(AV_KEY, JSON.stringify(AV)); } catch (e) {} }
// Couleur des cheveux : son choix, sinon sa réponse au questionnaire de couleurs, sinon châtain (simple valeur d'affichage).
function avCheveux() {
  if (AV.cheveux) return AV.cheveux;
  try { const q = (QS.find(x => x.id === "cheveux") || { o: [] }).o.find(o => o[0] === (S.ans || {}).cheveux); if (q && q[2]) return q[2]; } catch (e) {}
  return AV_CHEV[1][0];
}
const avPeau = () => (AV_PEAUX[AV.peau] || AV_PEAUX[2])[0];
function avForme() { try { return S.res && S.res.corps ? SHAPE(S.res.corps.forme) : ""; } catch (e) { return ""; } }
// Proportions par silhouette (épaules, taille, hanches), méthode des 5 silhouettes.
const AV_PROP = { "Sablier": [1, .66, 1], "Poire": [.86, .72, 1.12], "Triangle inversé": [1.12, .8, .86], "Rectangle": [.96, .9, .96], "Pomme": [1, 1.04, 1] };
const AV_DEF = [.96, .76, .98];

// Choisit dans une liste d'articles ce que l'avatar peut porter.
function avHabits(items) {
  const out = {}, c = x => x && x.cat;
  for (const x of (items || [])) {
    if (!x) continue;
    const k = c(x) === "bas" ? "pantalon" : c(x);
    if (["haut", "pantalon", "jupe", "robe", "veste", "abaya", "chaussures", "sac"].includes(k) && !out[k]) out[k] = x;
  }
  return out;
}
const avCol = (x, def) => avHex(x && x.hex) || def;
let AV_N = 0;

// L'avatar en SVG (viewBox 200 × 360). items = articles de la garde-robe (ou vide = tenue de base).
function avSVG(items, opt) {
  opt = opt || {};
  const id = "av" + (++AV_N), P3 = AV_PROP[avForme()] || AV_DEF, [S1, W1, H1] = P3;
  const cx = 100, sy = 96, wy = 160, hy = 196, ky = 268, ay = 326;
  const sh = 37 * S1, w = 25 * W1, h = 34 * H1;
  const skin = avPeau(), hair = avCheveux(), ln = 'stroke="rgba(41,36,33,.22)" stroke-width="1.2"';
  const H = avHabits(items), base = !items || !items.length;
  const robe = H.robe, abaya = H.abaya, haut = H.haut || (base ? { hex: "#F3E7D3" } : null);
  const bas = H.pantalon || H.jupe || (base && !robe ? { hex: "#B9A58C", cat: "pantalon" } : null);
  const isJupe = bas && bas.cat === "jupe";
  const shoes = avCol(H.chaussures, "#3A2B22");
  const midW = (wy + hy) / 2;
  const torso = `M${cx - sh},${sy} Q${cx},${sy - 7} ${cx + sh},${sy} Q${cx + sh + 1},${sy + 34} ${cx + w},${wy} Q${cx + h + 3},${midW} ${cx + h},${hy} L${cx - h},${hy} Q${cx - h - 3},${midW} ${cx - w},${wy} Q${cx - sh - 1},${sy + 34} ${cx - sh},${sy} Z`;
  const legL = `M${cx - h + 2},${hy - 2} L${cx - 2},${hy - 2} L${cx - 7},${ay} L${cx - 22},${ay} Z`;
  const legR = `M${cx + 2},${hy - 2} L${cx + h - 2},${hy - 2} L${cx + 22},${ay} L${cx + 7},${ay} Z`;
  const hips = `M${cx - w},${wy} L${cx + w},${wy} Q${cx + h + 3},${midW} ${cx + h},${hy} L${cx - h},${hy} Q${cx - h - 3},${midW} ${cx - w},${wy} Z`;
  const skirt = (to, flare) => `M${cx - w},${wy} L${cx + w},${wy} Q${cx + h + 3},${hy} ${cx + h + flare},${to} L${cx - h - flare},${to} Q${cx - h - 3},${hy} ${cx - w},${wy} Z`;
  // Bras : manche (couleur du vêtement) jusqu'au coude ou au poignet, puis la peau.
  const arm = (side, sleeve, long) => {
    const s = side < 0 ? -1 : 1, x0 = cx + s * (sh - 3), x1 = cx + s * (sh + 9), x2 = cx + s * (sh + 13);
    const e = `<path d="M${x0},${sy + 4} L${x1},${sy + 62} L${x2},${hy + 18}" fill="none" stroke="${skin}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (!sleeve) return e;
    const s2 = long ? `M${x0},${sy + 4} L${x1},${sy + 62} L${x2 - s * 1},${hy + 8}` : `M${x0},${sy + 4} L${cx + s * (sh + 4)},${sy + 30}`;
    return e + `<path d="${s2}" fill="none" stroke="${sleeve}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  let corps = "";
  // Jambes (peau) puis bas.
  corps += `<path d="${legL}" fill="${skin}"/><path d="${legR}" fill="${skin}"/>`;
  corps += `<ellipse cx="${cx - 15}" cy="${ay + 5}" rx="11" ry="5.5" fill="${shoes}"/><ellipse cx="${cx + 15}" cy="${ay + 5}" rx="11" ry="5.5" fill="${shoes}"/>`;
  corps += `<path d="${torso}" fill="${skin}"/>`;
  let manche = null, longue = false;
  if (abaya) {
    const c = avCol(abaya, "#1B1B1B");
    corps += `<path d="M${cx - sh},${sy} Q${cx},${sy - 7} ${cx + sh},${sy} Q${cx + sh + 6},${sy + 60} ${cx + h + 18},${ay + 2} L${cx - h - 18},${ay + 2} Q${cx - sh - 6},${sy + 60} ${cx - sh},${sy} Z" fill="${c}" ${ln}/>`;
    corps += `<path d="M${cx},${sy - 2} L${cx},${ay + 2}" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>`;
    manche = c; longue = true;
  } else if (robe) {
    const c = avCol(robe, "#C48B95");
    corps += `<path d="${torso}" fill="${c}" ${ln}/><path d="${skirt(ky + 14, 12)}" fill="${c}" ${ln}/>`;
    manche = c;
  } else {
    if (bas) {
      const c = avCol(bas, "#B9A58C");
      if (isJupe) corps += `<path d="${skirt(ky, 9)}" fill="${c}" ${ln}/>`;
      else corps += `<path d="${hips}" fill="${c}"/><path d="${legL}" fill="${c}" ${ln}/><path d="${legR}" fill="${c}" ${ln}/>`;
    }
    if (haut) {
      const c = avCol(haut, "#F3E7D3");
      corps += `<clipPath id="${id}t"><rect x="0" y="0" width="200" height="${hy - 10}"/></clipPath><path d="${torso}" fill="${c}" ${ln} clip-path="url(#${id}t)"/>`;
      manche = c;
    }
  }
  if (H.veste && !abaya) {
    const c = avCol(H.veste, "#8C6D35");
    corps += `<path d="M${cx - sh},${sy} Q${cx - 12},${sy - 6} ${cx - 12},${sy + 4} L${cx - 11},${hy + 4} L${cx - h - 4},${hy + 4} Q${cx - h - 4},${midW} ${cx - w - 2},${wy} Q${cx - sh - 1},${sy + 34} ${cx - sh},${sy} Z" fill="${c}" ${ln}/>`;
    corps += `<path d="M${cx + sh},${sy} Q${cx + 12},${sy - 6} ${cx + 12},${sy + 4} L${cx + 11},${hy + 4} L${cx + h + 4},${hy + 4} Q${cx + h + 4},${midW} ${cx + w + 2},${wy} Q${cx + sh + 1},${sy + 34} ${cx + sh},${sy} Z" fill="${c}" ${ln}/>`;
    manche = c; longue = true;
  }
  const bras = arm(-1, manche, longue) + arm(1, manche, longue);
  const sac = H.sac ? `<rect x="${cx + sh + 6}" y="${hy + 6}" width="22" height="18" rx="4" fill="${avCol(H.sac, "#8C6D35")}" ${ln}/><path d="M${cx + sh + 10},${hy + 7} Q${cx + sh + 17},${hy - 4} ${cx + sh + 24},${hy + 7}" fill="none" stroke="${avCol(H.sac, "#8C6D35")}" stroke-width="2"/>` : "";
  // Tête, visage et cheveux (ou sheila).
  const hcy = 57, r = 28, co = AV.coiffure;
  let arriere = "", devant = "";
  if (co === "sheila") {
    const sc = avHex(AV.sheila) || AV_SHEILAS[0][0];
    arriere = `<path d="M${cx - r - 9},${hcy} Q${cx - r - 10},${hcy - r - 12} ${cx},${hcy - r - 12} Q${cx + r + 10},${hcy - r - 12} ${cx + r + 9},${hcy} L${cx + sh - 4},${sy + 24} Q${cx},${sy + 34} ${cx - sh + 4},${sy + 24} Z" fill="${sc}" ${ln}/>`;
    devant = `<path d="M${cx - r - 2},${hcy + 2} Q${cx - r - 3},${hcy - r - 6} ${cx},${hcy - r - 6} Q${cx + r + 3},${hcy - r - 6} ${cx + r + 2},${hcy + 2} Q${cx + r + 4},${hcy - r + 2} ${cx},${hcy - r - 1} Q${cx - r - 4},${hcy - r + 2} ${cx - r - 2},${hcy + 2} Z" fill="${sc}"/>`
      + `<path d="M${cx - r - 7},${hcy - 2} Q${cx - r - 6},${sy + 6} ${cx - sh + 1},${sy + 20} Q${cx},${sy + 34} ${cx + sh - 1},${sy + 20} Q${cx + r + 6},${sy + 6} ${cx + r + 7},${hcy - 2} L${cx + r + 1},${hcy + 4} Q${cx + r - 2},${hcy + r + 4} ${cx},${hcy + r + 10} Q${cx - r + 2},${hcy + r + 4} ${cx - r - 1},${hcy + 4} Z" fill="${sc}" ${ln}/>`;
  } else {
    if (co === "longs") arriere = `<path d="M${cx - r - 4},${hcy - 4} Q${cx - r - 8},${sy + 30} ${cx - r + 2},${sy + 44} L${cx + r - 2},${sy + 44} Q${cx + r + 8},${sy + 30} ${cx + r + 4},${hcy - 4} Z" fill="${hair}"/>`;
    if (co === "attaches") arriere = `<circle cx="${cx}" cy="${hcy - r - 6}" r="12" fill="${hair}"/>`;
    devant = `<path d="M${cx - r - 2},${hcy + 4} Q${cx - r - 4},${hcy - r - 4} ${cx},${hcy - r - 3} Q${cx + r + 4},${hcy - r - 4} ${cx + r + 2},${hcy + 4} Q${cx + r - 2},${hcy - r + 6} ${cx + 4},${hcy - r + 8} Q${cx - 8},${hcy - r + 14} ${cx - r - 2},${hcy + 4} Z" fill="${hair}"/>`;
    if (co === "courts") devant += `<path d="M${cx - r - 2},${hcy + 4} Q${cx - r - 4},${hcy + 14} ${cx - r + 4},${hcy + 16} L${cx - r + 2},${hcy} Z M${cx + r + 2},${hcy + 4} Q${cx + r + 4},${hcy + 14} ${cx + r - 4},${hcy + 16} L${cx + r - 2},${hcy} Z" fill="${hair}"/>`;
    if (co === "longs") devant += `<path d="M${cx - r - 3},${hcy} Q${cx - r - 7},${sy + 20} ${cx - r + 1},${sy + 46} L${cx - r + 11},${sy + 40} Q${cx - r + 5},${sy + 14} ${cx - r + 5},${hcy + 8} Z M${cx + r + 3},${hcy} Q${cx + r + 7},${sy + 20} ${cx + r - 1},${sy + 46} L${cx + r - 11},${sy + 40} Q${cx + r - 5},${sy + 14} ${cx + r - 5},${hcy + 8} Z" fill="${hair}"/>`;
  }
  const visage = (co === "sheila" ? "" : `<rect x="${cx - 6}" y="${hcy + r - 6}" width="12" height="${sy - hcy - r + 8}" fill="${skin}"/>`) + `
<circle cx="${cx}" cy="${hcy}" r="${r}" fill="${skin}"/>
<ellipse cx="${cx - 10}" cy="${hcy + 3}" rx="3.2" ry="4" fill="#2B211C"/><ellipse cx="${cx + 10}" cy="${hcy + 3}" rx="3.2" ry="4" fill="#2B211C"/><circle cx="${cx - 9}" cy="${hcy + 1.5}" r="1.1" fill="#fff"/><circle cx="${cx + 11}" cy="${hcy + 1.5}" r="1.1" fill="#fff"/>
<path d="M${cx - 13},${hcy - 5} q4,-3 8,0 M${cx + 5},${hcy - 5} q4,-3 8,0" fill="none" stroke="#3A2B22" stroke-width="1.6" stroke-linecap="round"/>
<circle cx="${cx - 15}" cy="${hcy + 11}" r="4" fill="#E58C8C" opacity=".35"/><circle cx="${cx + 15}" cy="${hcy + 11}" r="4" fill="#E58C8C" opacity=".35"/>
<path d="M${cx - 6},${hcy + 13} Q${cx},${hcy + 18} ${cx + 6},${hcy + 13}" fill="none" stroke="#B4505A" stroke-width="2" stroke-linecap="round"/>`;
  const lab = opt.label || "Ton avatar";
  return `<svg class="av-svg" viewBox="12 14 176 336" role="img" aria-label="${esc(lab)}"><ellipse cx="100" cy="338" rx="58" ry="7" fill="rgba(41,36,33,.10)"/>${arriere}${corps}${bras}${sac}${visage}${devant}</svg>`;
}

// Tenue à porter : tenue du jour, sinon ses tenues enregistrées (S.avIdx pour changer), sinon la tenue de base.
function avTenues() {
  const by = id => (GR.items || []).find(x => x.id === id), out = [];
  try { if (typeof JR !== "undefined" && JR && JR.look && typeof jrAuj === "function" && JR.d === jrAuj()) { const it = JR.look.pieces.map(by).filter(Boolean); if (it.length) out.push({ t: "Ta tenue du jour", s: JR.look.titre || "", it }); } } catch (e) {}
  try { (GR.saved || []).slice().reverse().forEach(t => { const it = (t.pieces || []).map(by).filter(Boolean); if (it.length) out.push({ t: "Ta tenue enregistrée", s: t.titre || t.nom || "", it }); }); } catch (e) {}
  return out;
}

function avCarte() {
  const ts = avTenues(), i = ts.length ? ((S.avIdx || 0) % ts.length + ts.length) % ts.length : -1, t = ts[i];
  const forme = avForme();
  const quoi = t ? `<b>${t.t}</b>${t.s ? `<small data-noi18n>${esc(t.s)}</small>` : ""}<ul class="av-li" data-noi18n>${t.it.slice(0, 5).map(x => `<li><i style="background:${avHex(x.hex) || "#ccc"}"></i>${esc(x.nom || grCat(x.cat))}</li>`).join("")}</ul>`
    : `<b>Ta tenue de base</b><small>Crée une tenue ou demande ta tenue du jour : ton avatar la portera.</small>`;
  return `<section class="av-card"><div class="av-fig">${avSVG(t ? t.it : null)}</div><div class="av-txt">
<span class="hr-lab">Ton avatar</span>${quoi}
<p class="av-sil">${forme ? "Silhouette : " + esc(forme) : "Fais ton analyse de silhouette : ton avatar prendra ta forme."}</p>
<div class="av-acts">${ts.length > 1 ? `<button class="btn ghost" data-avnext>Autre tenue</button>` : ""}${t ? "" : `<button class="btn ghost" data-go="${typeof grReady === "function" && grReady() ? "jour" : "garde"}">${typeof grReady === "function" && grReady() ? "Ma tenue du jour" : "Ajouter mes vêtements"}</button>`}
<button class="btn" data-go="avatar">Personnaliser</button></div></div></section>`;
}

const avChips = (k, list, cur, sw) => `<div class="av-chips">${list.map((o, i) => { const v = k === "peau" ? i : o[0], on = k === "peau" ? cur === i : cur === o[0];
  return `<button type="button" data-av="${k}:${v}" aria-pressed="${on}">${sw ? `<i style="background:${o[0]}"></i>` : ""}${o[1]}</button>`; }).join("")}</div>`;

P.avatar = () => {
  const ts = avTenues();
  return { back: true, html: `<p class="step">Your Style Twin</p><h1>Ton avatar</h1>
<p class="sub">Choisis ce qui te ressemble. Ton avatar prend ta silhouette et porte tes vrais vêtements.</p>
<div class="av-prev">${avSVG(ts.length ? ts[0].it : null)}</div>
<h2 class="av-h">Ton teint</h2>${avChips("peau", AV_PEAUX, AV.peau, 1)}
<h2 class="av-h">Ta coiffure</h2>${avChips("coiffure", AV_COIF, AV.coiffure, 0)}
${AV.coiffure === "sheila" ? `<h2 class="av-h">Ta sheila</h2>${avChips("sheila", AV_SHEILAS, AV.sheila, 1)}` : `<h2 class="av-h">Tes cheveux</h2>${avChips("cheveux", AV_CHEV, avCheveux(), 1)}`}
<p class="av-note">Ton avatar reste sur ton téléphone. Rien n'est envoyé.</p>` };
};
if (typeof DOCK_OF === "object") DOCK_OF.avatar = "home";

// Carte en haut du Style Twin.
if (typeof P.twin === "function") {
  const avTwinAvant = P.twin;
  P.twin = (...a) => { const o = avTwinAvant(...a); if (o && o.html) o.html = o.html.replace(/(<\/h1>\s*(<p class="sub">[\s\S]*?<\/p>)?)/, m => m + avCarte()); return o; };
}
// L'avatar porte la tenue du jour.
if (typeof P.jour === "function") {
  const avJourAvant = P.jour;
  P.jour = (...a) => {
    const o = avJourAvant(...a);
    try {
      if (o && o.html && o.html.includes('<section class="jr-look">') && JR && JR.look) {
        const by = id => GR.items.find(x => x.id === id), it = JR.look.pieces.map(by).filter(Boolean);
        o.html = o.html.replace('<section class="jr-look">', `<section class="jr-look"><div class="av-jour">${avSVG(it, { label: "Ton avatar porte ta tenue du jour" })}</div>`);
      }
    } catch (e) {}
    return o;
  };
}

document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-av],[data-avnext]");
  if (!b) return;
  e.stopPropagation();
  if (b.hasAttribute("data-avnext")) { S.avIdx = (S.avIdx || 0) + 1; render(false); return; }
  const [k, v] = b.getAttribute("data-av").split(":");
  if (k === "peau") AV.peau = Math.max(0, Math.min(AV_PEAUX.length - 1, parseInt(v, 10) || 0));
  else if (k === "coiffure" && AV_COIF.some(c => c[0] === v)) AV.coiffure = v;
  else if ((k === "cheveux" || k === "sheila") && avHex(v)) AV[k] = v;
  avSave(); render(false);
}, true);

(function avCSS() {
  const st = document.createElement("style");
  st.textContent = `.av-card{display:flex;gap:14px;align-items:center;margin:16px 0;padding:14px;border-radius:20px;border:1px solid #E8D3A6;background:#FFFFFF;box-shadow:0 6px 18px rgba(140,109,53,.12)}
.av-fig{flex:0 0 120px;height:216px;border-radius:16px;background:linear-gradient(180deg,#FBF6EC,#F3E7D3)}.av-svg{width:100%;height:100%;display:block}
.av-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.av-txt>b{font-size:17px;color:var(--ink)}.av-txt small{color:var(--muted);font-size:13px;line-height:1.35}
.av-li{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--ink)}.av-li li{display:flex;align-items:center;gap:6px}.av-li i{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.12);flex:none}
.av-sil{margin:4px 0 0;font-size:12.5px;color:var(--accent)}
.av-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.av-acts .btn{width:auto;padding:9px 14px;font-size:13.5px;min-height:0}
.av-prev{width:170px;height:306px;margin:14px auto 6px;border-radius:22px;background:linear-gradient(180deg,#FBF6EC,#F3E7D3);box-shadow:0 6px 18px rgba(140,109,53,.12)}
.av-h{font-size:16px;margin:18px 0 8px}.av-chips{display:flex;flex-wrap:wrap;gap:8px}
.av-chips button{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:999px;border:1px solid #E6E6E6;background:#FFFFFF;color:var(--ink);font:inherit;font-size:14px;cursor:pointer}
.av-chips button[aria-pressed=true]{border-color:#8C6D35;box-shadow:0 0 0 2px rgba(140,109,53,.25)}.av-chips i{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.15)}
.av-note{margin:18px 0 0;font-size:13px;color:var(--muted);text-align:center}
.av-jour{width:130px;height:234px;margin:6px auto 10px;border-radius:18px;background:linear-gradient(180deg,#FBF6EC,#F3E7D3)}
@media (max-width:340px){.av-card{flex-direction:column}.av-fig{flex-basis:auto;width:130px}}`;
  document.head.appendChild(st);
})();
