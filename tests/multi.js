// Tests v147 : plusieurs pièces sur une photo (découpe + détourage + type précis) et Outfit check en solutions.
// Lancer : python3 -m http.server 8765, puis : node tests/multi.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{corps:{forme:'Sablier',kibbe:'Soft Classic'}}}));localStorage.setItem('monstyle_focus',JSON.stringify({all:true}))});
 await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});
 // Photo : fond beige uni, 3 pièces (blazer noir, jupe bordeaux, escarpins nude).
 const mk=()=>p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=1000;const g=c.getContext('2d');
  g.fillStyle='#E8DCC6';g.fillRect(0,0,1000,1000);g.fillStyle='#1A1A1A';g.fillRect(80,100,320,600);g.fillStyle='#7A1F2B';g.fillRect(500,120,380,420);g.fillStyle='#D9B79C';g.fillRect(560,700,260,180);
  const bl=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));window.__f=new File([bl],'groupe.jpg',{type:'image/jpeg'})});
 await mk();
 await p.evaluate(()=>{window.__pr='';SAMPLE={json:async pr=>{__pr=pr;return {pieces:[
  {box_2d:[90,70,710,410],categorie:'veste',type:'Blazer long',nom:'Blazer long noir',couleur:'Noir',hex:'#1A1A1A',style:'chic'},
  {box_2d:[110,490,550,890],categorie:'jupe',type:'Jupe trapèze',nom:'Jupe bordeaux',couleur:'Bordeaux',hex:'#7A1F2B',style:'classique'},
  {box_2d:[112,492,548,888],categorie:'jupe',type:'Jupe trapèze',nom:'Doublon',couleur:'Bordeaux',hex:'#7A1F2B'},
  {box_2d:[690,550,890,830],categorie:'chaussures',type:'Escarpins',nom:'Escarpins nude',couleur:'Nude',hex:'#D9B79C',style:'chic'}]}}};go('garde')});
 await p.waitForTimeout(300);
 ok(await p.$('.gr-tip'),'Garde-robe : astuce photo groupée affichée');
 await p.evaluate(()=>grAdd([__f]));await p.waitForTimeout(600);
 const its=await p.evaluate(()=>GR.items.map(x=>({cat:x.cat,type:x.type,nom:x.nom,wait:x.wait,img:x.img})));
 ok(its.length===3,'3 pièces rangées séparément (doublon retiré) : '+its.length);
 ok(its.map(x=>x.cat).join()==='veste,jupe,chaussures','Catégories dans l’ordre');
 ok(its.every(x=>x.type&&!x.wait),'Chaque pièce a son type précis');
 ok(await p.evaluate(()=>/PLUSIEURS pièces/.test(PR_MULTI())&&/box_2d/.test(PR_MULTI())&&/Robe blazer/.test(PR_MULTI())),'Prompt : plusieurs pièces, cadres, types précis');
 // Détourage : le coin de la vignette du blazer est blanc, le centre est noir.
 const px=await p.evaluate(async src=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src=src});const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
  const a=g.getImageData(1,1,1,1).data,m=g.getImageData(im.width>>1,im.height>>1,1,1).data;return {coin:[...a].slice(0,3),centre:[...m].slice(0,3)}},its[0].img);
 ok(px.coin.every(v=>v>240),'Fond enlevé (coin blanc) : '+px.coin);ok(px.centre.every(v=>v<60),'Pièce gardée (centre noir) : '+px.centre);
 await p.waitForTimeout(200);
 ok(await p.$$eval('.gr-ty',e=>e.length)===3,'Type précis sous chaque pièce');
 // Fiche : champ « Type précis »
 await p.evaluate(()=>{S.grItem=GR.items[0].id;go('g_item')});await p.waitForTimeout(200);
 ok(await p.$eval('#g_type',e=>e.value)==='Blazer long','Fiche : type précis modifiable');
 await p.fill('#g_type','Blazer court');ok(await p.evaluate(()=>GR.items[0].type)==='Blazer court','Correction du type enregistrée');
 ok(await p.evaluate(()=>/blazer court/.test(grItemsTxt())),'Le type part chez Aura (grItemsTxt)');
 // Ancien format (une seule pièce, sans cadre) et erreur
 await p.evaluate(()=>{SAMPLE={json:async()=>({categorie:'haut',nom:'Chemise blanche',couleur:'Blanc',hex:'#FFFFFF'})};go('garde')});await mk();
 await p.evaluate(()=>grAdd([__f]));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>GR.items.length===4&&GR.items[0].nom==='Chemise blanche'),'Ancien format : une pièce');
 await p.evaluate(()=>{SAMPLE={json:async()=>({erreur:'Je ne vois pas de vêtement sur cette photo.'})}});
 await p.evaluate(()=>grAdd([__f]));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>GR.items.length===5&&GR.items[0].todo===1&&!GR.items[0].wait),'Erreur : article à compléter, jamais bloqué');
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('monstyle_gr')).items.some(x=>x.type==='Blazer court')),'Sauvegardé dans le téléphone');
 // Fond à motifs : pas d'IA payante, message « fond blanc »
 await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=800;c.height=800;const g=c.getContext('2d');
  for(let y=0;y<800;y+=20)for(let x=0;x<800;x+=20){g.fillStyle=((x+y)/20)%3===0?'#C2185B':((x+y)/20)%3===1?'#E8A33D':'#F5F0E6';g.fillRect(x,y,20,20)}
  g.fillStyle='#151515';g.fillRect(200,150,400,500);window.__m=new File([await new Promise(r=>c.toBlob(r,'image/jpeg',.9))],'m.jpg',{type:'image/jpeg'});
  window.__fx=0;const F=window.fetch;window.fetch=(u,o)=>{if(/detour|makeup/.test(String(u)))__fx++;return F(u,o)};
  SAMPLE={json:async()=>({pieces:[{box_2d:[160,220,640,580],categorie:'veste',type:'Blazer oversize',nom:'Blazer noir',couleur:'Noir',hex:'#151515'}]})};go('garde')});
 await p.evaluate(()=>grAdd([__m]));await p.waitForTimeout(500);
 ok(await p.evaluate(()=>GR.items[0].fond===1&&__fx===0),'Fond chargé : aucune IA d’image appelée');
 ok(/fond blanc/.test(await p.$eval('.gr-tip',e=>e.innerText)),'Astuce : fond blanc');
 await p.evaluate(()=>{S.grItem=GR.items[0].id;go('g_item')});await p.waitForTimeout(200);
 ok(/trop chargé/.test(await p.$eval('.gr-fond',e=>e.innerText)),'Fiche : conseil de reprendre sur fond blanc');
 await p.evaluate(()=>{GR.items.shift();grSave();go('garde')});
 // ——— Outfit check en solutions ———
 ok(await p.evaluate(()=>{const pr=PR_OUT();return /solutions/.test(pr)&&pr.includes(GR.items[1].id)&&/SUBLIMER son look/.test(pr)&&/sans jamais lui dire d’acheter/.test(pr)&&/courte explication bienveillante de la note/.test(pr)&&/pourquoi/.test(pr)}),'Prompt Outfit check : sublimer le look, courte explication, sans achat');
 await p.evaluate(()=>{const b=GR.items.find(x=>x.cat==='veste');S.res.outfit={note:7,resume:'Belle base, très élégante.',points_forts:['Couleurs harmonieuses'],note_apres:9,solutions:[
  {action:'changer',probleme:'La veste en jean casse l’élégance de la tenue.',texte:'Remplace la veste par ton blazer court noir.',pourquoi:'Il structure tes épaules et rend la tenue plus chic.',id:b.id,achat:''},
  {action:'ajouter',texte:'Ajoute un collier doré fin.',id:'',achat:'Collier doré fin'},
  {action:'changer',texte:'Mets des escarpins.',id:'zzz',achat:''}]};go('o_res')});await p.waitForTimeout(400);
 const t=await p.$eval('#app,main,body',e=>e.innerText);
 ok(/Pour sublimer ton look/.test(t)&&!/Pour passer à/.test(t)&&!/Ce qui marche/.test(t),'Titre « Pour sublimer ton look », sans justifier la note');ok(!/À changer/.test(t),'Plus de liste « À changer »');
 ok(await p.$$eval('.oc-sol',e=>e.length)===3,'3 solutions affichées');
 ok(await p.$$eval('.oc-ok',e=>e.length)===1,'Une pièce « Dans ta garde-robe » (id inventé ignoré)');
 ok(await p.$$eval('.oc-go',e=>e.length)===0&&!/achat/i.test(t)&&await p.$$eval('.oc-idee',e=>e.length)===2,'Sinon : idée d’Aura, jamais « achète »');
 ok(await p.$('.oc-sol button.oc-ph[data-gitem]'),'Photo de la pièce de sa garde-robe');
 ok(!/Le souci/i.test(t)&&!/casse l’élégance/.test(t),'Pas de défaut expliqué');
 ok(/structure tes épaules/.test(t)&&await p.$$eval('.oc-pq',e=>e.length)===1,'Courte explication sous l’idée');

 ok(!/casse l’élégance/.test(await p.evaluate(()=>ocSay(S.res.outfit))),'Aura ne dit pas de défaut');
 ok(await p.evaluate(()=>/blazer court noir/.test(ocSay(S.res.outfit))),'Aura dit la 1re idée');
 // Ancien résultat (changements) toujours lisible
 await p.evaluate(()=>{S.res.outfit={note:6,resume:'Ok.',points_forts:[],changements:['Ajoute une ceinture.']};go('o_res')});await p.waitForTimeout(300);
 ok(/Pour sublimer ton look/.test(await p.$eval('body',e=>e.innerText))&&/ceinture/.test(await p.$eval('body',e=>e.innerText)),'Ancien résultat lisible');
 // Arabe + petite largeur
 await p.evaluate(()=>{S.res.outfit={note:7,resume:'Bien.',points_forts:[],note_apres:9,solutions:[{action:'ajouter',texte:'Ajoute un sac.',id:'',achat:'Sac'}]};S.lang='ar';save();go('garde')});await p.waitForTimeout(400);
 ok(/تصورين كذا قطعة/.test(await p.$eval('.gr-tip',e=>e.innerText)),'Astuce traduite en arabe');
 await p.evaluate(()=>go('o_res'));await p.waitForTimeout(300);
 ok(/فكرة أورا/.test(await p.$eval('.oc-sols',e=>e.innerText))&&/ترفعين لوكچ/.test(await p.$eval('body',e=>e.innerText)),'Idées traduites en arabe');
 await p.setViewportSize({width:320,height:700});await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=321),'320 px : pas de défilement horizontal');
 ok(!errs.length,'Aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(fails?'\n'+fails+' échec(s)':'\nTout est bon');process.exit(fails?1:0)})();
