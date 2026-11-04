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

// v158 : l'avatar en CROQUIS DE MODE (choix d'Imen : « quelque chose de féminin », le cartoon n'était pas beau).
// Silhouette élancée (environ 8 têtes), taille marquée, longues jambes, talons, visage fin (cils, lèvres), cheveux en vagues,
// vêtements avec dégradé et plis. Toujours dessiné sur le téléphone, sans IA.
function avMix(hex, k) { // k < 0 : plus foncé, k > 0 : plus clair
  const n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return "#" + c.map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("");
}
function avSVG(items, opt) {
  opt = opt || {};
  const id = "av" + (++AV_N), [S1, W1, H1] = AV_PROP[avForme()] || AV_DEF;
  const cx = 100, sy = 84, by = 104, wy = 134, hy = 166, ky = 258, ay = 344;
  const sh = 25 * S1, w = 19 * W1, h = 26 * H1, bw = sh - 3;
  const skin = avPeau(), skinD = avMix(skin, -.14), hair = avCheveux(), hairD = avMix(hair, -.35), hairL = avMix(hair, .25);
  const H = avHabits(items), base = !items || !items.length;
  const robe = H.robe, abaya = H.abaya, haut = H.haut || (base ? { hex: "#F3E7D3" } : null);
  const bas = H.pantalon || H.jupe || (base && !robe ? { hex: "#B9A58C", cat: "pantalon" } : null);
  const isJupe = bas && bas.cat === "jupe";
  const shoes = avCol(H.chaussures, "#B08A6E");
  let defs = "";
  const grad = (k, c) => { defs += `<linearGradient id="${id}${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${avMix(c, .18)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${avMix(c, -.22)}"/></linearGradient>`; return `url(#${id}${k})`; };
  const fold = c => `stroke="${avMix(c, -.28)}" stroke-width=".9" fill="none" opacity=".55"`;
  const edge = 'stroke="rgba(41,36,33,.28)" stroke-width=".8"';
  // Corps : buste, taille fine, hanches.
  const torso = `M${cx - sh},${sy} Q${cx},${sy - 5} ${cx + sh},${sy} Q${cx + bw + 2},${by - 8} ${cx + bw},${by} Q${cx + w + 1},${wy - 12} ${cx + w},${wy} Q${cx + h + 2},${(wy + hy) / 2} ${cx + h},${hy} L${cx - h},${hy} Q${cx - h - 2},${(wy + hy) / 2} ${cx - w},${wy} Q${cx - w - 1},${wy - 12} ${cx - bw},${by} Q${cx - bw - 2},${by - 8} ${cx - sh},${sy} Z`;
  const leg = s => `M${cx + s * (h - 1)},${hy - 2} Q${cx + s * (h - 1)},${(hy + ky) / 2} ${cx + s * 13.5},${ky} Q${cx + s * 14},${ky + 30} ${cx + s * 10},${ay - 4} L${cx + s * 8.5},${ay} L${cx + s * 3.5},${ay} L${cx + s * 3},${ay - 6} Q${cx + s * 2},${ky + 26} ${cx + s * 4},${ky} Q${cx + s * 2},${hy + 30} ${cx + s * 1},${hy + 10} Z`;
  const heel = s => { const x = cx + s * 6; return `<path d="M${x - 4},${ay - 1} Q${x - 5.5},${ay + 9} ${x},${ay + 13} Q${x + 5.5},${ay + 9} ${x + 4},${ay - 1} Q${x},${ay + 3} ${x - 4},${ay - 1} Z" fill="${shoes}" ${edge}/><path d="M${x - 3.5},${ay + 1} Q${x},${ay + 4} ${x + 3.5},${ay + 1}" stroke="${avMix(shoes, .3)}" stroke-width=".8" fill="none"/>`; };
  const arm = (s, sleeve, long, wide) => {
    const x0 = cx + s * (sh - 2), xe = cx + s * (sh + 4), xw = cx + s * (h + 3);
    let o = `<path d="M${x0},${sy + 4} Q${xe + s * 1},${wy - 20} ${xe},${wy - 4} Q${xw + s * 1},${hy - 6} ${xw - s * 1},${hy + 22}" fill="none" stroke="${skin}" stroke-width="6.5" stroke-linecap="round"/><ellipse cx="${xw - s * 1}" cy="${hy + 25}" rx="3.2" ry="4.6" fill="${skin}"/>`;
    if (sleeve) {
      if (wide) o += `<path d="M${x0 - s * 2},${sy + 2} Q${xe + s * 3},${wy - 18} ${xe + s * 2},${wy} L${xw + s * 9},${hy + 18} L${xw - s * 7},${hy + 20} Q${xe - s * 4},${wy - 2} ${x0 - s * 6},${sy + 8} Z" fill="${sleeve}" ${edge}/>`;
      else o += `<path d="M${x0},${sy + 4} Q${xe + s * 1},${wy - 20} ${xe},${wy - 4}${long ? ` Q${xw + s * 1},${hy - 6} ${xw - s * 1},${hy + 16}` : ""}" fill="none" stroke="${sleeve}" stroke-width="${long ? 8.5 : 8}" stroke-linecap="round"/>`;
    }
    return o;
  };
  let back = "", body = "", front = "";
  // Cheveux derrière (longs).
  const hcy = 46, co = AV.coiffure;
  if (co === "longs") back += `<path d="M${cx - 15},${hcy - 10} Q${cx - 24},${hcy + 20} ${cx - 22},${sy + 22} Q${cx - 26},${wy - 18} ${cx - 16},${wy - 4} Q${cx - 6},${wy - 16} ${cx},${sy + 4} Q${cx + 6},${wy - 16} ${cx + 16},${wy - 4} Q${cx + 26},${wy - 18} ${cx + 22},${sy + 22} Q${cx + 24},${hcy + 20} ${cx + 15},${hcy - 10} Z" fill="${hairD}"/>`;
  // Jambes et chaussures.
  body += `<path d="${leg(-1)}" fill="${skin}"/><path d="${leg(1)}" fill="${skin}"/>` + heel(-1) + heel(1);
  body += `<path d="${torso}" fill="${skin}"/>`;
  let sleeve = null, long = false, wide = false;
  if (abaya) {
    const c = avCol(abaya, "#1B1B1B"), g = grad("ab", c);
    body += `<path d="M${cx - sh},${sy} Q${cx},${sy - 5} ${cx + sh},${sy} Q${cx + sh + 3},${wy} ${cx + h + 10},${hy + 40} Q${cx + h + 22},${ay - 30} ${cx + h + 20},${ay + 10} Q${cx},${ay + 18} ${cx - h - 20},${ay + 10} Q${cx - h - 22},${ay - 30} ${cx - h - 10},${hy + 40} Q${cx - sh - 3},${wy} ${cx - sh},${sy} Z" fill="${g}" ${edge}/>`;
    body += `<path d="M${cx},${sy - 2} Q${cx - 2},${hy} ${cx + 3},${ay + 14}" stroke="${avMix(c, .35)}" stroke-width="1" fill="none" opacity=".6"/><path d="M${cx - 14},${hy + 20} Q${cx - 18},${ky + 20} ${cx - 22},${ay + 6} M${cx + 14},${hy + 26} Q${cx + 20},${ky + 30} ${cx + 22},${ay + 8}" ${fold(c)}/>`;
    sleeve = g; wide = true;
  } else if (robe) {
    const c = avCol(robe, "#C48B95"), g = grad("ro", c);
    body += `<path d="${torso}" fill="${g}" ${edge}/><path d="M${cx - w},${wy} L${cx + w},${wy} Q${cx + h + 6},${hy} ${cx + h + 20},${ky + 22} Q${cx},${ky + 34} ${cx - h - 20},${ky + 22} Q${cx - h - 6},${hy} ${cx - w},${wy} Z" fill="${g}" ${edge}/>`;
    body += `<path d="M${cx - 6},${wy + 6} Q${cx - 12},${hy + 30} ${cx - 18},${ky + 26} M${cx + 5},${wy + 8} Q${cx + 10},${hy + 34} ${cx + 16},${ky + 28} M${cx - w},${wy} Q${cx},${wy + 3} ${cx + w},${wy}" ${fold(c)}/>`;
    sleeve = g;
  } else {
    if (bas) {
      const c = avCol(bas, "#B9A58C"), g = grad("ba", c);
      if (isJupe) body += `<path d="M${cx - w},${wy} L${cx + w},${wy} Q${cx + h + 4},${hy} ${cx + h + 14},${ky + 6} Q${cx},${ky + 14} ${cx - h - 14},${ky + 6} Q${cx - h - 4},${hy} ${cx - w},${wy} Z" fill="${g}" ${edge}/><path d="M${cx - 5},${wy + 8} Q${cx - 10},${hy + 30} ${cx - 14},${ky + 8} M${cx + 6},${wy + 8} Q${cx + 11},${hy + 30} ${cx + 13},${ky + 9}" ${fold(c)}/>`;
      else {
        const pl = s => `M${cx + s * w},${wy} Q${cx + s * (h + 2)},${(wy + hy) / 2} ${cx + s * (h + 1)},${hy} Q${cx + s * (h + 4)},${ky} ${cx + s * 19},${ay + 4} L${cx + s * 2},${ay + 4} Q${cx + s * 2},${ky} ${cx},${hy + 6} L${cx},${wy} Z`;
        body += `<path d="${pl(-1)}" fill="${g}" ${edge}/><path d="${pl(1)}" fill="${g}" ${edge}/><path d="M${cx - 10},${hy + 10} L${cx - 11},${ay} M${cx + 10},${hy + 10} L${cx + 11},${ay}" ${fold(c)}/>`;
      }
    }
    if (haut) {
      const c = avCol(haut, "#F3E7D3"), g = grad("ha", c);
      body += `<clipPath id="${id}t"><rect x="0" y="0" width="200" height="${wy + 14}"/></clipPath><path d="${torso}" fill="${g}" ${edge} clip-path="url(#${id}t)"/><path d="M${cx - w - 1},${wy + 13} Q${cx},${wy + 17} ${cx + w + 1},${wy + 13}" stroke="${avMix(c, -.25)}" stroke-width=".9" fill="none"/><path d="M${cx - 8},${sy + 2} L${cx},${by - 4} L${cx + 8},${sy + 2}" ${fold(c)}/>`;
      sleeve = g;
    }
  }
  if (H.veste && !abaya) {
    const c = avCol(H.veste, "#8C6D35"), g = grad("ve", c);
    const pan = s => `M${cx + s * sh},${sy} Q${cx + s * 12},${sy - 4} ${cx + s * 9},${sy + 2} L${cx + s * 4},${wy + 2} L${cx + s * 10},${hy + 12} L${cx + s * (h + 5)},${hy + 12} Q${cx + s * (h + 3)},${(wy + hy) / 2} ${cx + s * (w + 3)},${wy} Q${cx + s * (bw + 3)},${by} ${cx + s * sh},${sy} Z`;
    body += `<path d="${pan(-1)}" fill="${g}" ${edge}/><path d="${pan(1)}" fill="${g}" ${edge}/><path d="M${cx - 9},${sy + 2} L${cx - 16},${by - 2} L${cx - 6},${by + 6} M${cx + 9},${sy + 2} L${cx + 16},${by - 2} L${cx + 6},${by + 6}" stroke="${avMix(c, -.3)}" stroke-width="1" fill="none"/>`;
    sleeve = g; long = true; wide = false;
  }
  const arms = arm(-1, sleeve, long, wide) + arm(1, sleeve, long, wide);
  const sac = H.sac ? (() => { const c = avCol(H.sac, "#8C6D35"), x = cx + h + 8; return `<path d="M${x - 9},${hy + 22} L${x + 9},${hy + 22} L${x + 7},${hy + 38} L${x - 7},${hy + 38} Z" fill="${c}" ${edge}/><path d="M${x - 6},${hy + 22} Q${x},${hy + 12} ${x + 6},${hy + 22}" fill="none" stroke="${avMix(c, -.25)}" stroke-width="1.4"/>`; })() : "";
  // Visage : ovale fin, cou long, yeux en amande avec cils, lèvres.
  let head = co === "sheila" ? "" : `<path d="M${cx - 4.5},${hcy + 12} L${cx - 5},${sy + 1} Q${cx},${sy + 4} ${cx + 5},${sy + 1} L${cx + 4.5},${hcy + 12} Z" fill="${skinD}"/>`;
  head += `<ellipse cx="${cx}" cy="${hcy}" rx="12.5" ry="16" fill="${skin}"/>
<path d="M${cx - 9},${hcy - 1} Q${cx - 5.5},${hcy - 3.6} ${cx - 2.5},${hcy - 1} M${cx + 2.5},${hcy - 1} Q${cx + 5.5},${hcy - 3.6} ${cx + 9},${hcy - 1}" stroke="#2B211C" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M${cx - 9.2},${hcy - 1.2} l-1.6,-1.2 M${cx + 9.2},${hcy - 1.2} l1.6,-1.2" stroke="#2B211C" stroke-width=".9" stroke-linecap="round"/>
<path d="M${cx - 9.5},${hcy - 5.5} Q${cx - 6},${hcy - 8} ${cx - 2.5},${hcy - 6} M${cx + 2.5},${hcy - 6} Q${cx + 6},${hcy - 8} ${cx + 9.5},${hcy - 5.5}" stroke="${avMix(hair, -.2)}" stroke-width="1" fill="none" stroke-linecap="round"/>
<path d="M${cx},${hcy + 1} Q${cx - 1.4},${hcy + 5} ${cx + .8},${hcy + 6}" stroke="${skinD}" stroke-width=".9" fill="none" stroke-linecap="round"/>
<path d="M${cx - 4},${hcy + 9.5} Q${cx},${hcy + 8} ${cx + 4},${hcy + 9.5} Q${cx},${hcy + 13} ${cx - 4},${hcy + 9.5} Z" fill="#B9505C"/>
<ellipse cx="${cx - 7}" cy="${hcy + 5}" rx="3" ry="2" fill="#E58C8C" opacity=".28"/><ellipse cx="${cx + 7}" cy="${hcy + 5}" rx="3" ry="2" fill="#E58C8C" opacity=".28"/>`;
  if (co === "sheila") {
    const sc = avHex(AV.sheila) || AV_SHEILAS[0][0], g = grad("sh", sc);
    front += `<path d="M${cx - 15},${hcy + 2} Q${cx - 17},${hcy - 22} ${cx},${hcy - 22} Q${cx + 17},${hcy - 22} ${cx + 15},${hcy + 2} Q${cx + 17},${hcy + 18} ${cx + 12},${hcy + 22} Q${cx + sh},${sy + 2} ${cx + sh + 4},${by + 6} Q${cx + 6},${by + 2} ${cx - 2},${by + 16} Q${cx - 10},${by + 4} ${cx - sh - 4},${by + 4} Q${cx - sh},${sy + 2} ${cx - 12},${hcy + 22} Q${cx - 17},${hcy + 18} ${cx - 15},${hcy + 2} Z M${cx - 12.5},${hcy} Q${cx - 13},${hcy - 17} ${cx},${hcy - 17.5} Q${cx + 13},${hcy - 17} ${cx + 12.5},${hcy} Q${cx + 12},${hcy + 15} ${cx},${hcy + 16.5} Q${cx - 12},${hcy + 15} ${cx - 12.5},${hcy} Z" fill="${g}" fill-rule="evenodd" ${edge}/><path d="M${cx + 10},${hcy + 24} Q${cx + 18},${sy + 10} ${cx + 22},${by + 2}" ${fold(sc)}/>`;
  } else {
    // Frange et volume au-dessus du visage.
    front += `<path d="M${cx - 13.5},${hcy + 2} Q${cx - 16},${hcy - 20} ${cx + 1},${hcy - 19} Q${cx + 16},${hcy - 18} ${cx + 13.5},${hcy + 2} Q${cx + 11},${hcy - 10} ${cx + 2},${hcy - 12} Q${cx - 6},${hcy - 8} ${cx - 13.5},${hcy + 2} Z" fill="${hair}"/><path d="M${cx - 4},${hcy - 16} Q${cx + 6},${hcy - 16} ${cx + 10},${hcy - 8}" stroke="${hairL}" stroke-width="1.2" fill="none" opacity=".6"/>`;
    if (co === "longs") front += `<path d="M${cx - 13.5},${hcy} Q${cx - 18},${hcy + 18} ${cx - 15},${sy + 12} Q${cx - 20},${by + 6} ${cx - 13},${by + 14} Q${cx - 10},${by} ${cx - 9},${sy + 4} Q${cx - 11},${hcy + 16} ${cx - 11},${hcy + 4} Z M${cx + 13.5},${hcy} Q${cx + 18},${hcy + 18} ${cx + 15},${sy + 12} Q${cx + 20},${by + 6} ${cx + 13},${by + 14} Q${cx + 10},${by} ${cx + 9},${sy + 4} Q${cx + 11},${hcy + 16} ${cx + 11},${hcy + 4} Z" fill="${hair}"/><path d="M${cx - 14},${sy} Q${cx - 17},${by - 4} ${cx - 13},${by + 10} M${cx + 14},${sy} Q${cx + 17},${by - 4} ${cx + 13},${by + 10}" stroke="${hairL}" stroke-width="1" fill="none" opacity=".5"/>`;
    if (co === "attaches") front += `<ellipse cx="${cx}" cy="${hcy - 21}" rx="8.5" ry="7" fill="${hair}"/><path d="M${cx - 5},${hcy - 23} Q${cx},${hcy - 27} ${cx + 5},${hcy - 22}" stroke="${hairL}" stroke-width="1" fill="none" opacity=".6"/>`;
    if (co === "courts") front += `<path d="M${cx - 13.5},${hcy + 2} Q${cx - 17},${hcy + 14} ${cx - 12},${hcy + 17} L${cx - 10.5},${hcy + 2} Z M${cx + 13.5},${hcy + 2} Q${cx + 17},${hcy + 14} ${cx + 12},${hcy + 17} L${cx + 10.5},${hcy + 2} Z" fill="${hair}"/>`;
  }
  const lab = opt.label || "Ton avatar";
  return `<svg class="av-svg" viewBox="40 16 120 362" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(lab)}"><defs>${defs}</defs><ellipse cx="100" cy="368" rx="34" ry="4" fill="rgba(41,36,33,.10)"/>${back}${body}${arms}${sac}${head}${front}</svg>`;
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
.av-fig{flex:0 0 112px;height:290px;border-radius:16px;background:linear-gradient(180deg,#FBF6EC,#F3E7D3)}.av-svg{width:100%;height:100%;display:block}
.av-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}.av-txt>b{font-size:17px;color:var(--ink)}.av-txt small{color:var(--muted);font-size:13px;line-height:1.35}
.av-li{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--ink)}.av-li li{display:flex;align-items:center;gap:6px}.av-li i{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.12);flex:none}
.av-sil{margin:4px 0 0;font-size:12.5px;color:var(--accent)}
.av-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.av-acts .btn{width:auto;padding:9px 14px;font-size:13.5px;min-height:0}
.av-prev{width:170px;height:440px;margin:14px auto 6px;border-radius:22px;background:linear-gradient(180deg,#FBF6EC,#F3E7D3);box-shadow:0 6px 18px rgba(140,109,53,.12)}
.av-h{font-size:16px;margin:18px 0 8px}.av-chips{display:flex;flex-wrap:wrap;gap:8px}
.av-chips button{display:inline-flex;align-items:center;gap:7px;padding:8px 12px;border-radius:999px;border:1px solid #E6E6E6;background:#FFFFFF;color:var(--ink);font:inherit;font-size:14px;cursor:pointer}
.av-chips button[aria-pressed=true]{border-color:#8C6D35;box-shadow:0 0 0 2px rgba(140,109,53,.25)}.av-chips i{width:18px;height:18px;border-radius:50%;border:1px solid rgba(0,0,0,.15)}
.av-note{margin:18px 0 0;font-size:13px;color:var(--muted);text-align:center}
.av-jour{width:120px;height:320px;margin:6px auto 10px;border-radius:18px;background:linear-gradient(180deg,#FBF6EC,#F3E7D3)}
@media (max-width:340px){.av-card{flex-direction:column}.av-fig{flex-basis:auto;width:120px}}`;
  document.head.appendChild(st);
})();
