// Tests de la colorimétrie avec feuille blanche (v182) : calculs (Node) puis, avec PAGE=1, branchement dans l'app.
// Lancer : node tests/couleur.js   et   PAGE=1 node tests/couleur.js (serveur local sur le port 8765)
const C = require('../aura-couleur.js');
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };

// Image synthétique 200×200 : fond gris foncé, feuille (40×80 px) éclairée par une lampe jaune, « visage » au centre.
function image(feuilleRGB, peauRGB, avecFeuille = true) {
  const w = 200, h = 200, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = [70, 60, 55];
    if (avecFeuille && x < 40 && y > 60 && y < 140) c = feuilleRGB;
    if (x >= 70 && x < 150 && y >= 40 && y < 170) c = peauRGB;
    const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  return { d, w, h };
}
const cadre = [70 / 200, 40 / 200, 150 / 200, 170 / 200];

// 1. Feuille trouvée sous lumière chaude
let im = image([248, 232, 205], [200, 150, 120]);
let f = C.feuille(im.d, im.w, im.h, cadre);
ok(f && Math.abs(f.rgb[0] - 248) <= 1 && f.part > 0.05, 'Feuille blanche trouvée (lumière chaude)');
ok(C.dominante(f.rgb) === 'chaude', 'Lumière d’origine reconnue comme chaude');
const g = C.gains(f.rgb), corr = f.rgb.map((c, i) => c * g[i]);
ok(Math.max(...corr) - Math.min(...corr) < 1, 'Après correction, la feuille est un blanc neutre');
ok(C.dominante([215, 225, 248]) === 'froide' && C.dominante([240, 240, 238]) === 'neutre', 'Lumière froide / neutre reconnue');

// 2. Pas de feuille → rien (et le visage clair n'est pas pris pour une feuille)
im = image([0, 0, 0], [235, 228, 222], false);
ok(C.feuille(im.d, im.w, im.h, cadre) === null, 'Sans feuille : pas de correction (le visage clair est exclu)');
im = image([255, 255, 255], [200, 150, 120]);
ok(C.feuille(im.d, im.w, im.h, cadre) === null, 'Feuille « brûlée » (255 partout) : refusée, pas d’information');

// 3. Teint en mots (aucun chiffre pour la cliente)
const chaud = C.teintMots([214, 168, 128]), froid = C.teintMots([226, 182, 182]), fonce = C.teintMots([110, 72, 52]);
ok(/doré/.test(chaud.sous) && /rosé/.test(froid.sous), 'Sous-ton mesuré : doré pour une peau dorée, rosé pour une peau rosée');
ok(fonce.clarte === 'foncée' && ['claire', 'moyenne'].includes(froid.clarte), 'Clarté de peau : claire / foncée');
ok(!/\d/.test(chaud.clarte + chaud.sous), 'Description du teint sans chiffre');

// 4. Échantillon de peau : reflets et ombres écartés
im = image([248, 232, 205], [200, 150, 120]);
const e = C.echantillon(im.d, im.w, im.h, [0.55, 0.5], 5);
ok(e && Math.abs(e[0] - 200) < 1, 'Teint mesuré au bon endroit');

if (!process.env.PAGE) { console.log(fails ? fails + ' échec(s)' : 'Tout est bon'); process.exit(fails ? 1 : 0); }

