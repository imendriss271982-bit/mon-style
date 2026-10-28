// Tests UX v102 : barre du bas à 5 onglets, onglet actif, accueil (recommandation réelle), garde-robe ≠ tenues,
// idées de la page Aura, arabe RTL, pas de défilement horizontal de 320 à 1280 px, données conservées.
// Lancer : python3 -m http.server 8765, puis : node tests/ux.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
const items=[['Abaya noire','abaya','#111111'],['Chemise soie','haut','#f5efe6'],['Pantalon beige','pantalon','#d9c3a5'],['Jupe plissée','jupe','#6e1230'],['Blazer camel','veste','#c19a6b'],['Top blanc','haut','#ffffff'],['Jean','pantalon','#1c2d5a'],['Escarpins','chaussures','#111111']].map((x,i)=>({id:'i'+i,nom:x[0],cat:x[1],hex:x[2]}));
(async()=>{const b=await chromium.launch();const errs=[];
 const open=async(w,setup)=>{const p=await b.newPage({viewport:{width:w,height:820}});p.on('pageerror',e=>errs.push(w+': '+e.message));p.on('dialog',d=>d.dismiss());
  await p.goto(URL);await p.evaluate(setup);await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});return p};
 const fresh=()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}))};
 const full=new Function('items',`localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}));localStorage.setItem('monstyle_gr',JSON.stringify({items:${JSON.stringify(items)},looks:{quotidien:[{titre:'Chic du lundi',pieces:['i1','i2','i4'],conseil:'Le camel réchauffe le beige.',manque:''}]},saved:[]}))`);
 // ——— Navigation ———
 let p=await open(390,fresh);
 const labels=await p.$$eval('#dock button',bs=>bs.map(x=>x.textContent.trim()));
 ok(labels.join('|')==='Accueil|Garde-robe|Aura|Boutique|Profil','Barre du bas : 5 onglets nommés ('+labels.join(', ')+')');
 for(const g of ['garde','chat','boutique','profil','home']){await p.click(`#dock [data-go="${g}"]`);await p.waitForTimeout(200);
  ok(await p.evaluate(g=>S.page===g&&document.querySelector(`#dock [data-go="${g}"]`).getAttribute('aria-current')==='page'&&document.querySelectorAll('#dock [aria-current]').length===1,g),'Onglet '+g+' ouvert et marqué actif')}
 ok(await p.$$eval('#dock button',bs=>bs.every(x=>{const r=x.getBoundingClientRect();return r.height>=44&&r.width>=44})),'Cibles tactiles de la barre ≥ 44 px');
 for(const [pg,tab] of [['tenues','garde'],['beaute','home'],['news','home'],['o_photo','home'],['prefs','profil']]){await p.evaluate(x=>go(x),pg);await p.waitForTimeout(150);
  ok(await p.evaluate(t=>document.querySelector(`#dock [data-go="${t}"]`).getAttribute('aria-current')==='page',tab),`Page ${pg} : onglet ${tab} reste actif`)}
 // ——— Accueil, nouvelle cliente ———
 await p.evaluate(()=>home());await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!!document.querySelector('[data-view="chat"].hz-st')&&!!document.querySelector('.hz-acts [data-go="tenues"]')&&!!document.querySelector('.hz-acts [data-go="garde"]')),'Accueil : 3 actions (Aura, créer une tenue, garde-robe)');
 ok(await p.evaluate(()=>/Découvre ton style/.test(document.querySelector('.hr-card').innerText)&&!!document.querySelector('.hr-card [data-onb]')),'Nouvelle cliente : prochaine étape claire, sans tenue inventée');
 ok(await p.evaluate(()=>['boutique','beaute','news'].every(g=>document.querySelector(`.hz [data-go="${g}"]`))),'Boutique, Beauté, Nouveautés accessibles depuis l’accueil');
 await p.evaluate(()=>go('tenues'));ok(await p.evaluate(()=>!!document.querySelector('.gr-empty [data-go="garde"]')),'Mes tenues vide : renvoie vers la garde-robe');
 await p.evaluate(()=>go('garde'));ok(await p.evaluate(()=>!!document.querySelector('[data-gadd]')&&!!document.querySelector('[data-gmanual]')&&/vide/.test(document.querySelector('.gr-empty').innerText)),'Garde-robe vide : ajout visible et message clair');
 // ——— Idées de la page Aura ———
 await p.evaluate(()=>{go('chat');window.__sent=[];window.send=t=>__sent.push(t)});
 await p.click('[data-chsay="Aide-moi à décider avant d’acheter une pièce."]');ok(await p.evaluate(()=>__sent[0]==='Aide-moi à décider avant d’acheter une pièce.'),'Aura : « Avant d’acheter » envoie la vraie question');
 await p.click('.ch-sug [data-go="tenues"]');ok(await p.evaluate(()=>S.page==='tenues'),'Aura : « Créer une tenue » ouvre Mes tenues');
 await p.close();
 // ——— Accueil avec garde-robe : recommandation réelle ———
 p=await open(390,full);
 ok(await p.evaluate(()=>/Chic du lundi/.test(document.querySelector('.hr-card').innerText)&&document.querySelectorAll('.hr-card .gr-ph,.hr-card img').length===0),'Accueil : la recommandation est une vraie tenue créée, sans photo de vêtements');
 await p.click('.hr-card');await p.waitForTimeout(200);ok(await p.evaluate(()=>S.page==='tenues'&&/Chic du lundi/.test(document.body.innerText)&&!!document.querySelector('[data-galt="quotidien:0:chic"]')),'Recommandation → Mes tenues, avec les ajustements');
 await p.evaluate(()=>go('garde'));ok(await p.evaluate(()=>!document.querySelector('.gr-look')&&document.querySelectorAll('.gr-grid .gr-it').length===8&&!!document.querySelector('.gr-tot')),'Garde-robe : seulement les articles, lien vers Mes tenues');
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('monstyle_gr')).items.length===8),'Données de garde-robe conservées');
 // ——— Arabe ———
 await p.evaluate(()=>{S.lang='ar';save();home();window.i18nApply&&i18nApply()});await p.waitForTimeout(400);
 ok(await p.evaluate(()=>document.documentElement.dir==='rtl'&&/خزانة/.test(document.querySelector('#dock [data-go="garde"]').innerText)&&/المتجر/.test(document.querySelector('#dock [data-go="boutique"]').innerText)),'Arabe : RTL et barre du bas traduite');
 ok(await p.evaluate(()=>{const xs=[...document.querySelectorAll('#dock button')].map(x=>x.getBoundingClientRect().left);return xs[0]>xs[4]}),'Arabe : Accueil à droite (ordre RTL)');
 await p.close();
 // ——— Largeurs ———
 for(const w of [320,360,390,430,768,1280]){p=await open(w,full);const bad=[];
  for(const pg of ['home','garde','tenues','chat','profil','prefs','boutique','beaute','news']){await p.evaluate(x=>{S.hist=[];go(x)},pg);await p.waitForTimeout(700);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth,cut:[...document.querySelectorAll('#page button,#dock button')].filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='visible'&&!e.closest('.fchips,.gr-occ,.pf-sw,[class*=scroll]')).length}));
   if(r.sw>r.W)bad.push(pg+' déborde ('+r.sw+'>'+r.W+')')}
  ok(!bad.length,w+' px : aucun défilement horizontal'+(bad.length?' — '+bad.join(', '):''));await p.close()}
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 console.log(fails?fails+' échec(s)':'Tous les tests passent');await b.close();process.exit(fails?1:0)})();
