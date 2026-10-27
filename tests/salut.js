// Test v111 : le bonjour d’Aura n’est dit qu’une fois par ouverture (écran d’ouverture OU accueil), jamais au retour sur l’accueil.
// Lancer : python3 -m http.server 8765, puis : node tests/salut.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.evaluate(()=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Imen',lang:'ar',later:true}))});
 await p.goto(URL);await p.waitForTimeout(800);
 await p.evaluate(()=>{window.SAID=[];const o=window.say;window.say=t=>{window.SAID.push(t)};window.GREETED=true;document.getElementById('start').click()});
 await p.waitForTimeout(300);
 let n=await p.evaluate(()=>SAID.length);ok(n===0,'Bouton Commencer après le salut de l’écran d’ouverture : pas de second bonjour');
 for(const pg of ['garde','boutique','profil','home','chat','home','garde','home'])await p.evaluate(g=>g==='home'?home():go(g),pg);
 const hi=await p.evaluate(()=>SAID.filter(t=>/هلا|Bonjour|Hello/.test(t)).length);ok(hi===0,'Retour sur l’accueil : aucun « هلا والله » répété');
 await p.goto(URL);await p.waitForTimeout(800);
 ok(await p.evaluate(()=>HOME_HI&&SKIP),'Rechargement (mise à jour) dans la même ouverture : écran d’ouverture silencieux');
 const p2=await b.newPage();await p2.goto(URL);await p2.evaluate(()=>{localStorage.setItem('monstyle',JSON.stringify({nom:'Imen',lang:'ar',later:true}))});await p2.goto(URL);await p2.waitForTimeout(500);
 await p2.evaluate(()=>{window.SAID=[];window.say=t=>SAID.push(t);window.GREETED=false;document.getElementById('start').click();home();go('garde');home()});
 ok(await p2.evaluate(()=>SAID.filter(t=>/هلا|Bonjour|Hello/.test(t)).length===1),'Voix bloquée à l’ouverture : bonjour dit une seule fois sur l’accueil');
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs[0]:''));
 await b.close();console.log(fails?fails+' échec(s)':'Tous les tests passent');process.exit(fails?1:0)})();
