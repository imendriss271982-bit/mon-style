// Test v214 : son bloqué sur l'écran d'ouverture → bouton « Écouter Diva » ; un toucher → Diva parle ici ; « Commencer » → silence.
// Lancer : python3 -m http.server 8765, puis : node tests/ecoute.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{for(const lang of ['fr','ar']){
 const b=await chromium.launch({args:['--autoplay-policy=document-user-activation-required']});const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.evaluate(l=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Imen',lang:l}))},lang);
 const mp3=require('fs').readFileSync(__dirname+'/../sons/aura-1.mp3');
 await p.route(u=>!u.href.startsWith(URL),r=>/\/tts/.test(r.request().url())?r.fulfill({status:200,contentType:'audio/mpeg',body:mp3}):r.fulfill({status:200,contentType:'application/json',body:'{"token":"t"}'}));
 await p.goto(URL);await p.evaluate(()=>{window.FV_PAUSE=true});
 await p.waitForFunction(()=>window.SNDBLOCK===true,null,{timeout:20000}).catch(()=>{});
 ok(await p.isVisible('#ecoute'),lang+' : son bloqué → bouton « Écouter Diva » visible');
 const box=await p.$eval('#ecoute',e=>{const r=e.getBoundingClientRect();return {b:r.bottom,h:innerHeight}});ok(box.b<box.h,lang+' : bouton dans l’écran');
 const lab=await p.$eval('#ecoute span',e=>e.textContent);ok(lang==='ar'?/ديفا/.test(lab):/Écouter/.test(lab),lang+' : libellé traduit ('+lab+')');
 await p.click('#ecoute');
 await p.waitForFunction(()=>!AUD.paused,null,{timeout:20000}).catch(()=>{});
 ok(await p.evaluate(()=>!AUD.paused),lang+' : après le toucher, Diva parle sur l’écran d’ouverture');
 ok(await p.evaluate(()=>document.getElementById('ecoute').hidden),lang+' : le bouton disparaît quand elle parle');
 await p.click('#start');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>AUD.paused&&window.SPOUT===true),lang+' : « Commencer » → la voix est coupée à l’accueil');
 ok(!errs.length,lang+' : aucune erreur JavaScript'+(errs.length?' : '+errs[0]:''));await b.close()}
 console.log(fails?fails+' échec(s)':'Tous les tests passent');process.exit(fails?1:0)})();