// ——— Dans l'app (PAGE=1) ———
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', x => errs.push(x.message));
  await p.route('https://cdn.jsdelivr.net/**', r => r.abort());
  await p.goto('http://localhost:8765/');
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('monstyle', JSON.stringify({ nom: 'Sara', lang: 'fr', later: true })); });
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(900);
  // Photo : feuille sous lumière chaude à gauche, visage au centre ; mesure du visage simulée (points des joues).
  const r = await p.evaluate(async () => {
    document.getElementById('splash')?.remove();
    const c = document.createElement('canvas'); c.width = 400; c.height = 400; const x = c.getContext('2d');
    x.fillStyle = 'rgb(70,60,55)'; x.fillRect(0, 0, 400, 400); x.fillStyle = 'rgb(248,232,205)'; x.fillRect(0, 120, 80, 160);
    x.fillStyle = 'rgb(214,168,128)'; x.fillRect(140, 80, 160, 260);
    const blob = await new Promise(ok => c.toBlob(ok, 'image/png')); const file = new File([blob], 'v.png', { type: 'image/png' });
    MESURE.mesurer = async () => ({ forme: 'Ovale', teint: { joues: [[0.45, 0.55], [0.6, 0.55]], front: [0.55, 0.3], cadre: [0.35, 0.2, 0.75, 0.85] } });
    const col = await COULEUR.preparer(file);
    let px = null;
    if (col.img) { const bm = await createImageBitmap(col.img), c2 = document.createElement('canvas'); c2.width = bm.width; c2.height = bm.height; const x2 = c2.getContext('2d'); x2.drawImage(bm, 0, 0); px = [...x2.getImageData(Math.round(bm.width * 0.1), Math.round(bm.height * 0.5), 1, 1).data].slice(0, 3); }
    // Sans feuille
    const c3 = document.createElement('canvas'); c3.width = 400; c3.height = 400; const x3 = c3.getContext('2d'); x3.fillStyle = 'rgb(70,60,55)'; x3.fillRect(0, 0, 400, 400); x3.fillStyle = 'rgb(214,168,128)'; x3.fillRect(140, 80, 160, 260);
    const f3 = new File([await new Promise(ok => c3.toBlob(ok, 'image/png'))], 'v3.png', { type: 'image/png' });
    const sans = await COULEUR.preparer(f3);
    // Prompt de colorimétrie : mesures en mots, pas de L*a*b*
    const pr = PR_COUL(col);
    // Page photo : consigne de la feuille quand la colorimétrie est au programme
    S.flow = ['a_face', 'k_run', 'r_couleurs']; go('a_face'); await new Promise(z => setTimeout(z, 300));
    const consigne = document.querySelector('.col-feuille') ? document.querySelector('.col-feuille').innerText : '';
    // Résultat avec correction
    S.res.couleurs = { saison: Object.keys(SEASONS)[0], sous_ton: 'chaud', contraste: 'moyen', pourquoi: 'Ton teint doré.', wb: true, indice_T: 1.4 }; S.flow = null; go('r_couleurs'); await new Promise(z => setTimeout(z, 300));
    const res = document.getElementById('page').innerText;
    S.res.couleurs.wb = false; render(false); await new Promise(z => setTimeout(z, 200));
    const res2 = document.getElementById('page').innerText;
    return { wb: col.wb, faits: col.faits, px, sansWb: sans.wb, sansFaits: sans.faits, pr, consigne, res, res2 };
  });
  ok(r.wb && r.px && Math.max(...r.px) - Math.min(...r.px) <= 4, 'Dans l’app : feuille trouvée, photo corrigée (la feuille devient blanche neutre)');
  ok(/feuille blanche/.test(r.faits) && /doré/.test(r.faits) && !/\d/.test(r.faits), 'Gemini reçoit les mesures en mots (lumière corrigée, teint doré), sans chiffre');
  ok(!r.sansWb && /pas de feuille blanche/.test(r.sansFaits), 'Sans feuille : Gemini est prévenu que la lumière n’est pas corrigée');
  ok(/feuille blanche/.test(r.pr) && !/L\*a\*b\*|indice T/i.test(r.pr) && /AUCUN chiffre/.test(r.pr), 'Prompt de colorimétrie : plus de L*a*b* ni d’indice T');
  ok(/feuille blanche/.test(r.consigne), 'Page photo : consigne « tiens une feuille blanche »');
  ok(/Lumière corrigée avec ta feuille blanche/.test(r.res) && !/indice T|1[.,]4/.test(r.res), 'Résultat : « Lumière corrigée », aucun indice affiché');
  ok(/Sans feuille blanche/.test(r.res2), 'Résultat sans feuille : conseil de refaire la photo');
  ok(!errs.length, 'Aucune erreur JavaScript' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' échec(s)' : 'Tout est bon'); process.exit(fails ? 1 : 0);
})();
