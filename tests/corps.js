// Silhouette v107 : moteur des mesures (aura-corps.js), puis dans l'app : ordre visage → résultat → écran rassurant,
// mesures sans photo, « Refaire avec une photo », prompt sans visage, voix d'Aura, 3 langues, largeurs 320 à 1280 px.
// Lancer : node tests/corps.js (moteur seul) ; avec python3 -m http.server 8765 lancé : PAGE=1 node tests/corps.js
const C=require('../aura-corps.js');
const errs=[];const ok=(c,m)=>{console.log((c?'ok  ':'ERR ')+m);if(!c)errs.push(m)};
const cas=[
 ['Sablier',{hauteur:165,poitrine:92,taille:68,hanches:94,epaules:38},'X · Sablier'],
 ['Poire',{hauteur:158,poitrine:86,taille:72,hanches:104,epaules:36},'A · Poire'],
 ['Triangle inversé (épaules larges)',{hauteur:175,poitrine:96,taille:78,hanches:90,epaules:44},'V · Triangle inversé'],
 ['Rectangle',{hauteur:165,poitrine:90,taille:80,hanches:92,epaules:38},'H · Rectangle'],
 ['Ronde',{hauteur:162,poitrine:110,taille:108,hanches:112,epaules:41},'O · Ronde'],
];
for(const [nom,m,att] of cas){const c=C.classer(m);ok(c.forme===att,nom+' → '+c.forme+' '+JSON.stringify(c.ratios))}
ok(C.classer(cas[1][1]).grandeur==='petite'&&C.classer(cas[2][1]).grandeur==='grande','Hauteur : petite / grande');
ok(!C.verifier({hauteur:165,poitrine:'',taille:68,hanches:94,epaules:38}).ok,'Mesure vide refusée');
ok(C.verifier({hauteur:165,poitrine:92,taille:68,hanches:94,epaules:380}).champ==='epaules','Mesure absurde refusée (épaules 380 cm)');
ok(C.verifier({hauteur:'165',poitrine:'92,5',taille:68,hanches:94,epaules:38}).ok,'Virgule acceptée (92,5)');
ok(C.resultat(cas[0][1]).res.src==='mesures'&&!C.resultat(cas[0][1]).res.kibbe,'Résultat marqué « mesures », sans Kibbe inventé');

