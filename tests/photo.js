// Tests v158 : guide photo de la garde-robe, pièce remise à l'endroit (rot), bouton Pivoter.
// Lancer : python3 -m http.server 8765, puis : node tests/photo.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:360,height:780}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}));localStorage.setItem('monstyle_focus',JSON.stringify({all:true}))});
 await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();go('garde')});await p.waitForTimeout(300);
 ok(await p.$('button.gr-add[data-gguide]'),'Garde-robe : « Ajouter en photo » ouvre le guide');
 ok(await p.$('.gg-lien'),'Lien « Comment bien photographier ? »');
 await p.click('button.gr-add[data-gguide]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.page)==='g_guide','Page guide ouverte');
 ok(await p.$$eval('.gg-row',e=>e.length)===4,'Sens de 4 types de pièces');
 ok(await p.$$eval('.gg-reg li',e=>e.length)===4,'4 règles');
 ok(await p.$('input[data-ggadd][capture="environment"]')&&await p.$('input[data-ggadd][multiple]'),'Appareil + galerie');
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Pas de défilement horizontal à 360 px');
 // Photo : une pièce couchée (rectangle haut 600×200). Gemini dit rot=90.
 await p.evaluate(async()=>{const c=document.createElement('canvas');c.width=1000;c.height=1000;const g=c.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,1000,1000);g.fillStyle='#1A1A1A';g.fillRect(200,400,600,200);
  const bl=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));window.__f=new File([bl],'p.jpg',{type:'image/jpeg'});
  SAMPLE={json:async()=>({pieces:[{box_2d:[380,180,620,820],rot:90,categorie:'pantalon',type:'Pantalon droit',nom:'Pantalon noir',couleur:'Noir',hex:'#1A1A1A'}]})}});
 await p.setInputFiles('input[data-ggadd][multiple]',{name:'p.jpg',mimeType:'image/jpeg',buffer:Buffer.from(await p.evaluate(async()=>[...new Uint8Array(await __f.arrayBuffer())]))});
 await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>S.page)==='garde','Retour à la garde-robe après la photo');
 const dim=async()=>p.evaluate(async src=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src=src});
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);
  let t=1e9,l=1e9,bt=0,r=0;const d=g.getImageData(0,0,c.width,c.height).data;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){if(d[(y*c.width+x)*4]<100){t=Math.min(t,y);bt=Math.max(bt,y);l=Math.min(l,x);r=Math.max(r,x)}}
  return {w:r-l,h:bt-t}},await p.evaluate(()=>GR.items[0].img));
 let d=await dim();ok((await p.evaluate(()=>GR.items.length))===1,'Pièce rangée');
 ok(d.h>d.w*2,'Pièce remise à l’endroit (verticale) : '+JSON.stringify(d));
 ok(await p.evaluate(()=>grPieces({pieces:[{box_2d:[0,0,500,500],rot:45,categorie:'haut'}]})[0].rot)===0,'rot inconnu → 0');
 ok(await p.evaluate(()=>/rot =/.test(PR_MULTI())),'Prompt : rotation demandée');
 // Pivoter
 await p.evaluate(()=>{S.grItem=GR.items[0].id;go('g_item')});await p.waitForTimeout(300);
 ok(await p.$('.gg-rot'),'Fiche : bouton Pivoter');
 await p.click('.gg-rot');await p.waitForTimeout(600);
 d=await dim();ok(d.w>d.h*2,'Pivoter tourne la photo : '+JSON.stringify(d));
 // Après 3 utilisations, ajout direct
 await p.evaluate(()=>{localStorage.setItem('monstyle_gguide','3');go('garde')});await p.waitForTimeout(300);
 ok(await p.$('label.gr-add input[data-gadd]')&&!(await p.$('button.gr-add[data-gguide]')),'Après 3 fois : ajout direct, lien du guide gardé');
 // Arabe
 await p.evaluate(()=>localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'ar',later:true})));await p.goto(URL);await p.waitForTimeout(900);
 await p.evaluate(()=>{document.getElementById('splash')?.remove();go('g_guide')});await p.waitForTimeout(500);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Arabe : pas de défilement horizontal');
 ok(await p.evaluate(()=>/صوري قطعچ صح/.test(document.body.innerText)),'Guide traduit en arabe');
 ok(!errs.length,'Aucune erreur JS '+errs.join(' | '));
 await b.close();console.log(fails?fails+' échec(s)':'Tout est bon');process.exit(fails?1:0)})();
