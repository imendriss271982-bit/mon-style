// Test de fumée My Style : ouvre chaque page, touche les boutons sans effet externe, et liste les erreurs JavaScript.
// Lancer : python3 -m http.server 8765 (dans le dossier du projet), puis : node tests/smoke.js
const {chromium}=require('playwright');
const URL=process.env.URL||'http://localhost:8765/';
(async()=>{const b=await chromium.launch(),errs=[];
 const p=await b.newPage({viewport:{width:390,height:844}});
 p.on('pageerror',e=>errs.push('pageerror: '+e.message));
 p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|net::|fonts\.g|ERR_|CORS|elevenlabs|workers\.dev/i.test(m.text()))errs.push('console: '+m.text())});
 p.on('dialog',d=>d.dismiss());
 await p.goto(URL);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{corps:{forme:'Sablier',kibbe:'Soft Classic'},couleurs:{saison:Object.keys(SEASONS)[3]},visage:{forme:'ovale'}}}))});
 await p.goto(URL);await p.waitForTimeout(1200);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});
 const pages=['home','boutique','beaute','news','profil','garde','infos','chat',...(process.env.PAGES||'').split(',').filter(Boolean)];
 const report=[];
 for(const pg of pages){
  await p.evaluate(x=>{S.hist=[];go(x)},pg);await p.waitForTimeout(400);
  const n=await p.evaluate(()=>document.querySelectorAll('#page button').length);
  report.push(pg+': '+n+' boutons');
 }
 // Navigation par la barre du bas
 for(const g of ['boutique','home','beaute','news','profil']){await p.click(`#dock [data-go="${g}"]`);await p.waitForTimeout(300);const cur=await p.evaluate(()=>S.page);if(cur!==g)errs.push('dock '+g+' -> '+cur)}
 if(process.env.EXTRA){await require(process.env.EXTRA)(p,errs,report)}
 console.log(report.join('\n'));console.log(errs.length?'ERREURS:\n'+errs.join('\n'):'Aucune erreur');await b.close();process.exit(errs.length?1:0)})();
