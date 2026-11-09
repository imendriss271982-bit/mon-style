// Test de l'accueil v177 (audit, validé par Imen) : 5 blocs — Diva, grande carte (analyse ou tenue du jour), My Stylist, 3 raccourcis ronds, Style Twin + Zifafi.
// Lancer : python3 -m http.server 8765 (dans le dossier du projet), puis : node tests/accueil.js   (SHOTS=dossier pour les captures)
const {chromium}=require('playwright');
const URL=process.env.URL||'http://localhost:8765/';
const SHOTS=process.env.SHOTS||'';
(async()=>{const b=await chromium.launch(),errs=[],ko=[];const okk=(c,m)=>{if(c)console.log('✓ '+m);else{ko.push(m);console.log('✗ '+m)}};
 const p=await b.newPage({viewport:{width:390,height:844}});
 p.on('pageerror',e=>errs.push(e.message));
 const open=async(st={},lang='fr')=>{await p.goto(URL);await p.evaluate(([st,lang])=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'imen',lang,later:true,res:st.res||{}}));
   if(st.gr)localStorage.setItem('monstyle_gr',JSON.stringify({items:st.gr,looks:[],saved:[]}));sessionStorage.setItem('ms_hi','1')},[st,lang]);
   await p.goto(URL);await p.waitForTimeout(1200);await p.evaluate(()=>{document.getElementById('splash')?.remove();S.hist=[];home()});await p.waitForTimeout(500)};
 const ordre=()=>p.evaluate(()=>{const hx=document.querySelector('#page .hx');const m=[['.hz-top','top'],['.ac-an','analyse'],['.ac-jour','jour'],['.hz-st','stylist'],['.ac-ronds','ronds'],['.ac-golfe','golfe'],['.ac-duo','duo'],['.hz-insp','insp']];
   return [...hx.children].map(c=>{const f=m.find(([s])=>c.matches(s));return f?f[1]:c.className}).join(',')});
 const shot=async n=>{if(SHOTS)await p.screenshot({path:SHOTS+'/'+n+'.png',fullPage:true})};

 const RES={visage:{forme:'ovale'},corps:{forme:'Sablier',kibbe:'Soft Classic'},couleurs:{saison:'Hiver Profond'}};
 await open();
 okk(/^top,stylist,analyse,ronds,golfe,duo(,insp)?$/.test(await ordre()),'Nouvelle cliente : '+await ordre());
 okk(await p.evaluate(()=>!!document.querySelector('.ac-an [data-onb]')&&document.querySelectorAll('.ac-an .hx-an-s li').length===3),'Grande carte = « Découvre ton style » en 3 étapes');
 okk(!(await p.evaluate(()=>!!document.querySelector('#page .hz-q,#page #hq'))),'Plus de recherche sur l’accueil');
 okk(await p.evaluate(()=>getComputedStyle(document.querySelector('header .lgbtn')).display==='none'),'Globe de langue caché sur l’accueil');
 okk(!(await p.evaluate(()=>!!document.querySelector('.ac-tout,.pt-door,.ac-acts,.tw-card,.zf-uni'))),'Plus de « Tout Diva Divina » ni de cartes en double');
 okk(!(await p.evaluate(()=>!!document.querySelector('.mj-bar'))),'Bande du Majlis retirée du haut');
 okk(await p.evaluate(()=>!!document.querySelector('#dkmj')),'Onglet Majlis toujours dans la barre du bas');
 okk(await p.evaluate(()=>[...document.querySelectorAll('.ac-ronds .ac-rd')].map(x=>x.dataset.go).join(','))==='o_photo,garde,tenues','3 raccourcis : Outfit check, garde-robe, créer une tenue');
 okk(await p.evaluate(()=>getComputedStyle(document.querySelector('.hz-st .hz-call')).animationName==='acBeat'),'« Appeler Diva » bat comme un cœur');
 okk(await p.evaluate(()=>{const g=document.querySelector('.ac-duo');return !!g.querySelector('[data-view="twin"]')&&!!g.querySelector('[data-go="zf"]')}),'Style Twin et Zifafi côte à côte (Zifafi toujours là)');
 okk(await p.evaluate(()=>[...document.querySelectorAll('#page button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&(r.height<44||r.width<44)}).length)===0,'Toutes les cibles tactiles ≥ 44 px');
 await shot('accueil-fr');
 for(const [sel,pg] of [['.hz-st','chat'],['.ac-rd[data-go="o_photo"]','o_photo'],['.ac-rd[data-go="garde"]','garde'],['.ac-rd[data-go="tenues"]','tenues'],['.ac-golfe','golfe'],['.ac-duo [data-view="twin"]','twin'],['.ac-duo [data-go="zf"]','zf']]){
  await p.evaluate(()=>{window.CALLED=1;S.hist=[];home()});await p.waitForTimeout(250);
  await p.evaluate(s=>document.querySelector(s).click(),sel);await p.waitForTimeout(350);
  okk(await p.evaluate(()=>S.page)===pg,sel+' → '+pg)}
 // Analyse finie : la grande carte devient « Ma tenue du jour »
 await open({res:RES});
 okk(/^top,jour,stylist,ronds,golfe,duo(,insp)?$/.test(await ordre()),'Analyse finie : '+await ordre());
 await p.evaluate(()=>{S.hist=[];home()});await p.waitForTimeout(250);await p.evaluate(()=>document.querySelector('.ac-jour').click());await p.waitForTimeout(350);
 okk(await p.evaluate(()=>S.page)==='jour','.ac-jour → jour');
 await p.evaluate(()=>{S.hist=[];home()});await p.waitForTimeout(250);
 // Invitation du Majlis : la carte reste (elle n'apparaît que quand il y en a une)
 await p.evaluate(()=>{MJ.inv='ABCDEF';MJ.invNom='Sara';S.hist=[];S.page='home';render(false)});await p.waitForTimeout(300);
 okk(await ordre().then(o=>o.startsWith('top,mj-invite,jour')),'Invitation du Majlis juste sous Diva');
 await p.evaluate(()=>{MJ.inv='';render(false)});
 // Tenue du jour déjà choisie
 const gr=[];for(let i=0;i<8;i++)gr.push({id:'x'+i,cat:i<4?'haut':'pantalon',nom:'Pièce '+i,coul:'noir',img:''});
 await open({gr,res:RES});await p.evaluate(()=>{JR={d:jrAuj(),occ:'quotidien',look:{titre:'Chic du jeudi',conseil:'Blazer noir et pantalon',pieces:['x0','x4']},porte:0,vus:[]};render(false)});await p.waitForTimeout(300);
 okk(await p.evaluate(()=>document.querySelector('.ac-jour').innerText.includes('Chic du jeudi')),'Tenue du jour affichée dans la 1re carte');
 okk(await p.evaluate(()=>document.querySelectorAll('.ac-jour .ac-ph img,.ac-jour .ac-ph svg').length)===2,'v176 : les pièces de la tenue sont montrées');
 okk(await p.evaluate(()=>!!document.querySelector('.ac-jour [data-jporte]')&&!!document.querySelector('.ac-jour [data-acshuf]')),'v176 : « Je la porte » et « Autre idée »');
 okk(!(await p.evaluate(()=>/7/.test(document.querySelector('.ac-jour').innerText))),'v176 : plus de « 7 pièces »');
 // v176 : carte selon la garde-robe
 await open({res:RES});okk(await p.evaluate(()=>{const c=document.querySelector('.ac-jour .ac-cta');return c&&c.dataset.go==='garde'&&/premières pièces/.test(c.innerText)&&!/\d/.test(c.innerText)}),'v176 : garde-robe vide → « Ajoute tes premières pièces » sans chiffre');
 await open({gr:[{id:'a',cat:'haut',nom:'Chemise',img:''}],res:RES});okk(await p.evaluate(()=>{const c=document.querySelector('.ac-jour .ac-cta');return c.dataset.go==='garde'&&/vêtements/.test(c.innerText)}),'v176 : une seule pièce → « Ajouter mes vêtements »');
 await open({gr:[{id:'a',cat:'haut',nom:'Chemise',img:''},{id:'b',cat:'pantalon',nom:'Pantalon',img:''}],res:RES});
 okk(await p.evaluate(()=>!!document.querySelector('.ac-jour [data-acgo]')&&!!document.querySelector('.ac-jour .ac-plus')),'v176 : un haut + un bas → « Choisis ma tenue » + petit lien');
 await open({gr,res:RES});okk(await p.evaluate(()=>!!document.querySelector('.ac-jour [data-acgo]')&&!document.querySelector('.ac-jour .ac-plus')),'v176 : garde-robe pleine → « Choisis ma tenue » sans lien');
 await p.evaluate(()=>{window.jrChoisir=a=>{window.JRA=a===true?'autre':'go'}});await p.click('.ac-jour [data-acgo]');await p.waitForTimeout(300);
 okk(await p.evaluate(()=>S.page==='jour'&&window.JRA==='go'),'v176 : « Choisis ma tenue » ouvre la page et lance Diva');
 // Arabe + largeurs
 await open({res:RES},'ar');await p.waitForTimeout(400);
 okk(await p.evaluate(()=>document.documentElement.dir)==='rtl','Arabe : RTL');
 okk(await p.evaluate(()=>document.querySelector('.ac-jour').innerText.includes('شو ألبس')||!/[a-z]{4}/i.test(document.querySelector('.ac-jour b').innerText)),'Arabe : carte du jour traduite');
 await shot('accueil-ar');
 for(const w of [320,360,768]){await p.setViewportSize({width:w,height:800});await p.waitForTimeout(250);
  okk(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),w+' px : pas de défilement horizontal')}
 okk(!errs.length,'Aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(ko.length?`\n${ko.length} échec(s)`:'\nTout est bon');process.exit(ko.length?1:0)})();
