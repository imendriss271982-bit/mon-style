// Tests du profil de goûts appris (v182) : 👍/👎 sur les tenues → couleurs et pièces aimées / rejetées,
// envoyées à Diva et visibles dans Mes préférences. Lancer : python3 -m http.server 8765, puis : node tests/gouts.js
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:8765/';
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto(URL);
  await p.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('monstyle', JSON.stringify({ nom: 'Sara', lang: 'fr', later: true }));
    localStorage.setItem('monstyle_gr', JSON.stringify({ items: [
      { id: 'a', cat: 'haut', nom: 'Chemise', couleur: 'Blanc', type: 'Chemise ample' },
      { id: 'b', cat: 'bas', nom: 'Pantalon', couleur: 'Noir', type: 'Pantalon droit' },
      { id: 'c', cat: 'haut', nom: 'Top', couleur: 'Orange', type: 'Top à volants' },
      { id: 'd', cat: 'bas', nom: 'Jupe', couleur: 'Orange', type: 'Jupe midi' }],
      looks: { travail: [{ titre: 'Bureau net', pieces: ['a', 'b'], conseil: '' }, { titre: 'Orange vif', pieces: ['c', 'd'], conseil: '' }] }, saved: [] }));
  });
  await p.goto(URL); await p.waitForTimeout(900);
  await p.evaluate(() => { document.getElementById('splash')?.remove(); S.grOcc = 'travail'; S.hist = []; go('tenues'); });
  await p.waitForTimeout(500);
  ok(await p.$$eval('[data-pfids]', l => l.length) === 4, 'Chaque 👍 / 👎 connaît les pièces de la tenue');
  const bons = await p.$$('[data-pfgood]'), mauvais = await p.$$('[data-pfbad]');
  await bons[0].click(); await p.waitForTimeout(150);
  await bons[0].click(); await p.waitForTimeout(150); // 2e appui sur le même 👍 : ne compte pas deux fois
  let gt = await p.evaluate(() => GT);
  ok(gt.c.blanc === 1 && gt.t['pantalon droit'] === 1, '👍 : couleurs et pièces de la tenue +1 (une seule fois)');
  await (await p.$$('[data-pfbad]'))[1].click(); await p.waitForTimeout(150);
  // Même tenue « Orange vif » rejetée une 2e fois (nouvelle version proposée)
  await p.evaluate(() => { GR.looks.travail.push({ titre: 'Orange encore', pieces: ['c', 'd'], conseil: '' }); render(false); });
  await p.waitForTimeout(200);
  await (await p.$$('[data-pfbad]'))[2].click(); await p.waitForTimeout(150);
  gt = await p.evaluate(() => GT);
  ok(gt.c.orange <= -2, '👎 répétés : l’orange descend (' + gt.c.orange + ')');
  // Enregistrer une tenue = +0,5
  await (await p.$$('[data-gsave]'))[0].click(); await p.waitForTimeout(150);
  gt = await p.evaluate(() => GT);
  ok(gt.c.blanc === 1.5, 'Tenue enregistrée : +0,5');
  await p.evaluate(() => { gtNote(['a', 'b'], 1); });
  const ctx = await p.evaluate(() => pfCtx()), rules = await p.evaluate(() => pfRules());
  ok(/rejette souvent ces couleurs : orange/.test(ctx) && /choisit souvent ces couleurs : blanc/.test(ctx), 'Diva reçoit ce que la cliente aime et rejette');
  ok(/Évite autant que possible ce qu’elle rejette souvent : orange/.test(rules), 'Règle pour Diva : éviter l’orange');
  ok(/rejette souvent/.test(await p.evaluate(() => PR_OUT())), 'Le profil de goûts entre dans l’Outfit check');
  // Mes préférences
  await p.evaluate(() => { S.hist = []; go('prefs'); }); await p.waitForTimeout(400);
  const txt = await p.textContent('#page');
  ok(/Ce que Diva a appris de tes goûts/.test(txt) && /Tu choisis souvent/.test(txt) && /Tu rejettes souvent/.test(txt) && /orange/.test(txt), 'Mes préférences : ce que Diva a appris (aime / rejette)');
  ok(!/pas de synchronisation/.test(txt) && /dans ton compte/.test(txt), 'Texte mis à jour : gardé dans le compte');
  await p.click('[data-gtwipe]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !Object.keys(GT.c).length) && /Note les tenues de Diva/.test(await p.textContent('#page')), 'Remettre à zéro');
  // Arabe
  await p.evaluate(() => { gtNote(['a', 'b'], 3); S.lang = 'ar'; save(); i18nApply(); render(false); }); await p.waitForTimeout(400);
  ok(/شو تعلّمت ديفا عن ذوقچ/.test(await p.textContent('#page')), 'Traduit en arabe');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Pas de débordement');
  // Effacer toutes mes données
  await p.evaluate(() => { S.lang = 'fr'; save(); S.hist = []; go('profil'); }); await p.waitForTimeout(400);
  await p.click('[data-wipe]'); await p.waitForTimeout(300);
  ok(await p.evaluate(() => !localStorage.getItem('monstyle_gouts') && !Object.keys(GT.c).length), '« Effacer toutes mes données » efface aussi les goûts appris');
  ok(await p.evaluate(() => CP_KEYS.includes('monstyle_gouts')), 'Les goûts appris sont sauvegardés dans le compte');
  ok(!errs.length, 'Aucune erreur JavaScript' + (errs.length ? ' — ' + errs.join(' | ') : ''));
  await b.close(); console.log(fails ? fails + ' échec(s)' : 'Tout est bon'); process.exit(fails ? 1 : 0);
})();
