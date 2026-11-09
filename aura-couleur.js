/* Diva Divina — Colorimétrie avec une feuille blanche (v182).
   La cliente tient une feuille blanche (A4) à côté de son visage. Sur le téléphone, sans IA :
   1) on trouve la feuille : la plus grande zone claire et sans couleur de la photo (hors visage) ;
   2) on corrige la lumière : chaque canal est multiplié pour que la feuille redevienne blanche neutre
      (une lampe jaune ou une fenêtre bleutée ne fausse plus le teint) ;
   3) on mesure le teint sur les joues et le front (points du visage de aura-mesure.js), corrigé lui aussi ;
   4) Gemini reçoit la photo CORRIGÉE + ces mesures en mots (clarté, sous-ton mesuré), à croiser avec ce qu'il voit.
   Aucun chiffre n'est montré à la cliente ; le résultat dit seulement si la lumière a été corrigée (`wb`).
   Seuils réglables dans COL_SEUILS. Les fonctions de calcul n'utilisent pas le navigateur : tests/couleur.js. */
(function (root) {
"use strict";
const COL_SEUILS = {
  neutre: 0.30,       // la feuille peut être teintée par la lumière (lampe jaune : ~20 %), mais reste peu colorée
  clair: 160,         // et claire (canal le plus fort ≥ 160 sur 255)
  brule: 252,         // mais pas brûlée (aucun canal ≥ 252 : plus d'information)
  haut: 0.85,         // la feuille est la zone la plus lumineuse : au moins 85 % de la luminosité max de la photo (hors visage)
  zone_min: 0.015,    // elle doit couvrir au moins 1,5 % de la photo
  gain_max: 1.40,     // correction plus forte que 40 % sur un canal = ce n'est sans doute pas une feuille blanche (mur coloré)
  dominante: 0.06,    // écart rouge / bleu de la feuille au-delà duquel on parle de lumière chaude / froide
  // Teint mesuré (CIELAB, après correction) : clarté L* et angle de teinte h° (plus haut = plus doré)
  L: [[70, "claire"], [58, "moyenne"], [45, "mate"], [0, "foncée"]],
  dore: 58, rose: 50
};

// sRGB (0–255) → CIELAB (D65)
function lab([r, g, b]) {
  const f = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const R = f(r), G = f(g), B = f(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const t = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  const L = 116 * t(Y) - 16, A = 500 * (t(X) - t(Y)), Bb = 200 * (t(Y) - t(Z));
  return { L, a: A, b: Bb, h: (Math.atan2(Bb, A) * 180 / Math.PI + 360) % 360 };
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; };

// Feuille blanche : pixels clairs, sans couleur, non brûlés, hors du cadre du visage. data = RGBA (Uint8ClampedArray).
// Renvoie {rgb:[r,g,b], part} ou null si la zone est trop petite.
function feuille(data, w, h, cadre) {
  const S = COL_SEUILS, cand = [];
  const [x0, y0, x1, y1] = cadre ? [cadre[0] * w, cadre[1] * h, cadre[2] * w, cadre[3] * h] : [-1, -1, -1, -1];
  let n = 0, lmax = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    n++;
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
    const i = (y * w + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx >= S.brule) continue;
    const l = r + g + b; if (l > lmax) lmax = l;
    if (mx < S.clair || (mx - mn) / mx > S.neutre) continue;
    cand.push([r, g, b, l]);
  }
  const sel = cand.filter(p => p[3] >= S.haut * lmax), part = n ? sel.length / n : 0;
  if (part < S.zone_min) return null;
  const rgb = [0, 1, 2].map(c => med(sel.map(p => p[c])));
  const g = gains(rgb);
  if (Math.max(...g) / Math.min(...g) > S.gain_max) return null;
  return { rgb, part };
}
// Gains pour que la feuille devienne gris neutre (on garde sa luminosité).
function gains(ref) { const m = (ref[0] + ref[1] + ref[2]) / 3; return ref.map(c => m / Math.max(1, c)); }
function dominante(ref) {
  const [r, , b] = ref, d = (r - b) / Math.max(1, (r + b) / 2);
  return d > COL_SEUILS.dominante ? "chaude" : d < -COL_SEUILS.dominante ? "froide" : "neutre";
}
// Teint moyen autour d'un point (x, y en 0–1) : on écarte les reflets et les ombres (20 % de chaque côté).
function echantillon(data, w, h, [px, py], rayon) {
  const cx = Math.round(px * w), cy = Math.round(py * h), out = [];
  for (let y = cy - rayon; y <= cy + rayon; y++) for (let x = cx - rayon; x <= cx + rayon; x++) {
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const i = (y * w + x) * 4; out.push([data[i], data[i + 1], data[i + 2]]);
  }
  out.sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2]));
  const k = Math.floor(out.length * 0.2), mid = out.slice(k, out.length - k);
  if (!mid.length) return null;
  return [0, 1, 2].map(c => mid.reduce((s, p) => s + p[c], 0) / mid.length);
}
// Description en mots du teint mesuré (jamais de chiffre affiché à la cliente).
function teintMots(rgb) {
  const l = lab(rgb), S = COL_SEUILS;
  const clarte = S.L.find(([v]) => l.L >= v)[1];
  const sous = l.h >= S.dore ? "plutôt doré (chaud)" : l.h <= S.rose ? "plutôt rosé (froid)" : "neutre";
  return { clarte, sous, lab: l };
}

