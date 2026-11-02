// Tests « Avant d'acheter » (v141) : carte de la Boutique, vérification sur la fiche d'un article (sans IA),
// page photo (IA simulée) : verdict, doublons, pièces qui vont avec (ids vérifiés), coût par port, ajout à la garde-robe,
// erreurs, langues et largeurs. Lancer : python3 -m http.server 8765, puis : node tests/achat.js
const {chromium}=require('playwright');const path=require('path'),fs=require('fs'),os=require('os');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
// Petite image PNG (un carré beige) pour simuler la photo d'une pièce.
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGP4/58BAyQ+GoP9/z8zMDAwAAAvsAPj1vDGRwAAAABJRU5ErkJggg==','base64');
const img=path.join(os.tmpdir(),'ms-piece.png');fs.writeFileSync(img,png);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 const items=[['haut','Chemise en soie','blanc','#F7F4EE'],['haut','Blouse fluide','beige','#E3D3BC'],['pantalon','Pantalon large','noir','#1C1A19'],['jupe','Jupe plissée','camel','#B98A55'],['veste','Blazer long','camel','#C29A6B'],['chaussures','Escarpins','nude','#D9B79C'],['sac','Sac structuré','noir','#222222'],['robe','Robe portefeuille','terracotta','#C5603B']].map((a,i)=>({id:'it'+i,cat:a[0],nom:a[1],couleur:a[2],hex:a[3],img:''}));
 const boot=async()=>{await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(200)};
 await p.goto(URL);
 await p.evaluate(it=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{corps:{forme:'Sablier',kibbe:'Soft Classic'}}}));localStorage.setItem('monstyle_gr',JSON.stringify({items:it,looks:{},saved:[]}))},items);
 await boot();
 // ——— Boutique : carte d'entrée ———
 await p.evaluate(()=>go('boutique'));await p.waitForTimeout(300);
 ok(await p.$('.ac-entree[data-view="achat"]'),'Boutique : carte « Ça vaut le coup ? »');
 // ——— Fiche d'un article de la vitrine : doublon (robe terracotta déjà dans la garde-robe) ———
 await p.evaluate(()=>{S.art='MS01';go('art')});await p.waitForTimeout(300);
 ok(await p.$('.ac-res'),'Fiche article : bloc « Avant d’acheter »');
 ok(await p.evaluate(()=>/À réfléchir/.test(document.querySelector('.ac-v').textContent)&&/Robe portefeuille/.test(document.querySelector('.ac-res').textContent)),'Robe terracotta : doublon trouvé → « À réfléchir »');
 ok(await p.evaluate(()=>/partenaires/.test(document.body.innerText)),'Liens des boutiques toujours présents');
 // Un haut neutre qui va avec ses bas : bon achat si sa silhouette convient
 const r=await p.evaluate(()=>{const a=CATALOGUE.find(x=>x.cat==='top'&&x.formes.includes('Sablier'));const o=acArticle(a);return {nom:a.nom,v:o.verdict.k,nb:o.nb,dup:o.dup.length,avec:o.avec.map(x=>x.id)}});
 ok(r.nb>=1&&r.avec.every(id=>/^it\d$/.test(id)),'Haut de la vitrine : pièces qui vont avec, prises dans sa garde-robe ('+r.nom+', '+r.nb+' tenue(s))');
 ok(await p.evaluate(()=>acDoublons({cat:'top',hex:'#F7F4EE',couleur:'Blanc'}).some(x=>x.id==='it0')),'Doublon : même famille (top = haut) et même couleur');
 ok(await p.evaluate(()=>acDoublons({cat:'pantalon',hex:'#F7F4EE',couleur:'Blanc'}).length===0),'Pas de doublon si la famille est différente');
 ok(await p.evaluate(()=>acVerdict(2,false,3,true).k==='oui'&&acVerdict(2,true,3,true).k==='reflechir'&&acVerdict(0,false,3,true).k==='non'&&acVerdict(2,false,0,true).k==='reflechir'&&acVerdict(-1,false,3,true).k==='reflechir'),'Règles du verdict');
 // ——— Page photo ———
 await p.evaluate(()=>go('boutique'));await p.waitForTimeout(200);await p.click('.ac-entree');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.page==='achat'&&!document.querySelector('[data-ago]')),'Page photo : pas de bouton « Vérifier » sans photo');
 await p.setInputFiles('[data-aphoto]',img);await p.waitForTimeout(300);
 ok(await p.$('.ac-prev img')&&await p.$('[data-ago]'),'Photo choisie : aperçu et bouton « Vérifier »');
 await p.fill('#ac_prix','450');
 await p.evaluate(()=>{window.__pr=[];window.__img=0;SAMPLE={json:async(pr,o)=>{__pr.push(pr);__img=o&&o.images?o.images.length:0;return {categorie:'veste',nom:'Veste en lin',couleur:'Sable',hex:'#D8C3A0',note:8,pourquoi:'La coupe cintrée suit ta taille.',similaires:['zzz'],avec:['it0','it2','zzz','it5'],conseil:'Sur ta chemise blanche et ton pantalon noir.'}}}});
 await p.click('[data-ago]');await p.waitForTimeout(500);
 const pr=await p.evaluate(()=>__pr[0]);
 ok(await p.evaluate(()=>__img===1),'La photo est envoyée à Aura');
 ok(/Sablier/.test(pr)&&/it2 : pantalon, Pantalon large, noir/.test(pr)&&/N’invente aucune pièce/.test(pr),'Aura reçoit le profil et la vraie garde-robe');
 const res=await p.evaluate(()=>AC.res);
 ok(res.verdict.k==='oui'&&res.avec.map(x=>x.id).join()==='it0,it2,it5'&&res.dup.length===0,'Bon achat, pièces inventées retirées');
 ok(await p.evaluate(()=>/Elle te va : 8\/10/.test(document.querySelector('.ac-res').textContent)&&document.querySelectorAll('.ac-ph figure').length===3),'Note et pièces qui vont avec affichées');
 ok(await p.evaluate(()=>/Coût par port/.test(document.body.innerText)&&/par port/.test(document.body.innerText)&&/450|\d+ (QAR|SAR|AED|KWD|BHD|OMR) par port/.test(document.body.innerText)&&document.body.innerText.includes(PAYS[pays()].cur+' par port')),'Coût par port affiché avec la monnaie du pays');
 const n0=await p.evaluate(()=>GR.items.length);
 await p.click('[data-aadd]');await p.waitForTimeout(500);
 ok(await p.evaluate(n=>GR.items.length===n+1&&GR.items[0].nom==='Veste en lin'&&GR.items[0].cat==='veste'&&GR.items[0].hex==='#D8C3A0',n0),'« Je l’ai achetée » ajoute la pièce à la garde-robe');
 ok(await p.$('.ac-ok'),'Bouton remplacé par « Ajoutée à ta garde-robe ✓ »');
 await p.click('[data-aadd]').catch(()=>{});ok(await p.evaluate(n=>GR.items.length===n+1,n0),'Pas d’ajout en double');
 await boot();ok(await p.evaluate(()=>GR.items.some(x=>x.nom==='Veste en lin')),'Pièce gardée après rechargement');
 // Doublon vu par l'IA
 await p.evaluate(()=>{go('achat')});await p.waitForTimeout(200);
 await p.click('[data-anew]').catch(()=>{});await p.setInputFiles('[data-aphoto]',img);await p.waitForTimeout(200);
 await p.evaluate(()=>{SAMPLE={json:async()=>({categorie:'haut',nom:'Chemise blanche',couleur:'Blanc',hex:'#FFFFFF',note:9,pourquoi:'Lumineuse.',similaires:['it0'],avec:['it2'],conseil:''})}});
 await p.click('[data-ago]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>AC.res.verdict.k==='reflechir'&&AC.res.dup.some(x=>x.id==='it0')),'Doublon vu par Aura → « À réfléchir »');
 // Pas un vêtement / erreur
 await p.click('[data-anew]');await p.setInputFiles('[data-aphoto]',img);await p.waitForTimeout(200);
 await p.evaluate(()=>{SAMPLE={json:async()=>({erreur:'Je ne vois pas de vêtement sur cette photo.'})}});
 await p.click('[data-ago]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/Je ne vois pas de vêtement/.test(document.querySelector('.note')?.textContent||'')&&!!document.querySelector('[data-ago]')),'Photo sans vêtement : message clair, on peut réessayer');
 // Sans garde-robe
 await p.evaluate(()=>{GR.items=[];grSave();AC.res=null});await p.evaluate(()=>{SAMPLE={json:async pr=>{window.__p2=pr;return {categorie:'robe',nom:'Robe longue',couleur:'Vert',hex:'#2E6B4F',note:6,pourquoi:'Belle longueur.',similaires:[],avec:[],conseil:''}}}});
 await p.click('[data-ago]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/pas encore de garde-robe/.test(__p2)&&/Ajoute tes vêtements pour savoir/.test(document.body.innerText)),'Sans garde-robe : invitation à ajouter ses vêtements');
 // Langues
 for(const [lang,t] of [['en','Is it worth it?'],['ar','تستاهل؟']]){await p.evaluate(l=>{S.lang=l;AC.res=null;go('achat')},lang);await p.waitForTimeout(300);
  ok(await p.evaluate(()=>document.querySelector('h1').textContent)===t,'Titre traduit ('+lang+')')}
 await p.evaluate(()=>{S.lang='en';S.art='MS01';go('art')});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/Before you buy/.test(document.body.innerText)&&/Does it suit you\?/.test(document.body.innerText)),'Fiche article traduite (en)');
 // Largeurs
 await p.evaluate(it=>{S.lang='fr';save();GR.items=it;grSave();AC.res={p:{nom:'Veste en lin',couleur:'Sable',cat:'veste',hex:'#D8C3A0'},verdict:acVerdict(2,false,3,true),dup:[GR.items[0]],avec:GR.items.slice(0,4),nb:3,gardeOk:true,prix:450,conseil:'Sur ta chemise blanche.',fitTxt:'Elle te va : 8/10. Coupe cintrée.'}},items);
 for(const w of [320,360,390,430,768,1280]){await p.setViewportSize({width:w,height:800});const bad=[];
  for(const [pg,pre] of [['achat',''],['art','MS01'],['boutique','']]){await p.evaluate(([x,a])=>{S.hist=[];if(a)S.art=a;go(x)},[pg,pre]);await p.waitForTimeout(700);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth,cut:[...document.querySelectorAll('#page button')].filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='visible'&&!e.closest('.fchips,[class*=scroll],.vit')).length}));
   if(r.sw>r.W)bad.push(pg+' déborde ('+r.sw+'>'+r.W+')');if(r.cut)bad.push(pg+' : '+r.cut+' bouton(s) coupé(s)')}
  ok(!bad.length,w+' px : aucun défilement horizontal'+(bad.length?' — '+bad.join(', '):''))}
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 console.log(fails?fails+' test(s) en échec':'Tous les tests passent');await b.close();process.exit(fails?1:0)})();
