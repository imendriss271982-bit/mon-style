// Test v150 : « Fond pro » par l'IA (route /detour simulée) quand le fond est chargé.
// Lancer : python3 -m http.server 8765, puis : node tests/pro.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 let calls=0,last=null,mode='ok';
 await p.route('**/detour',async r=>{calls++;last=JSON.parse(r.request().postData()||'{}');
  if(mode==='ko')return r.fulfill({status:502,contentType:'application/json',body:JSON.stringify({erreur:'x',code:'no_image'})});
  // image renvoyée : fond blanc, carré noir au milieu
  const png=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=300;c.height=400;const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,300,400);g.fillStyle='#111';g.fillRect(80,80,140,240);return c.toDataURL('image/png').split(',')[1]});
  await new Promise(x=>setTimeout(x,300));r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({image:png,mime:'image/png'})})});
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}));localStorage.setItem('monstyle_focus',JSON.stringify({all:true}))});
 await p.goto(URL);await p.waitForTimeout(900);
 // Photo à motifs (comme un drap fuchsia à arabesques) avec un blazer noir : le détourage simple ne peut pas.
 await p.evaluate(async()=>{document.getElementById('splash')?.remove();home();
  const c=document.createElement('canvas');c.width=800;c.height=800;const g=c.getContext('2d');
  for(let y=0;y<800;y+=20)for(let x=0;x<800;x+=20){g.fillStyle=((x+y)/20)%3===0?'#C2185B':((x+y)/20)%3===1?'#E8A33D':'#F5F0E6';g.fillRect(x,y,20,20)}
  g.fillStyle='#151515';g.fillRect(200,150,400,500);
  window.__f=new File([await new Promise(r=>c.toBlob(r,'image/jpeg',.9))],'motif.jpg',{type:'image/jpeg'});
  SAMPLE={json:async()=>({pieces:[{box_2d:[160,220,640,580],categorie:'veste',type:'Blazer oversize',nom:'Blazer oversize noir',couleur:'Noir',hex:'#151515'}]})};go('garde')});
 await p.evaluate(()=>grAdd([__f]));await p.waitForTimeout(150);
 ok(await p.evaluate(()=>GR.items.length===1&&!GR.items[0].det),'Fond à motifs : détourage simple impossible');
 ok(await p.$('.gr-it.polish'),'Pendant ce temps : la pièce brille ✨');
 await p.waitForTimeout(900);
 ok(calls===1,'Une demande /detour envoyée : '+calls);
 ok(last&&/pure white/.test(last.prompt)&&/EXACTLY identical/.test(last.prompt)&&last.image&&last.image.length>1000,'Prompt « photo produit, identique » + découpe envoyée');
 ok(await p.evaluate(()=>GR.items[0].pro===1),'Pièce marquée « fond pro »');
 const px=await p.evaluate(async()=>{const im=new Image();im.src=GR.items[0].img;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);return [...g.getImageData(3,3,1,1).data].slice(0,3)});
 ok(px.every(v=>v>245),'Nouvelle photo sur fond blanc : '+px);
 ok(!(await p.$('.gr-it.polish')),'Fini : plus d’étincelles');
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('monstyle_gr')).items[0].pro===1),'Sauvegardé');
 // Échec → la découpe reste, bouton pour réessayer dans la fiche
 mode='ko';await p.evaluate(()=>{GR.items[0].pro=0;S.grItem=GR.items[0].id;go('g_item')});await p.waitForTimeout(200);
 ok(await p.$('[data-grpro]'),'Fiche : bouton « Fond pro »');
 await p.click('[data-grpro]');await p.waitForTimeout(700);
 ok(await p.evaluate(()=>GR.items[0].proKo===1)&&/pas marché/.test(await p.$eval('body',e=>e.innerText)),'Échec : message + on peut réessayer');
 // Bouton pour toutes les pièces (anciennes pièces sans fond pro)
 mode='ok';await p.evaluate(()=>{GR.items.push({id:'old1',cat:'haut',nom:'Crop top orange',img:GR.items[0].img,wait:0});grSave();go('garde')});await p.waitForTimeout(200);
 ok(/Fond pro pour mes pièces \(2\)/.test(await p.$eval('[data-grproall]',e=>e.innerText)),'Bouton « Fond pro pour mes pièces (2) »');
 calls=0;await p.click('[data-grproall]');await p.waitForTimeout(1500);
 ok(calls===2&&await p.evaluate(()=>GR.items.every(x=>x.pro===1)),'Toutes les pièces passent au fond pro : '+calls);
 ok(!(await p.$('[data-grproall]')),'Bouton caché quand tout est fait');
 await p.evaluate(()=>{S.lang='ar';save();GR.items[0].pro=0;delete GR.items[0].proKo;render(false)});await p.waitForTimeout(300);
 ok(/خلفية احترافية/.test(await p.$eval('[data-grproall]',e=>e.innerText)),'Traduit en arabe');
 ok(!errs.length,'Aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(fails?'\n'+fails+' échec(s)':'\nTout est bon');process.exit(fails?1:0)})();