(async()=>{
 if(process.env.PAGE){
  const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';const b=await chromium.launch();
  const AI={forme:'X · Sablier',ratios:{R_WE:0.74,R_HE:1.02},proportions:'Buste et jambes équilibrés.',somatotype:'mésomorphe',score_yinyang:2,kibbe:'Soft Classic',kibbe_pourquoi:'Score 2.',essences:[{nom:'Classique',pct:60}],conseils:'Marque la taille.',a_eviter:'Le trop ample.'};
  const open=async(w,lang)=>{const p=await b.newPage({viewport:{width:w,height:820}});p.on('pageerror',e=>errs.push(w+' pageerror: '+e.message));p.on('dialog',d=>d.dismiss());
   await p.goto(URL);await p.evaluate(l=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:l,later:true,info:{taille:163},res:{}}))},lang);
   await p.goto(URL);await p.waitForTimeout(900);
   await p.evaluate(ai=>{document.getElementById('splash')?.remove();window.__said=[];S.voice=true;window.say=t=>__said.push(t);window.__pr=[];
    SAMPLE={json:async pr=>{__pr.push(pr);return /visagisme/i.test(pr)?{forme:'Ovale',pourquoi:'p',micro:'m',coupes:'c',couleur_cheveux:'h',lunettes:'l',makeup:'k'}:/morphologie/i.test(pr)?ai:{saison:Object.keys(SEASONS)[0],sous_ton:'chaud',pourquoi:'x'}}};
    if(window.MESURE)MESURE.mesurer=async()=>null;window.acamOpen=k=>{window.__cam=k};
    S.file.face=new File([new Uint8Array(10)],'v.jpg',{type:'image/jpeg'});S.file.body=new File([new Uint8Array(10)],'b.jpg',{type:'image/jpeg'});home()},AI);return p};
  // ——— 1. Ordre : photo du visage → résultat du visage → écran rassurant ———
  let p=await open(390,'fr');
  const order=await p.evaluate(()=>FLOW_A.join(','));
  ok(/a_face,v_run,r_visage,b_intro,a_body,c_run,r_corps/.test(order),'Analyse complète : visage → résultat visage → écran silhouette ('+order+')');
  await p.evaluate(()=>{S.flow=FLOW_A;S.hist=['home'];S.page='a_face';render(false)});await p.click('[data-next]');await p.waitForTimeout(500);
  ok(await p.evaluate(()=>S.page==='r_visage'&&!__pr.some(x=>/Kibbe/.test(x))),'Le résultat du visage s’affiche avant toute demande de photo du corps');
  await p.click('[data-next]');await p.waitForTimeout(250);
  const bi=await p.evaluate(()=>({pg:S.page,t:document.getElementById('page').innerText,f:document.getElementById('foot').innerText,said:__said.slice(-1)[0]}));
  ok(bi.pg==='b_intro','Écran rassurant ouvert après le résultat du visage');
  ok(/habillée, avec des vêtements près du corps/.test(bi.t)&&/cacher ou couper ton visage/.test(bi.t)&&/jamais gardée/.test(bi.t),'Les 3 phrases rassurantes');
  ok(/Prendre ma photo/.test(bi.f)&&/Je préfère donner mes mesures/.test(bi.f),'Les 2 boutons');
  ok(bi.said==='Ta photo reste privée, et tu peux cacher ton visage.','Aura le dit à voix haute');
  ok(await p.evaluate(()=>getComputedStyle(document.body).backgroundColor==='rgb(250, 247, 242)'&&getComputedStyle(document.querySelector('[data-bgo]')).backgroundColor==='rgb(112, 43, 58)'),'Palette officielle (#FAF7F2, #702B3A)');
  // Photo : l'appareil s'ouvre tout de suite, puis analyse
  await p.click('[data-bgo]');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>S.page==='a_body'&&__cam==='body'&&/cacher ou couper/.test(document.getElementById('page').innerText)),'« Prendre ma photo » ouvre l’appareil de la silhouette');
  await p.click('[data-next]');await p.waitForTimeout(500);
  const pr=await p.evaluate(()=>__pr.find(x=>/Kibbe/.test(x))||'');
  ok(/visage peut être caché/.test(pr)&&/Ne refuse jamais/.test(pr)&&/UNIQUEMENT le corps/.test(pr),'Prompt Gemini : corps seulement, jamais de refus sans visage');
  ok(await p.evaluate(()=>S.page==='r_corps'&&S.res.corps.kibbe==='Soft Classic'),'Résultat par photo avec Kibbe');
  await p.close();
  // ——— 2. Mesures sans photo ———
  p=await open(390,'fr');
  await p.evaluate(()=>startMod('corps'));await p.waitForTimeout(200);
  ok(await p.evaluate(()=>S.page==='b_intro'),'Refaire la silhouette : passe aussi par l’écran rassurant');
  await p.click('[data-bmes]');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>S.page==='b_mes'&&!!document.querySelector('.bm-svg')&&document.querySelectorAll('[data-bm]').length===5&&document.getElementById('bm_hauteur').value==='163'),'Formulaire : 5 mesures, dessin, hauteur du profil reprise');
  await p.click('[data-bcalc]');await p.waitForTimeout(150);
  ok(await p.evaluate(()=>S.page==='b_mes'&&document.querySelector('.field.bad')),'Mesure manquante : champ signalé, pas de résultat');
  for(const [k,v] of [['epaules','36'],['poitrine','86'],['taille','72'],['hanches','104']])await p.fill('#bm_'+k,v);
  await p.click('[data-bcalc]');await p.waitForTimeout(300);
  const rc=await p.evaluate(()=>({pg:S.page,c:S.res.corps,t:document.getElementById('page').innerText,ls:JSON.parse(localStorage.getItem('monstyle')).res.corps,pf:PROFIL(),pr:__pr.length}));
  ok(rc.pg==='r_corps'&&rc.c.forme==='A · Poire','Résultat calculé : '+rc.c.forme);
  ok(/Calculée avec tes mesures/.test(rc.t)&&/Ce qui te met en valeur/.test(rc.t)&&/Ta hauteur/.test(rc.t)&&/Refaire avec une photo/.test(rc.t),'Même type de résultat + lien « Refaire avec une photo »');
  ok(rc.ls&&rc.ls.mes&&rc.ls.mes.hanches===104,'Mesures gardées dans le téléphone (localStorage)');
  ok(rc.pr===0,'Aucune donnée envoyée à l’IA pour les mesures');
  ok(!/Kibbe undefined/.test(rc.pf)&&/A · Poire/.test(rc.pf),'Profil d’Aura correct sans Kibbe');
  await p.click('[data-bphoto]');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>S.page==='a_body'&&S.flow.join()==='a_body,c_run,r_corps'),'« Refaire avec une photo » ouvre la photo de la silhouette');
  await p.close();
  // ——— 3. Langues ———
  for(const [lang,re,re2] of [['en',/Your photo stays private/,/I’d rather give my measurements/],['ar',/صورتچ تظل خاصة/,/أفضّل أعطيچ مقاساتي/]]){p=await open(390,lang);
   await p.evaluate(()=>startMod('corps'));await p.waitForTimeout(400);
   const t=await p.evaluate(()=>document.body.innerText);ok(re.test(t)&&re2.test(t),lang+' : écran rassurant traduit');
   if(lang==='ar')ok(await p.evaluate(()=>document.documentElement.dir==='rtl'),'ar : RTL');
   await p.click('[data-bmes]');await p.waitForTimeout(300);
   for(const [k,v] of [['hauteur','165'],['epaules','38'],['poitrine','92'],['taille','68'],['hanches','94']])await p.fill('#bm_'+k,v);
   await p.click('[data-bcalc]');await p.waitForTimeout(400);
   const t2=await p.evaluate(()=>document.getElementById('page').innerText);
   ok(lang==='en'?/Hourglass/.test(t2)&&/Worked out from your measurements/.test(t2)&&/Redo with a photo/.test(t2):/ساعة رملية/.test(t2)&&/محسوبة من مقاساتچ/.test(t2)&&/عيديها بصورة/.test(t2),lang+' : résultat des mesures traduit');
   await p.close()}
  // ——— 4. Largeurs ———
  for(const w of [320,360,390,430,768,1280])for(const lang of ['fr','ar']){p=await open(w,lang);const bad=[];
   for(const pg of ['b_intro','b_mes','a_body']){await p.evaluate(x=>{S.flow=['b_intro','a_body','c_run','r_corps'];S.hist=['home'];S.page=x;render(false)},pg);await p.waitForTimeout(800);
    const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}));if(r.sw>r.W)bad.push(pg+' ('+r.sw+'>'+r.W+')')}
   await p.evaluate(()=>{S.res.corps=CORPS_MES.resultat({hauteur:165,poitrine:92,taille:68,hanches:94,epaules:38}).res;S.flow=null;S.page='r_corps';render(false)});await p.waitForTimeout(800);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}));if(r.sw>r.W)bad.push('r_corps');
   ok(!bad.length,w+' px '+lang+' : aucun défilement horizontal'+(bad.length?' — '+bad.join(', '):''));await p.close()}
  await b.close();
 }
 console.log(errs.length?'ERREURS:\n'+errs.join('\n'):'Aucune erreur');process.exit(errs.length?1:0)})();
