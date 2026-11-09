// v193 : caméra guidée — photo nette (rafale, la plus nette gardée) et silhouette féminine symétrique.
// Lancer : python3 -m http.server 8765, puis : node tests/camera.js
const {chromium}=require('playwright');
const URL=process.env.URL||'http://localhost:8765/';
(async()=>{const b=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']}),errs=[];
 const ctx=await b.newContext({viewport:{width:390,height:844},permissions:['camera']});const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push('pageerror: '+e.message));
 await p.goto(URL);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}))});
 await p.goto(URL);await p.waitForTimeout(1200);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});
 // netteté : une image nette doit avoir un score plus haut que la même image floue
 const r=await p.evaluate(()=>{const mk=blur=>{const c=document.createElement('canvas');c.width=400;c.height=600;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,400,600);x.fillStyle='#000';for(let i=0;i<40;i++)x.fillRect(i*10,0,4,600);if(blur){const d=document.createElement('canvas');d.width=400;d.height=600;const y=d.getContext('2d');y.filter='blur(4px)';y.drawImage(c,0,0);return d}return c};return [camNet(mk(0)),camNet(mk(1))]});
 if(!(r[0]>r[1]*2))errs.push('netteté mal classée '+r);
 // symétrie de la silhouette
 const sym=await p.evaluate(()=>{const d=GUIDE.body.match(/ d="([^"]+)"/)[1].match(/-?[\d.]+/g).map(Number);let xs=[];for(let i=0;i<d.length;i+=2)xs.push(d[i]);return Math.abs(Math.min(...xs)+Math.max(...xs)-100)});
 if(sym>0.5)errs.push('silhouette pas symétrique '+sym);
 // photo guidée de bout en bout
 await p.evaluate(()=>{S.res=S.res||{};acamOpen('body');ACAM.delay=3});await p.waitForTimeout(1500);
 const gd=await p.evaluate(()=>!!document.querySelector('#camgd svg path'));if(!gd)errs.push('pas de silhouette affichée');
 await p.screenshot({path:process.env.SHOT||'/tmp/cam.png'});
 await p.evaluate(()=>acamGo());await p.waitForTimeout(6000);
 const ph=await p.evaluate(()=>S.file&&S.file.body?S.file.body.size:0);if(!ph)errs.push('photo non prise');
 const open=await p.evaluate(()=>!!document.getElementById('cam'));if(open)errs.push('caméra restée ouverte');
 console.log('netteté',r.map(x=>Math.round(x)),'photo',ph,'octets');
 console.log(errs.length?'ERREURS:\n'+errs.join('\n'):'Aucune erreur');await b.close();process.exit(errs.length?1:0)})();