// Dans l'app : prépare la photo de visage pour la colorimétrie.
// Renvoie {img (File corrigé ou null), wb (feuille trouvée), faits (phrase pour Gemini), dom}.
async function preparer(file) {
  const vide = { img: null, wb: false, faits: "", dom: "" };
  if (!file || typeof document === "undefined") return vide;
  try {
    let m = null; try { m = root.MESURE ? await root.MESURE.mesurer(file, 12000) : null; } catch (e) { m = null; }
    const t = m && !m.erreur && m.teint;
    const cv = await new Promise((ok, ko) => { const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, 1024 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c); };
      im.onerror = () => { URL.revokeObjectURL(u); ko(new Error("photo")); }; im.src = u; });
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height, img = ctx.getImageData(0, 0, W, H), d = img.data;
    const f = feuille(d, W, H, t ? t.cadre : null);
    const faits = [];
    let peau = null;
    if (t) {
      const r = Math.max(3, Math.round(W / 90)), ps = [...t.joues, t.front].map(p => echantillon(d, W, H, p, r)).filter(Boolean);
      if (ps.length) peau = [0, 1, 2].map(c => ps.reduce((s, p) => s + p[c], 0) / ps.length);
    }
    if (f) {
      const g = gains(f.rgb);
      for (let i = 0; i < d.length; i += 4) { d[i] = Math.min(255, d[i] * g[0]); d[i + 1] = Math.min(255, d[i + 1] * g[1]); d[i + 2] = Math.min(255, d[i + 2] * g[2]); }
      ctx.putImageData(img, 0, 0);
      if (peau) peau = peau.map((c, i) => Math.min(255, c * g[i]));
      const dom = dominante(f.rgb);
      faits.push("La cliente tenait une feuille blanche : le téléphone a corrigé la lumière de la photo (lumière d'origine " + dom + "), les couleurs de cette photo sont donc fiables.");
      if (peau) { const tm = teintMots(peau); faits.push("Teint mesuré par le téléphone sur les joues et le front, après correction : peau " + tm.clarte + ", sous-ton " + tm.sous + ". C'est une mesure à croiser avec ce que tu vois (cheveux, yeux, contraste), pas une règle absolue."); }
      const blob = await new Promise(ok => cv.toBlob(ok, "image/jpeg", 0.9));
      const out = blob ? new File([blob], "visage-corrige.jpg", { type: "image/jpeg" }) : null;
      return { img: out, wb: true, faits: faits.join(" "), dom };
    }
    faits.push("Il n'y avait pas de feuille blanche sur la photo : la lumière n'a pas pu être corrigée, méfie-toi d'une lumière trop jaune ou trop bleue qui fausse le teint.");
    return { img: null, wb: false, faits: faits.join(" "), dom: "" };
  } catch (e) { return vide; }
}

const api = { COL_SEUILS, lab, feuille, gains, dominante, echantillon, teintMots, preparer };
if (typeof module !== "undefined" && module.exports) module.exports = api;
root.COULEUR = api;
})(typeof window !== "undefined" ? window : globalThis);
