// Test v206 : Diva ne bouge jamais la bouche sans voix (son bloqué, fin de phrase).
// Lancer : python3 -m http.server 8765, puis : node tests/levres.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(URL);await p.evaluate(()=>{localStorage.clear();sessionStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Imen',lang:'fr',later:true}))});
 await p.goto(URL);await p.waitForTimeout(600);
 // Son bloqué : mime() ne doit ni parler ni lancer la vidéo « parle »
 const r=await p.evaluate(async()=>{auraTalking(false);const m=mime("Bonjour, je suis Diva.");await new Promise(x=>setTimeout(x,300));
  const st={talk:window.AURA_TALK,body:document.body.classList.contains('talk'),vid:!!document.querySelector('#ava .fig.vplay')};m.stop();return st});
 ok(!r.talk&&!r.body&&!r.vid,'Son bloqué : Diva reste au repos, bouche fermée');
 // Audio sans analyse (env=null) : parle pendant l'audio, s'arrête dès la fin
 const r2=await p.evaluate(async()=>{const a={paused:false,ended:false,currentTime:0};voiceDrive(a,null);await new Promise(x=>setTimeout(x,100));const pendant=window.AURA_TALK;
  a.paused=true;a.ended=true;await new Promise(x=>setTimeout(x,150));return{pendant,apres:window.AURA_TALK}});
 ok(r2.pendant,'Pendant la voix : la bouche bouge');ok(!r2.apres,'Fin de la voix : la bouche s’arrête tout de suite');
 // Délai 0 respecté
 const r3=await p.evaluate(async()=>{auraTalking(true);window.AURA_OFF_MS=0;auraTalking(false);await new Promise(x=>setTimeout(x,40));return window.AURA_TALK});
 ok(!r3,'Arrêt sans délai de 700 ms');
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs[0]:''));
 await b.close();console.log(fails?fails+' échec(s)':'Tous les tests passent');process.exit(fails?1:0)})();
