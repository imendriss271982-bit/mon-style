// Tests Zifafi Wedding (v112) : entrée, tableau de bord, réutilisation du profil My Style (sans refaire les tests),
// 3 façons de trouver la robe (Aura, explorer, photo), « J’aime », accessoires, bouquet, coiffure et make-up,
// look complet (photos de référence, plusieurs looks, cohérence), checklist (cocher, rouvrir, modifier, ajouter,
// supprimer, dates), conseils (recherche, filtre, enregistrer), formules (limite gratuite si GRATUIT=false),
// Aura (contexte mariée), traductions anglais/arabe, largeurs 320 à 1280 px, données abîmées, effacement.
// Lancer : python3 -m http.server 8765, puis : node tests/wedding.js
const {chromium}=require('playwright');const path=require('path');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
const MS={nom:'Lina',lang:'fr',later:true,res:{corps:{forme:'X · Sablier',kibbe:'Soft Classic'},couleurs:{saison:'Hiver Vif'},visage:{forme:'Ovale'}}};
(async()=>{const b=await chromium.launch();const errs=[];
 const open=async(w,ms,extra)=>{const p=await b.newPage({viewport:{width:w,height:820}});p.on('pageerror',e=>errs.push(w+': '+e.message));p.on('dialog',d=>d.accept());
  await p.goto(URL);await p.evaluate(([ms,extra])=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify(ms));if(extra)localStorage.setItem('monstyle_zf',extra)},[ms,extra||null]);
  await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});return p};
 const st=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('monstyle_zf')||'null'));
 const click=async(p,sel)=>{await p.click(sel);await p.waitForTimeout(160)};
 const txt=p=>p.evaluate(()=>document.body.innerText);
 // ——— Logique pure ———
 const E=require(path.join(__dirname,'..','zifafi-methode.js'));
 ok(E.zfSeasonHint('Hiver Vif').metal==='argent'&&E.zfSeasonHint('Automne Chaud').whites.includes('ivoire')&&E.zfSeasonHint('')===null,'Repère de saison My Style (froid/chaud, rien si inconnu)');
 ok(E.zfShapeFromMS('X · Sablier')==='X'&&E.zfShapeFromMS('Poire')==='A'&&E.zfShapeFromMS('O · Ronde')==='','Silhouette My Style → catégorie (rien inventé pour « Ronde »)');
 ok(E.zfDefaultTasks({}).length===18&&E.zfDefaultTasks({events:['henne','zaffa']}).length===20,'Checklist de base + tâches selon les moments du mariage');
 ok(E.zfTaskDue('2027-05-20','p6')==='2027-02-19'&&E.zfTaskDue('','p6')==='','Dates conseillées calculées seulement si la date est connue');
 ok(E.zfCleanTasks('x')===null&&E.zfCleanTasks([{id:'a',per:'zz',t:5},{id:'a'},null]).length===1,'Checklist abîmée nettoyée');
 ok(E.zfCoherence({dress:{deco:'riche'},sel:{bijoux:'parure'}}).length===1&&E.zfCoherence({sel:{}}).length===0,'Cohérence : repère doux seulement quand c’est utile');
 ok(!JSON.stringify(E.ZF_TIPS).match(/QAR|€|\$|obligatoire|interdit/),'Conseils : ni prix ni règle imposée');
 // ——— Entrée et tableau de bord ———
 let p=await open(390,MS);
 ok(await p.evaluate(()=>/Zifafi/.test(document.querySelector('.zf-u.zw').innerText)&&/guidé par Aura/.test(document.querySelector('.zf-u.zw').innerText)),'Accueil My Style : entrée « Zifafi Wedding » + sous-titre');
 await click(p,'.zf-u.zw [data-go="zf"]');
 let t=await txt(p);
 ok(/Zifafi Wedding/.test(t)&&/Bienvenue,\s*Lina/.test(t),'Tableau de bord : titre et bienvenue avec le prénom');
 ok(await p.evaluate(()=>!!document.querySelector('.zf-big[data-go="zf_dress"]')&&!!document.querySelector('.zf-big[data-zfaura]')),'Deux actions principales : robe de rêve, Demander à Aura');
 ok(/Ovale/.test(t)&&/Sablier/.test(t)&&/Soft Classic/.test(t)&&/Hiver Vif/.test(t)&&/rien à refaire/.test(t),'Profil My Style réutilisé (visage, silhouette, Kibbe, saison) sans refaire de test');
 ok(await p.evaluate(()=>document.querySelectorAll('.zf-nav [data-zfgo]').length===8&&!!document.querySelector('.zf-jour [role=progressbar]')),'Navigation compacte (8 sections) et progression du parcours');
 ok(/0 étapes sur 7/.test(t),'Progression réelle (rien d’inventé au départ)');
 // Profil incomplet : invitation contextuelle, jamais bloquante
 let q=await open(390,{nom:'Sara',lang:'fr',later:true});await q.evaluate(()=>go('zf'));
 ok(/Fais ton analyse des couleurs/.test(await txt(q))&&!!(await q.$('[data-zfms]')),'Analyse manquante : invitation à compléter, Zifafi reste utilisable');
 await click(q,'[data-zfms]');ok(await q.evaluate(()=>S.flow&&S.flow.length>0&&S.page!=='zf'),'« Compléter mes analyses » lance seulement les tests manquants');
 // ——— Robe : mode A, B, C ———
 await p.evaluate(()=>go('zf_dress'));
 ok(await p.evaluate(()=>document.querySelectorAll('.zf-mode').length===3)&&/Repère de ta saison My Style \(Hiver Vif\)/.test(await txt(p)),'Ma robe : 3 façons + repère de saison');
 await click(p,'[data-zfreco]');ok(await p.evaluate(()=>S.page==='zf_prof'),'Recommandation sans profil → quelques questions d’abord (rien deviné)');
 await p.evaluate(()=>go('zf_expl'));
 await click(p,'[data-zfpk="silhouette"] [data-zfpv="princesse"]');await click(p,'[data-zfpk="neckline"] [data-zfpv="bateau"]');await click(p,'[data-zfpk="sleeves"] [data-zfpv="longues"]');
 let z=await st(p);ok(z.prof&&z.prof.silhouette.includes('princesse')&&z.prof.neckline.includes('bateau'),'Explorer : choix multiples enregistrés dans les préférences de mariée');
 ok(await p.evaluate(()=>{const m=JSON.parse(localStorage.getItem('monstyle'));return m.res.corps.forme==='X · Sablier'&&!('zf' in m)}),'Le profil My Style général n’est pas modifié');
 await click(p,'#foot [data-zfreco]');ok(await p.evaluate(()=>S.page==='zf_robe'&&document.querySelectorAll('.zf-reco').length===3),'Explorer → propositions d’Aura');
 ok(await p.evaluate(()=>document.querySelector('.zf-reco h2').innerText.includes('Princesse')),'Les choix explorés orientent les propositions');
 ok(/Repère de ta saison My Style : blanc pur/.test(await txt(p)),'Proposition : couleurs suggérées d’après la saison My Style');
 const sil=await p.evaluate(()=>document.querySelectorAll('.zf-reco')[1].querySelector('[data-zflike]').dataset.zflike);
 await click(p,`.zf-reco [data-zflike="${sil}"]`);z=await st(p);ok(z.like.includes(sil),'« J’aime » enregistré');
 ok(await p.evaluate(s=>zfRecoProf(ZD.prof).silhouette.includes(s)&&!ZD.prof.silhouette.includes(s),sil),'« J’aime » sert aux propositions suivantes sans modifier le profil');
 await click(p,'.zf-reco [data-zfsave]');ok((await st(p)).saved.length===1,'Enregistrer une robe (favoris)');
 // Mode C : photo d’une robe → Aura (photo jointe, question, contexte mariée) + inspiration
 await p.evaluate(()=>go('zf_dress'));
 const img=path.join(__dirname,'..','stylist.jpg');
 await p.setInputFiles('[data-zfphoto="robes"]',img);await p.waitForTimeout(900);
 ok(await p.evaluate(()=>S.page==='chat'&&!!S.cphoto&&S.zfCtx==='mariee'&&/correspond/.test(S.draft)),'Photo de robe → Aura en mode mariée, photo jointe, question prête');
 ok(await p.evaluate(()=>[...document.querySelectorAll('.ch-sug [data-chsay]')].some(b=>/voile/.test(b.innerText))),'Questions proposées sur la photo (voile, accessoires…)');
 ok(await p.evaluate(()=>/marque, ni prix|jamais le créateur/.test(PROFIL())&&/ses analyses My Style/.test(PROFIL())),'Aura : sépare analyses, choix, photo, suggestions ; ni marque ni prix');
 ok(await p.evaluate(()=>/visage Ovale/.test(PROFIL())&&/saison Hiver Vif/.test(PROFIL())),'Aura reçoit le profil My Style existant');
 ok((await st(p)).insN===1,'Photo gardée dans l’inspiration (sur le téléphone)');
 await p.evaluate(()=>{S.cphoto=null;go('home')});ok(await p.evaluate(()=>S.zfCtx==='quotidien'),'Hors Zifafi, Aura revient au style du quotidien');
 // ——— Accessoires, bouquet, beauté ———
 await p.evaluate(()=>{S.zfCat='acc';go('zf_cat')});
 ok(await p.evaluate(()=>['voile','bijoux','chaussures'].every(k=>document.querySelector(`[data-zfpick="${k}"]`))),'Accessoires : voile, bijoux, chaussures');
 await click(p,'[data-zfpick="bijoux"][data-zfv="parure"]');z=await st(p);
 ok(z.looks.length===1&&z.looks[0].sel.bijoux==='parure'&&z.looks[0].dress,'Un choix crée le look complet, avec la robe enregistrée');
 await p.fill('#zf_own','boucles de ma mère');await p.dispatchEvent('#zf_own','change');ok((await st(p)).own==='boucles de ma mère','Ce que je possède déjà est gardé');
 ok(await p.evaluate(()=>/possède déjà \(écrit par elle\) : boucles de ma mère/.test(PROFIL())),'Aura en tient compte (pas d’achat inutile)');
 await p.evaluate(()=>{S.zfCat='bouquet';go('zf_cat')});
 await click(p,'[data-zfpk="fleurs"] [data-zfpv="pivoines"]');await click(p,'[data-zfpick="bouquet"][data-zfv="cascade"]');z=await st(p);
 ok(z.prof.fleurs.includes('pivoines')&&z.looks[0].sel.bouquet==='cascade','Bouquet : fleurs préférées et style choisis');
 await p.evaluate(()=>{S.zfCat='beaute';go('zf_cat')});
 ok(/Ta forme de visage \(My Style\)/.test(await txt(p))&&/Ovale/.test(await txt(p))&&!!(await p.$('[data-go="beaute"]')),'Coiffure et make-up : forme du visage My Style réutilisée + lien Beauté existant');
 await click(p,'[data-zfpick="coiffure"][data-zfv="chignon"]');await click(p,'[data-zfpick="makeup"][data-zfv="softglam"]');
 // ——— Look complet ———
 await p.evaluate(()=>go('zf_full'));
 ok(await p.evaluate(()=>document.querySelectorAll('.zf-fr').length===8),'Look complet : robe, voile, bijoux, chaussures, coiffure, maquillage, bouquet, couleurs');
 await p.setInputFiles('[data-zfref="voile"]',img);await p.waitForTimeout(900);
 z=await st(p);ok(!!z.looks[0].ref.voile&&await p.evaluate(()=>!!document.querySelector('.zf-fr-img')),'Photo de référence liée à un élément');
 await click(p,'[data-zfrefdel="voile"]');ok(!(await st(p)).looks[0].ref.voile,'Photo de référence retirée');
 await p.fill('#zf_fnotes','Robe du soir plus légère');await p.dispatchEvent('#zf_fnotes','change');ok((await st(p)).looks[0].notes==='Robe du soir plus légère','Notes du look enregistrées');
 await click(p,'[data-zffullnew]');z=await st(p);ok(z.looks.length===2&&z.cur===z.looks[0].id,'Plusieurs looks (cérémonies, tenues)');
 await click(p,`[data-zfcur="${z.looks[1].id}"]`);ok((await st(p)).cur===z.looks[1].id,'Passer d’un look à l’autre');
 ok(/Premium · offert pendant le test/.test(await txt(p)),'Indicateur Premium clair pendant le test');
 // ——— Checklist ———
 await p.evaluate(()=>{ZD.prof.date='2027-05-20';zfSave();go('zf_chk')});
 ok(await p.evaluate(()=>[...document.querySelectorAll('.zf-per[open]')].length===1&&/Maintenant/.test(document.querySelector('.zf-per[open]').innerText)),'Checklist : seule la période actuelle est ouverte (« Maintenant »)');
 await p.evaluate(()=>document.querySelectorAll('.zf-per').forEach(d=>d.open=true));
 ok(/0 tâches faites sur 18/.test(await txt(p))&&/2027-02-19/.test(await txt(p)),'Checklist : 18 tâches et dates conseillées');
 await click(p,'[data-zftk="t_robe"]');ok((await st(p)).tasks.find(x=>x.id==='t_robe').done&&await p.evaluate(()=>document.querySelector('[data-zftk="t_robe"]').closest('details').open),'Cocher une tâche (sa période reste ouverte)');
 await click(p,'[data-zftk="t_robe"]');ok(!(await st(p)).tasks.find(x=>x.id==='t_robe').done,'Rouvrir une tâche');
 await click(p,'[data-zftkedit="t_rdv"]');await p.fill('#zf_tkt','Rendez-vous chez Layla');await p.fill('#zf_tkd','2026-12-01');await p.fill('#zf_tkn','apporter les chaussures');await click(p,'[data-zftksave="t_rdv"]');
 let tk=(await st(p)).tasks.find(x=>x.id==='t_rdv');ok(tk.t==='Rendez-vous chez Layla'&&tk.due==='2026-12-01'&&tk.note==='apporter les chaussures','Modifier titre, date et note');
 await p.fill('#zf_tknew','Choisir le parfum');await click(p,'[data-zftkadd]');z=await st(p);const own=z.tasks.find(x=>x.own);ok(own&&own.t==='Choisir le parfum','Ajouter une tâche personnelle');
 await click(p,`[data-zftkedit="${own.id}"]`);await click(p,`[data-zftkdel="${own.id}"]`);ok(!(await st(p)).tasks.some(x=>x.own),'Supprimer une tâche');
 await p.reload();await p.waitForTimeout(800);ok(await p.evaluate(()=>ZD.tasks.find(x=>x.id==='t_rdv').t==='Rendez-vous chez Layla'),'Checklist restaurée après rechargement');
 await p.evaluate(()=>{document.getElementById('splash')?.remove();go('zf_chk')});ok(/Pas de rappel automatique/.test(await txt(p)),'Aucune fausse promesse de notification');
 // ——— Conseils ———
 await p.evaluate(()=>go('zf_tips'));
 await p.fill('#zf_tipq','ourlet');await p.waitForTimeout(150);ok(await p.evaluate(()=>document.querySelectorAll('.zf-tipc').length===1),'Recherche dans les conseils');
 await p.fill('#zf_tipq','');await click(p,'[data-zftipc="etiquette"]');ok(await p.evaluate(()=>document.querySelectorAll('.zf-tipc').length===4),'Filtre par catégorie (étiquette)');
 await click(p,'[data-zftip="q1"]');ok((await st(p)).tipSav.includes('q1'),'Enregistrer un conseil');
 await click(p,'[data-zftipsav]');ok(await p.evaluate(()=>document.querySelectorAll('.zf-tipc').length===1),'Voir les conseils enregistrés');
 ok(!!(await p.$('.zf-tipsp [data-go="zf_acad"]')),'Étiquette : accès à l’Académie de l’élégance');
 // ——— Formules : limite gratuite (simulation hors phase de test) ———
 const r=await p.evaluate(()=>{const o=zfPrem;zfPrem=()=>false;const a=zfCan('look+');zfPrem=o;return a});ok(r===false,'Sans Premium (GRATUIT=false) : un seul look gratuit');
 ok(await p.evaluate(()=>zfCan('look+')),'Pendant le test (GRATUIT=true) : tout est ouvert');
 // ——— Chaque bouton visible a une action ———
 const inert=[];for(const pg of ['zf','zf_dress','zf_expl','zf_cat','zf_full','zf_chk','zf_tips']){await p.evaluate(x=>{S.hist=[];go(x)},pg);await p.waitForTimeout(250);
  inert.push(...await p.evaluate(pg=>[...document.querySelectorAll('#page button,#foot button')].filter(b=>!Object.keys(b.dataset).length&&!b.closest('[data-zfpk],[data-zfk]')&&b.getAttribute('type')!=='submit').map(b=>pg+': '+b.innerText.slice(0,30)),pg))}
 ok(!inert.length,'Aucun bouton sans action'+(inert.length?' : '+inert.join(' | '):''));
 // ——— Langues ———
 for(const lang of ['en','ar']){const L=await open(390,{...MS,lang},await p.evaluate(()=>localStorage.getItem('monstyle_zf')));const left=[];
  for(const [pg,cat] of [['zf'],['zf_dress'],['zf_expl'],['zf_cat','acc'],['zf_cat','bouquet'],['zf_cat','beaute'],['zf_full'],['zf_chk'],['zf_tips']]){await L.evaluate(([x,c])=>{if(c)S.zfCat=c;S.hist=[];go(x)},[pg,cat]);await L.waitForTimeout(400);
   left.push(...await L.evaluate(([pg,lang])=>{const out=[],w=document.createTreeWalker(document.querySelector('#page'),NodeFilter.SHOW_TEXT);let n;
    while(n=w.nextNode()){const s=n.nodeValue.trim();if(!s||n.parentElement.closest('[data-noi18n],svg,script,style'))continue;
     const bad=lang==='en'?/[éèàçùêâîôœ]|\b(le|la|les|des|ton|ta|tes|mon|ma|mes|et|pour|avec|une|sur)\b/i.test(s):/[A-Za-zÀ-ÿ]{3}/.test(s.replace(/My Style|Zifafi|Wedding|Kibbe|Soft Classic|Premium|Lina|Aura|Ovale|Sablier|Hiver Vif|Pinterest/g,''));
     if(bad)out.push(pg+': '+s.slice(0,60))}return out},[pg,lang]))}
  ok(!left.length,'Traduction '+lang+' complète'+(left.length?' — reste : '+[...new Set(left)].slice(0,12).join(' | '):''));
  if(lang==='ar')ok(await L.evaluate(()=>document.documentElement.dir==='rtl'),'Arabe : lecture de droite à gauche');await L.close()}
 // ——— Largeurs ———
 for(const w of [320,360,390,430,1280]){const W=await open(w,MS,await p.evaluate(()=>localStorage.getItem('monstyle_zf')));const bad=[];
  for(const [pg,cat] of [['zf'],['zf_dress'],['zf_expl'],['zf_cat','acc'],['zf_cat','beaute'],['zf_full'],['zf_chk'],['zf_tips']]){await W.evaluate(([x,c])=>{if(c)S.zfCat=c;S.hist=[];go(x)},[pg,cat]);await W.waitForTimeout(800);
   if(await W.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth))bad.push(pg)}
  ok(!bad.length,w+' px : aucun débordement horizontal'+(bad.length?' ('+bad.join(', ')+')':''));await W.close()}
 // ——— Données abîmées et effacement ———
 const D=await open(390,{nom:'X',lang:'fr',later:true},'{"prof":5,"looks":[null,{"sel":7,"ref":"x"}],"tasks":"oops","like":["zzz"],"tipSav":[1],"own":{}}');
 for(const pg of ['zf','zf_full','zf_chk','zf_tips','zf_dress']){await D.evaluate(x=>go(x),pg);await D.waitForTimeout(200)}
 ok(await D.evaluate(()=>S.page==='zf_dress'),'Données abîmées : rien ne bloque');
 await D.evaluate(()=>go('zf'));await click(D,'[data-zfwipe]');ok(await D.evaluate(()=>!localStorage.getItem('monstyle_zf')&&ZD.tasks===null&&!ZD.like.length),'Effacement complet des données Zifafi');
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.slice(0,5).join(' | '):''));
 await b.close();console.log(fails?fails+' échec(s)':'Tous les tests passent');process.exit(fails?1:0)})();
