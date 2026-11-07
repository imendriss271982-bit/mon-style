// Test de l'accueil en 4 portes (v153) : 3 moments de la cliente, portes, suggestion, « Tout afficher », arabe, largeurs.
// Lancer : python3 -m http.server 8765 (dans le dossier du projet), puis : node tests/portes.js
const {chromium}=require('playwright');
const URL=process.env.URL||'http://localhost:8765/';
const SHOTS=process.env.SHOTS||'';
(async()=>{const b=await chromium.launch(),errs=[],ko=[];const okk=(c,m)=>{if(c)console.log('✓ '+m);else{ko.push(m);console.log('✗ '+m)}};
 const p=await b.newPage({viewport:{width:390,height:844}});
 p.on('pageerror',e=>errs.push(e.message));
 const RES={corps:{forme:'Sablier',kibbe:'Soft Classic'},visage:{forme:'ovale'}};
 const open=async(st,lang='fr')=>{await p.goto(URL);await p.evaluate(([st,lang])=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Imen',lang,later:true,res:st.res}));
   if(st.gr)localStorage.setItem('monstyle_gr',JSON.stringify({items:st.gr,looks:[],saved:[]}));if(st.zf)localStorage.setItem('monstyle_zf',JSON.stringify({prof:st.zf}));sessionStorage.setItem('ms_hi','1')},[st,lang]);
   await p.goto(URL);await p.waitForTimeout(1200);await p.evaluate(()=>{document.getElementById('splash')?.remove();S.hist=[];home()});await p.waitForTimeout(500)};
 const txt=()=>p.evaluate(()=>document.querySelector('#page').innerText);
 const shot=async n=>{if(SHOTS)await p.screenshot({path:SHOTS+'/'+n+'.png',fullPage:true})};
 // 1. Nouvelle cliente
 await open({res:{}});let t=await txt();await shot('1-nouvelle');
 okk(!t.includes('Commencer mon analyse')&&!t.includes('Découvre ton style'),'Nouvelle : les 3 étapes ne sont plus sur l’accueil (v173, dans le profil)');
 okk(await p.evaluate(()=>document.querySelectorAll('.pt-act').length)>=1,'Nouvelle : au moins une action (Outfit check)');
 okk(await p.evaluate(()=>document.querySelectorAll('.pt-door').length)===4,'4 portes');
 okk(!(await p.evaluate(()=>!!document.querySelector('.pt-sug'))),'Nouvelle : pas de suggestion (une seule chose à faire)');
 okk(await p.evaluate(()=>!!document.querySelector('.hz-st')),'My Stylist reste visible');
 // 2. Analyse finie, garde-robe vide
 await open({res:{...RES,couleurs:{saison:'__S__'}}});
 await p.evaluate(()=>{S.res.couleurs={saison:Object.keys(SEASONS)[3]};home()});await p.waitForTimeout(300);t=await txt();await shot('2-analyse');
 okk(t.includes('Outfit check')&&t.includes('Ma garde-robe'),'Analyse finie : Outfit check + garde-robe');
 okk(await p.evaluate(()=>document.querySelector('.pt-sug')?.innerText.includes('garde-robe')),'Suggestion : remplir la garde-robe');
 await p.click('[data-sugx]');await p.waitForTimeout(300);
 okk(!(await p.evaluate(()=>document.querySelector('.pt-sug')?.innerText.includes('Photographie quelques'))),'✕ cache la suggestion pour aujourd’hui');
 // Portes : chaque ligne ouvre une vraie page
 for(const k of ['style','habiller','acheter']){await p.evaluate(()=>{S.hist=[];home()});await p.waitForTimeout(200);await p.click(`[data-porte="${k}"]`);await p.waitForTimeout(300);
  okk(await p.evaluate(()=>S.page)==='porte','Porte '+k+' s’ouvre');
  const n=await p.evaluate(()=>document.querySelectorAll('.pt-row').length);
  for(let i=0;i<n;i++){await p.evaluate(()=>{S.hist=[];S.page='porte';render(false)});await p.waitForTimeout(150);
   const lab=await p.evaluate(i=>document.querySelectorAll('.pt-row')[i].innerText.split('\n')[0],i);
   await p.evaluate(i=>document.querySelectorAll('.pt-row')[i].click(),i);await p.waitForTimeout(350);
   const pg=await p.evaluate(()=>S.page+(P[S.page]?'':'?'));okk(pg&&pg!=='porte'&&!pg.endsWith('?'),`  ${lab} → ${pg}`)}}
 await p.evaluate(()=>{S.hist=[];home()});await p.waitForTimeout(200);await p.click('[data-go="zf"].pt-door');await p.waitForTimeout(300);
 okk(await p.evaluate(()=>S.page)==='zf','Porte Mon mariage → Zifafi');
 // 3. Garde-robe prête + mariage prévu
 const gr=[];for(let i=0;i<8;i++)gr.push({id:'x'+i,cat:i<4?'haut':'pantalon',nom:'Pièce '+i,coul:'noir',img:''});
 await open({res:{...RES},gr,zf:{budget:'moyen'}});await p.evaluate(()=>{S.res.couleurs={saison:Object.keys(SEASONS)[3]};home()});await p.waitForTimeout(300);await shot('3-garde-mariage');
 const acts=await p.evaluate(()=>[...document.querySelectorAll('.pt-act b')].map(x=>x.innerText));
 okk(acts[0]==='Zifafi Wedding'&&acts.includes('Tenue du jour')&&acts.length<=3,'Garde-robe prête + mariage : '+acts.join(' · '));
 okk(await p.evaluate(()=>document.querySelector('.pt-door b').innerText)==='Mon mariage','Mariage prévu : porte Mon mariage en premier');
 // Tout afficher / Accueil simplifié
 await p.click('[data-fxall="1"]');await p.waitForTimeout(300);
 okk(await p.evaluate(()=>!document.querySelector('.pt-grid')&&!!document.querySelector('.hz-more')),'Tout afficher : ancien accueil complet');
 await p.click('[data-fxall="0"]');await p.waitForTimeout(300);
 okk(await p.evaluate(()=>!!document.querySelector('.pt-grid')),'Accueil simplifié : retour aux portes');
 // Arabe
 await open({res:{...RES}},'ar');await p.evaluate(()=>{S.res.couleurs={saison:Object.keys(SEASONS)[3]};home()});await p.waitForTimeout(600);t=await txt();await shot('4-arabe');
 okk(/ستايلي|كل My Style/.test(t)&&!/Pour toi maintenant|M’habiller/.test(t),'Arabe : tout est traduit');
 okk(await p.evaluate(()=>document.documentElement.dir)==='rtl','Arabe : de droite à gauche');
 // Largeurs
 for(const w of [320,390,768]){await p.setViewportSize({width:w,height:800});await p.waitForTimeout(200);
  okk(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),w+' px : aucun défilement horizontal')}
 okk(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(ko.length?ko.length+' échec(s)':'Tous les tests passent');process.exit(ko.length?1:0)})();
