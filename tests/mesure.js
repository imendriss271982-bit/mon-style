// Mesure du visage (aura-mesure.js) : règles A, B, C, D, puis branchement dans l'app avec une mesure et une IA simulées.
// Lancer : node tests/mesure.js (règles seules) ; avec python3 -m http.server 8765 lancé : PAGE=1 node tests/mesure.js
const M=require('../aura-mesure.js');
const errs=[];
const cas=[
 // Exemples chiffrés du cours « Quelle est la forme de mon visage ? »
 ['Beyoncé (cours) → Ovale',{A:15,B:9.7,C:10.5,D:8.9,ang:0.72},'Ovale'],
 ['Autrice du cours (5 / 5,2 / 4,7 cm, contours doux) → Oblong',{A:8.3,B:5,C:5.2,D:4.7,ang:0.70},'Oblong'],
 ['Sarah Jessica Parker (6,6 / 6,5 / 6,3 cm, allongé, doux) → Oblong',{A:9.75,B:6.6,C:6.5,D:6.3,ang:0.70},'Oblong'],
 // Une forme type par règle
 ['Carré',{A:11,B:9.7,C:10,D:9.6,ang:0.88},'Carré'],
 ['Rond',{A:11,B:9.6,C:10,D:9.3,ang:0.70},'Rond'],
 ['Rectangulaire',{A:14,B:9.7,C:10,D:9.5,ang:0.86},'Rectangulaire'],
 ['Cœur',{A:13.5,B:9.8,C:10,D:7.8,ang:0.65},'Cœur'],
 ['Diamant',{A:13.5,B:8,C:10,D:8.6,ang:0.70},'Diamant'],
 ['Triangle',{A:13,B:8.5,C:10,D:10,ang:0.85},'Triangle'],
 // Entre deux cases : forme la plus proche, jamais vide
 ['Entre ovale et cœur',{A:13.2,B:9.3,C:10,D:8.2,ang:0.7},null],
];
for(const [nom,m,attendu] of cas){const c=M.classer(m);
 if(!c||!c.forme)errs.push(nom+' : aucune forme');
 else if(attendu&&c.forme!==attendu)errs.push(nom+' : '+c.forme+' au lieu de '+attendu+' (L '+c.L+', f '+c.f+', j '+c.j+')');
 else console.log('ok  '+nom+' : '+c.forme);}
if(M.classer({A:0,B:1,C:1,D:1})!==null)errs.push('mesures vides acceptées');
const pq=M.pourquoi(M.classer(cas[0][1]));if(!/ovale/.test(pq)||!/%/.test(pq))errs.push('phrase pourquoi : '+pq);

(async()=>{
 if(process.env.PAGE){
  const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
  const b=await chromium.launch(),p=await b.newPage({viewport:{width:390,height:844}});
  p.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await p.goto(URL);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{}}))});
  await p.goto(URL);await p.waitForTimeout(1200);
  const essai=async(mes,lang)=>p.evaluate(async([mes,lang])=>{document.getElementById('splash')?.remove();S.lang=lang;
   window.__pr=[];SAMPLE={json:async pr=>{__pr.push(pr);return {forme:'Rond',ratios:{R_HL:1,R_JW:1,R_CH:1},pourquoi:'Explication.',micro:'m',coupes:'Carré plongeant.',couleur_cheveux:'c',lunettes:'l',makeup:'k'}}};
   MESURE.mesurer=async()=>mes;S.res.visage=null;S.file.face=new File([new Uint8Array(10)],'v.jpg',{type:'image/jpeg'});
   S.hist=[];S.flow=['a_face','v_run','r_visage'];go('v_run');await run('v_run');await new Promise(z=>setTimeout(z,300));
   return {page:S.page,v:S.res.visage,err:S.err,pr:__pr[0]||'',txt:document.getElementById('page').innerText}},[mes,lang]);
  const m=M.classer({A:15,B:9.7,C:10.5,D:8.9,ang:0.72});
  // 1. Mesure réussie : Gemini reçoit la forme mesurée et ne peut pas la changer
  let r=await essai({...m,pourquoi:M.pourquoi(m),mesures:{}},'fr');
  if(!r.v||r.v.forme!=='Ovale')errs.push('forme non imposée : '+JSON.stringify(r.v));
  if(!/DÉJÀ été mesurée/.test(r.pr)||!/forme = Ovale/.test(r.pr))errs.push('prompt sans la mesure');
  if(!r.v||!r.v.mesure_ok||r.v.ratios.R_HL!==m.R_HL)errs.push('ratios mesurés absents');
  if(!/Forme mesurée sur ta photo/.test(r.txt))errs.push('page résultat sans la mention de mesure : '+r.page);
  // 2. Visage tourné : photo refusée sans appeler Gemini
  r=await essai({erreur:'Ton visage est un peu tourné. Regarde bien l’objectif, de face, et reprends la photo.'},'fr');
  if(r.pr)errs.push('Gemini appelé malgré un visage tourné');if(!/tourné/.test(r.err||''))errs.push('erreur visage tourné absente : '+r.err);
  // 3. Mesure impossible (pas de réseau) : l'ancienne analyse par Gemini continue
  r=await essai(null,'fr');
  if(!r.v||r.v.forme!=='Rond'||r.v.mesure_ok)errs.push('repli Gemini cassé : '+JSON.stringify(r.v));if(/DÉJÀ été mesurée/.test(r.pr))errs.push('repli : prompt mesuré');
  // 4. Arabe : la mention est traduite
  r=await essai({...m,pourquoi:M.pourquoi(m),mesures:{}},'ar');await p.evaluate(()=>render(false));await p.waitForTimeout(300);
  const t=await p.evaluate(()=>document.getElementById('page').innerText);if(!/نقطة نقطة/.test(t))errs.push('mention non traduite en arabe');
  await b.close();
 }
 console.log(errs.length?'ERREURS:\n'+errs.join('\n'):'Aucune erreur');process.exit(errs.length?1:0)})();
