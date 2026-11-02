// Tests « Abaya et occasions du Golfe » (v142) : carte de l'accueil, onglet abaya personnalisé (silhouette, taille,
// saison, visage), occasions (codes, fête nationale selon le pays), lien depuis « Que porter aujourd'hui ? »,
// codes ajoutés aux prompts des tenues, « Créer ma tenue », langues et largeurs.
// Lancer : python3 -m http.server 8765, puis : node tests/golfe.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://api.open-meteo.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({current:{temperature_2m:30},daily:{temperature_2m_max:[33],temperature_2m_min:[25]}})}));
 const boot=async()=>{await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(200)};
 await p.goto(URL);
 // Sans analyse
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}))});
 await boot();
 ok(await p.$('.go-entree[data-view="golfe"]'),'Accueil : carte « Abaya et occasions »');
 ok(await p.evaluate(()=>{const c=document.querySelector('.go-entree'),h=[...document.querySelectorAll('.hz-h')].find(x=>/Pour toi/.test(x.textContent));return c&&h&&(c.compareDocumentPosition(h)&Node.DOCUMENT_POSITION_FOLLOWING)}),'Carte placée juste avant « Pour toi aujourd’hui »');
 await p.click('.go-entree');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.page==='golfe'&&/Fais ton analyse de silhouette/.test(document.body.innerText)&&!!document.querySelector('[data-mod="corps"]')),'Sans analyse : invitation à faire l’analyse');
 // Avec analyse : Poire, petite, visage Rond, saison connue
 await p.evaluate(()=>{const s=Object.keys(SEASONS)[0];localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,info:{taille:155},res:{corps:{forme:'A · Poire'},visage:{forme:'Rond'},couleurs:{saison:s}}}))});
 await boot();await p.evaluate(()=>go('golfe'));await p.waitForTimeout(300);
 const t=await p.evaluate(()=>document.querySelector('.go-card').innerText);
 ok(/abaya trapèze/.test(t)&&/ceintures basses/.test(t),'Poire : abaya trapèze, ceintures basses à éviter');
 ok(/tu parais plus grande/.test(t),'Petite taille : conseil de longueur');
 ok(/(lin, crêpe léger|crêpe épais)/.test(t),'Tissu selon la saison du Golfe');
 ok(/pans qui tombent droit/.test(t),'Visage rond : drapé de sheila adapté');
 ok(await p.evaluate(()=>!season()||document.querySelectorAll('.go-sw i').length>0),'Couleurs de sa palette pour une abaya de couleur');
 // Occasions
 await p.click('[data-gtab="occ"]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.querySelectorAll('[data-golfe]').length===GOLFE_OCC.length),'Liste des '+await p.evaluate(()=>GOLFE_OCC.length)+' occasions');
 await p.click('[data-golfe="mariage"]');await p.waitForTimeout(300);
 const m=await p.evaluate(()=>document.body.innerText);
 ok(await p.evaluate(()=>S.page==='golfe_occ')&&/réservé à la mariée/.test(m)&&/Pour ta silhouette \(Poire\)/.test(m),'Mariage : codes, à éviter, conseil pour sa silhouette');
 ok(await p.$('[data-gotenue="mariage"]'),'Mariage : bouton « Créer ma tenue avec ma garde-robe »');
 await p.click('[data-gotenue="mariage"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.page==='tenues'&&S.grOcc==='mariage'),'Le bouton ouvre Mes tenues sur l’occasion Mariage');
 await p.evaluate(()=>{S.gocc='garangao';go('golfe_occ')});await p.waitForTimeout(200);
 ok(await p.evaluate(()=>/assortie à celle des enfants/.test(document.body.innerText)&&!document.querySelector('[data-gotenue]')),'Garangao : codes, sans bouton de tenue (pas une occasion de la garde-robe)');
 const nat=await p.evaluate(()=>{const r={};for(const c of ['QA','SA','AE']){S.pays=c;const g=golfeOcc('national');r[c]=g.s+' | '+g.code}return r});
 ok(/18 décembre/.test(nat.QA)&&/bordeaux et blanc/.test(nat.QA)&&/23 septembre/.test(nat.SA)&&/2 décembre/.test(nat.AE),'Fête nationale selon le pays (Qatar, Arabie, Émirats)');
 await p.evaluate(()=>{S.pays='QA';save()});
 // Codes dans les prompts des tenues
 ok(await p.evaluate(()=>/CODES DU GOLFE/.test(golfeRegle('mariage'))&&/blanc, réservé à la mariée/.test(golfeRegle('mariage'))&&golfeRegle('weekend')===''),'golfeRegle : codes pour les occasions du Golfe, rien pour le week-end');
 const it=['haut','haut','pantalon','jupe','abaya','veste','chaussures','sac'].map((c,i)=>({id:'i'+i,cat:c,nom:'Pièce '+i,couleur:'noir',hex:'#222222'}));
 await p.evaluate(x=>{localStorage.setItem('monstyle_gr',JSON.stringify({items:x,looks:{},saved:[]}))},it);await boot();
 await p.evaluate(()=>{window.__pr=[];const ids=GR.items.map(x=>x.id);SAMPLE={json:async pr=>{__pr.push(pr);return /Choisis UNE seule tenue/.test(pr)?{titre:'Iftar doux',pieces:[ids[4],ids[6]],conseil:'Fluide.',manque:''}:{tenues:[{titre:'Soir',pieces:[ids[4],ids[6]],conseil:'Ok.',manque:''}]}}}});
 await p.evaluate(()=>grLooks('ramadan'));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/CODES DU GOLFE/.test(__pr[0])&&/Compose-les UNIQUEMENT/.test(__pr[0])),'Créer une tenue (Ramadan) : codes du Golfe dans le prompt');
 await p.evaluate(()=>{S.jrOcc='ramadan';go('jour')});await p.waitForTimeout(300);
 ok(await p.$('.go-lien[data-golfe="ramadan"]'),'Que porter aujourd’hui ? : lien vers les codes de l’occasion');
 await p.click('[data-jgo]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/CODES DU GOLFE/.test(__pr[__pr.length-1])),'Que porter aujourd’hui ? : codes du Golfe dans le prompt');
 await p.evaluate(()=>{S.jrOcc='weekend';go('jour')});await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!document.querySelector('.go-lien')),'Pas de lien pour une occasion sans code du Golfe');
 // Langues
 for(const [lang,t1,t2] of [['en','Abaya & occasions','Wedding'],['ar','العباية والمناسبات','عرس']]){
  await p.evaluate(l=>{S.lang=l;S.gtab='abaya';go('golfe')},lang);await p.waitForTimeout(300);
  const h=await p.evaluate(()=>document.querySelector('h1').textContent.trim());
  const fr=await p.evaluate(()=>/abaya trapèze|Le tissu|Ta sheila/.test(document.querySelector('.go-card').innerText));
  await p.evaluate(()=>{S.gocc='mariage';go('golfe_occ')});await p.waitForTimeout(300);
  const h2=await p.evaluate(()=>document.querySelector('h1').textContent);
  ok(h===t1&&!fr&&h2.includes(t2),'Traduit ('+lang+') : '+h+' / '+h2.trim())}
 // Largeurs
 await p.evaluate(()=>{S.lang='fr';save()});
 for(const w of [320,360,390,430,768,1280]){await p.setViewportSize({width:w,height:800});const bad=[];
  for(const [pg,tab] of [['golfe','abaya'],['golfe','occ'],['golfe_occ',''],['home','']]){await p.evaluate(([x,tb])=>{S.hist=[];S.gtab=tb;S.gocc='mariage';go(x)},[pg,tab]);await p.waitForTimeout(700);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth,cut:[...document.querySelectorAll('#page button')].filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='visible'&&!e.closest('.fchips,.jr-occ,[class*=scroll]')).length}));
   if(r.sw>r.W)bad.push(pg+' déborde');if(r.cut)bad.push(pg+' : '+r.cut+' bouton(s) coupé(s)')}
  ok(!bad.length,w+' px : aucun défilement horizontal'+(bad.length?' — '+bad.join(', '):''))}
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 console.log(fails?fails+' test(s) en échec':'Tous les tests passent');await b.close();process.exit(fails?1:0)})();
