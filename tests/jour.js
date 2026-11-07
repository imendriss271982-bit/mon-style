// Tests « Que porter aujourd'hui ? » (v140) : carte de l'accueil, page du jour, occasion, météo, tenue avec les vraies pièces,
// « Je la porte aujourd'hui » (dates notées), pièces récentes évitées, autre idée, langues, largeurs, données abîmées.
// L'IA et la météo sont simulées. Lancer : python3 -m http.server 8765, puis : node tests/jour.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 await p.route('https://api.open-meteo.com/**',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({current:{temperature_2m:31.4},daily:{temperature_2m_max:[34.2],temperature_2m_min:[25.6]}})}));
 const items=[['haut','Chemise en soie','blanc'],['haut','Blouse fluide','beige'],['pantalon','Pantalon large','noir'],['jupe','Jupe plissée','camel'],['abaya','Abaya kimono','noir'],['veste','Blazer long','camel'],['chaussures','Escarpins','nude'],['sac','Sac structuré','noir']].map((a,i)=>({id:'it'+i,cat:a[0],nom:a[1],couleur:a[2],hex:'',img:''}));
 const hier=(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})();
 items[0].w=[hier];
 const boot=async(lang)=>{await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(200)};
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle_focus','{"all":true}');localStorage.setItem('monstyle_portes_vu','1');localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{corps:{forme:'Sablier',kibbe:'Soft Classic'}}}))});
 // Garde-robe vide : invitation à ajouter des vêtements
 await boot();
 await p.evaluate(()=>go('jour'));await p.waitForTimeout(200);
 ok(await p.$('[data-go="garde"]'),'Garde-robe pas prête : bouton « Ouvrir ma garde-robe »');
 // Garde-robe prête
 await p.evaluate(it=>localStorage.setItem('monstyle_gr',JSON.stringify({items:it,looks:{},saved:[]})),items);
 await boot();
 ok(await p.$('.jr-home[data-view="jour"]'),'Accueil : carte « Que porter aujourd’hui ? »');
 ok(await p.evaluate(()=>!document.querySelector('.jr-home img')),'Accueil : aucune photo de vêtement sur la carte');
 await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/°C/.test((document.querySelector('.ac-met')||document.querySelector('.jr-home')).textContent)),'Accueil : météo affichée (près d’Aura)');
 await p.click('.jr-home');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.page==='jour'),'La carte ouvre la page du jour');
 ok(await p.evaluate(()=>document.querySelectorAll('[data-jocc]').length>=6),'Choix de l’occasion');
 await p.click('[data-jocc="soiree"]');
 ok(await p.evaluate(()=>document.querySelector('[data-jocc="soiree"]').getAttribute('aria-pressed')==='true'),'Occasion choisie surlignée');
 await p.evaluate(()=>{window.__pr=[];const ids=GR.items.map(x=>x.id);let n=0;SAMPLE={json:async pr=>{__pr.push(pr);n++;return n===1?{titre:'Soir chic',pieces:[ids[1],ids[2],ids[6],'zzz'],conseil:'Le beige adoucit le noir.',manque:'Boucles dorées'}:{titre:'Abaya du soir',pieces:[ids[4],ids[6],ids[7]],conseil:'Fluide et élégante.',manque:''}}}});
 await p.click('[data-jgo]');await p.waitForTimeout(500);
 const pr=await p.evaluate(()=>__pr[0]);
 ok(/Soirée/.test(pr)&&/31 °C/.test(pr),'Aura reçoit l’occasion et la météo');
 ok(/portées ces 3 derniers jours : it0/.test(pr),'Aura évite la pièce portée hier');
 ok(/Chemise en soie/.test(pr)&&/N’invente aucune pièce/.test(pr),'Aura reçoit la vraie garde-robe');
 ok(await p.evaluate(()=>JR.look&&JR.look.pieces.join()==='it1,it2,it6'),'Pièce inventée retirée de la tenue');
 ok(await p.evaluate(()=>document.querySelectorAll('.jr-ph figure').length===3&&/Boucles dorées/.test(document.querySelector('.jr-m').textContent)),'Tenue affichée avec ses pièces et l’achat facultatif');
 await p.click('[data-jporte]');await p.waitForTimeout(200);
 const auj=await p.evaluate(()=>jrAuj());
 ok(await p.evaluate(a=>['it1','it2','it6'].every(id=>GR.items.find(x=>x.id===id).w.includes(a)),auj),'« Je la porte aujourd’hui » note la date sur chaque pièce');
 ok(await p.$('.jr-ok'),'Bouton remplacé par « Portée aujourd’hui ✓ »');
 await p.click('[data-jporte]').catch(()=>{});
 ok(await p.evaluate(a=>GR.items.find(x=>x.id==='it1').w.filter(d=>d===a).length===1,auj),'Une seule date par jour');
 await p.click('[data-jautre]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>/différente de celles-ci/.test(__pr[1])&&/it1\+it2\+it6/.test(__pr[1])),'« Autre idée » demande une tenue différente');
 ok(await p.evaluate(()=>JR.look.titre==='Abaya du soir'&&JR.porte===0),'Nouvelle tenue proposée');
 // Après rechargement : tenue du jour et dates gardées, carte de l'accueil à jour
 await boot();
 ok(await p.evaluate(()=>JR.look&&JR.look.titre==='Abaya du soir'),'Tenue du jour gardée après rechargement');
 ok(await p.evaluate(a=>GR.items.find(x=>x.id==='it2').w.includes(a),auj),'Dates portées gardées dans la garde-robe');
 ok(await p.evaluate(()=>/Abaya du soir/.test(document.querySelector('.jr-home').textContent)),'Accueil : « Ta tenue d’aujourd’hui »');
 // Une tenue d'un autre jour est ignorée ; données abîmées sans planter
 await p.evaluate(()=>{localStorage.setItem('monstyle_jour',JSON.stringify({d:'2020-01-01',occ:'soiree',look:{titre:'Vieille',pieces:['it1','it2']}}));localStorage.setItem('monstyle_meteo','{pas du json')});
 await boot();ok(await p.evaluate(()=>!JR.look),'Tenue d’un autre jour ignorée');
 await p.evaluate(()=>localStorage.setItem('monstyle_jour','[[['));await boot();ok(await p.evaluate(()=>!JR.look),'Données abîmées ignorées');
 // Erreur de l'IA : message, pas de plantage
 await p.evaluate(()=>{go('jour');SAMPLE={json:async()=>({titre:'x',pieces:['zzz']})}});await p.waitForTimeout(200);
 await p.click('[data-jgo]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/Ajoute quelques pièces/.test(document.querySelector('.note')?.textContent||'')),'Tenue impossible : message clair');
 // Langues et largeurs
 for(const lang of ['en','ar']){await p.evaluate(l=>{S.lang=l;go('jour')},lang);await p.waitForTimeout(300);
  const t=await p.evaluate(()=>document.querySelector('h1').textContent);
  ok(lang==='en'?t==='What to wear today?':t==='شنو ألبس اليوم؟','Titre traduit ('+lang+') : '+t)}
 // Largeurs : page du jour avec une tenue affichée, et accueil (même mesure que tests/ux.js)
 await p.evaluate(()=>{S.lang='fr';save();JR={d:jrAuj(),occ:'soiree',porte:0,vus:[],look:{titre:'Soir chic',pieces:['it1','it2','it6','it7'],conseil:'Le beige adoucit le noir.',manque:'Boucles dorées'}};jrSave();S.jrOcc='soiree'});
 for(const w of [320,360,390,430,768,1280]){await p.setViewportSize({width:w,height:800});const bad=[];
  for(const pg of ['jour','home']){await p.evaluate(x=>{S.hist=[];S.jrErr='';go(x)},pg);await p.waitForTimeout(700);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth,cut:[...document.querySelectorAll('#page button')].filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='visible'&&!e.closest('.jr-occ')).length}));
   if(r.sw>r.W)bad.push(pg+' déborde ('+r.sw+'>'+r.W+')');if(r.cut)bad.push(pg+' : '+r.cut+' bouton(s) coupé(s)')}
  ok(!bad.length,w+' px : aucun défilement horizontal'+(bad.length?' — '+bad.join(', '):''))}
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 console.log(fails?fails+' test(s) en échec':'Tous les tests passent');await b.close();process.exit(fails?1:0)})();
