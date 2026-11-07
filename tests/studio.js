// Test v149 : photo studio de l'Outfit check (segmentation simulée : un rectangle = la personne).
// Lancer : python3 -m http.server 8765, puis : node tests/studio.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844},acceptDownloads:true});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{corps:{forme:'Sablier'}}}));localStorage.setItem('monstyle_focus',JSON.stringify({all:true}))});
 await p.goto(URL);await p.waitForTimeout(900);
 // Photo : décor vert vif, « personne » rouge au milieu. Segmenteur simulé : fond = hors du rectangle.
 await p.evaluate(async()=>{document.getElementById('splash')?.remove();
  const c=document.createElement('canvas');c.width=600;c.height=1000;const g=c.getContext('2d');g.fillStyle='#22AA22';g.fillRect(0,0,600,1000);g.fillStyle='#CC2020';g.fillRect(200,150,200,750);
  const bl=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));const f=new File([bl],'tenue.jpg',{type:'image/jpeg'});
  ST.segmenter=async cv=>{const w=64,h=64,a=new Float32Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const X=x/w*cv.width,Y=y/h*cv.height;a[y*w+x]=(X>=200&&X<400&&Y>=150&&Y<900)?0:1}return {a,w,h}};
  S.file.outfit=f;S.url.outfit=URL.createObjectURL(f);
  S.res.outfit={note:7,resume:'Belle tenue.',points_forts:['Couleurs'],note_apres:9,solutions:[{action:'ajouter',probleme:'Il manque un point lumineux.',texte:'Ajoute un collier doré.',id:'',achat:'Collier'}]};go('o_res')});
 await p.waitForTimeout(1200);
 ok(await p.$('.stp #stImg'),'Bloc photo studio sur le résultat');
 ok(await p.$$eval('[data-stbg]',e=>e.length)===4,'4 fonds proposés');
 const px=async()=>p.evaluate(async()=>{const im=document.getElementById('stImg');await im.decode().catch(()=>{});const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const g=c.getContext('2d');g.drawImage(im,0,0);
  const at=(x,y)=>[...g.getImageData(Math.round(x*c.width),Math.round(y*c.height),1,1).data].slice(0,3);return {src:im.src.slice(0,22),coin:at(.05,.05),centre:at(.5,.5),busy:!!document.querySelector('.st-box.busy')}});
 let r=await px();
 ok(r.src.startsWith('data:image/jpeg'),'Image studio créée');ok(!r.busy,'Chargement terminé');
 ok(!(r.coin[1]>150&&r.coin[0]<100),'Décor vert enlevé : '+r.coin);ok(r.coin.every(v=>v>200),'Fond studio crème clair : '+r.coin);
 ok(r.centre[0]>170&&r.centre[1]<80,'La tenue est gardée : '+r.centre);
 ok(await p.$eval('[data-stsave]',e=>!e.disabled),'Bouton « Enregistrer » actif');
 await p.click('[data-stbg="gris"]');await p.waitForTimeout(700);r=await px();
 ok(r.coin.every(v=>v>150&&v<235)&&Math.abs(r.coin[0]-r.coin[2])<10,'Fond gris pro : '+r.coin);
 ok(await p.evaluate(()=>localStorage.getItem('monstyle_stbg'))==='gris','Fond choisi retenu');
 const [dl]=await Promise.all([p.waitForEvent('download',{timeout:3000}).catch(()=>null),p.click('[data-stsave]')]);
 ok(dl&&dl.suggestedFilename()==='my-style-tenue.jpg','Téléchargement de la photo');
 ok(/Pour sublimer ton look/.test(await p.$eval('body',e=>e.innerText)),'Le reste de l’Outfit check est toujours là');
 // Échec du segmenteur → message, rien de cassé
 await p.evaluate(async()=>{ST.segmenter=async()=>{throw new Error('x')};ST.cache=new Map();ST.f=null;go('home');go('o_res')});await p.waitForTimeout(800);
 ok(await p.$('.st-box.ko')&&/n’a pas marché/.test(await p.$eval('#stNote',e=>e.textContent)),'Échec : message clair');
 ok(await p.$eval('[data-stsave]',e=>e.disabled),'Échec : pas d’enregistrement');
 // Sans photo (après rechargement) : pas de bloc
 await p.evaluate(()=>{S.file.outfit=null;go('home');go('o_res')});await p.waitForTimeout(300);
 ok(!(await p.$('.stp')),'Sans photo : pas de bloc studio');
 // Arabe
 await p.evaluate(async()=>{ST.segmenter=async cv=>({a:new Float32Array(64*64).map((_,i)=>{const x=i%64,y=(i/64)|0;return x>20&&x<44&&y>10&&y<58?0:1}),w:64,h:64});const c=document.createElement('canvas');c.width=300;c.height=500;c.getContext('2d').fillRect(0,0,300,500);const bl=await new Promise(r=>c.toBlob(r,'image/jpeg'));S.file.outfit=new File([bl],'t.jpg');S.url.outfit=URL.createObjectURL(S.file.outfit);S.lang='ar';save();go('home');go('o_res')});await p.waitForTimeout(800);
 ok(/احفظي الصورة/.test(await p.$eval('.stp',e=>e.innerText)),'Traduit en arabe');
 await p.setViewportSize({width:320,height:700});await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.documentElement.scrollWidth<=321),'320 px : pas de défilement horizontal');
 ok(!errs.length,'Aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(fails?'\n'+fails+' échec(s)':'\nTout est bon');process.exit(fails?1:0)})();
