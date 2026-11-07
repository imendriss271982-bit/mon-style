// Test de l'accueil v174 (ordre voulu par Imen) : Majlis retiré du haut, ordre des cartes, bouton d'appel qui bat, liens, arabe, largeurs.
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
 const ordre=()=>p.evaluate(()=>{const hx=document.querySelector('#page .hx');const m=[['.hz-top','top'],['.ac-jour','jour'],['.tw-card','twin'],['.hz-st','stylist'],['.ac-oc','outfit'],['.ac-acts','acts'],['.zf-uni','zifafi'],['.ac-tout','tout'],['.hz-insp','insp']];
   return [...hx.children].map(c=>{const f=m.find(([s])=>c.matches(s));return f?f[1]:c.className}).join(',')});
 const shot=async n=>{if(SHOTS)await p.screenshot({path:SHOTS+'/'+n+'.png',fullPage:true})};

 await open();
 okk(/^top,jour,twin,stylist,outfit,acts,zifafi,tout(,insp)?$/.test(await ordre()),'Ordre : '+await ordre());
 okk(await p.evaluate(()=>document.querySelector('#page').firstElementChild.classList.contains('hx')),'Rien avant l’accueil');
 okk(!(await p.evaluate(()=>!!document.querySelector('.mj-bar'))),'Bande du Majlis retirée du haut');
 okk(await p.evaluate(()=>!!document.querySelector('#dkmj')),'Onglet Majlis toujours dans la barre du bas');
 okk(await p.evaluate(()=>{const a=document.querySelector('.ac-acts').children;return a[0].dataset.go==='garde'&&a[1].dataset.go==='tenues'}),'Ma garde-robe puis Créer une tenue');
 okk(await p.evaluate(()=>getComputedStyle(document.querySelector('.hz-st .hz-call')).animationName==='acBeat'),'« Appeler Aura » bat comme un cœur');
 okk(!(await p.evaluate(()=>!!document.querySelector('.pt-act,.pt-sug,.fx-pied'))),'Plus d’actions en double ni de « Tout afficher »');
 okk(await p.evaluate(()=>document.querySelectorAll('.ac-tout .pt-door').length)===3,'Tout My Style : 3 portes');
 await shot('accueil-fr');
 // Chaque carte ouvre sa page
 for(const [sel,pg] of [['.ac-jour','jour'],['.tw-card','twin'],['.hz-st','chat'],['.ac-oc','o_photo'],['.ac-acts [data-go="garde"]','garde'],['.ac-acts [data-go="tenues"]','tenues'],['.zf-uni [data-go="zf"]','zf'],['[data-porte="style"]','porte']]){
  await p.evaluate(()=>{window.CALLED=1;S.hist=[];home()});await p.waitForTimeout(250);
  await p.evaluate(s=>document.querySelector(s).click(),sel);await p.waitForTimeout(350);
  okk(await p.evaluate(()=>S.page)===pg,sel+' → '+pg)}
 // Invitation du Majlis : la carte reste (elle n'apparaît que quand il y en a une)
 await p.evaluate(()=>{MJ.inv='ABCDEF';MJ.invNom='Sara';S.hist=[];S.page='home';render(false)});await p.waitForTimeout(300);
 okk(await ordre().then(o=>o.startsWith('top,mj-invite,jour')),'Invitation du Majlis juste sous Aura');
 await p.evaluate(()=>{MJ.inv='';render(false)});
 // Tenue du jour déjà choisie
 const gr=[];for(let i=0;i<8;i++)gr.push({id:'x'+i,cat:i<4?'haut':'pantalon',nom:'Pièce '+i,coul:'noir',img:''});
 await open({gr});await p.evaluate(()=>{JR={d:jrAuj(),occ:'quotidien',look:{titre:'Chic du jeudi',conseil:'Blazer noir et pantalon',pieces:['x0','x4']},porte:0,vus:[]};render(false)});await p.waitForTimeout(300);
 okk(await p.evaluate(()=>document.querySelector('.ac-jour').innerText.includes('Chic du jeudi')),'Tenue du jour affichée dans la 1re carte');
 // Arabe + largeurs
 await open({},'ar');await p.waitForTimeout(400);
 okk(await p.evaluate(()=>document.documentElement.dir)==='rtl','Arabe : RTL');
 okk(await p.evaluate(()=>document.querySelector('.ac-jour').innerText.includes('شو ألبس')||!/[a-z]{4}/i.test(document.querySelector('.ac-jour b').innerText)),'Arabe : carte du jour traduite');
 await shot('accueil-ar');
 for(const w of [320,360,768]){await p.setViewportSize({width:w,height:800});await p.waitForTimeout(250);
  okk(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),w+' px : pas de défilement horizontal')}
 okk(!errs.length,'Aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(ko.length?`\n${ko.length} échec(s)`:'\nTout est bon');process.exit(ko.length?1:0)})();
