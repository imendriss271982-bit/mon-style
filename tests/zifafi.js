// Tests ZIFAFI — My Wedding : accueil (2 univers), tableau de bord, profil en 6 étapes (enregistrer, relire, modifier,
// supprimer), moteur de recommandation (préférences → résultats), robes (enregistrer, comparer, refuser, autre option),
// couleurs, look complet (créer, modifier, dupliquer, comparer, favori, supprimer), inspiration (envoi d'image,
// format refusé, filtre, favori, suppression), académie (leçon terminée, liste d'entraînement), Aura (contexte mariée),
// langues (anglais, arabe RTL), largeurs 320 à 1280 px, données abîmées, effacement.
// Lancer : python3 -m http.server 8765, puis : node tests/zifafi.js
const {chromium}=require('playwright');const path=require('path');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const errs=[];
 const open=async(w,setup)=>{const p=await b.newPage({viewport:{width:w,height:820}});p.on('pageerror',e=>errs.push(w+': '+e.message));p.on('dialog',d=>d.accept());
  await p.goto(URL);await p.evaluate(setup||(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}))}));
  await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});return p};
 const st=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('monstyle_zf')||'null'));
 const click=async(p,sel)=>{await p.click(sel);await p.waitForTimeout(150)};
 // ——— Moteur (pur) ———
 const E=require(path.join(__dirname,'..','zifafi-methode.js'));
 ok(E.zfReco({}).state==='decouverte','Moteur : sans information → état découverte, pas de robe inventée');
 const r1=E.zfReco({volume:'ample',aesthetic:['royal']}),r2=E.zfReco({volume:'pres',aesthetic:['minimal'],movement:'essentiel'});
 ok(r1.state==='ok'&&r1.recos.length===3&&new Set(r1.recos.map(x=>x.sil)).size===3,'Moteur : 3 directions de silhouettes distinctes');
 ok(r1.recos[0].sil==='princesse'&&r2.recos[0].sil!=='princesse','Moteur : changer les préférences change la recommandation');
 ok(r1.recos.every(x=>x.why.length&&x.why.every(w=>typeof w==='string')),'Moteur : chaque proposition explique ses raisons');
 const cov=E.zfReco({silhouette:['trapeze'],volume:'modere',cover:['bras','decollete'],neckline:['v','coeur']});
 ok(cov.recos.every(x=>x.sleeve==='longues'&&!['v','coeur','epaules'].includes(x.neck)),'Moteur : couverture souhaitée respectée (manches, encolure)');
 const sh=E.zfScore({shape:'H'},'droite'),sh0=E.zfScore({},'droite');ok(sh.sc-sh0.sc<1,'Moteur : la catégorie de silhouette ne pèse que comme départage');
 ok(E.zfReco({volume:'ample',aesthetic:['royal']},{rej:[r1.recos[0].key]}).recos[0].key!==r1.recos[0].key,'Moteur : une proposition refusée disparaît');
 ok(!JSON.stringify(E.zfReco({volume:'ample',aesthetic:['royal']})).match(/QAR|€|\$|Pronovias|Vera Wang/),'Moteur : aucune marque ni prix');
 // ——— Accueil et navigation ———
 let p=await open(390);
 ok(await p.evaluate(()=>!!document.querySelector('.zf-uni [data-zfmystyle]')&&!!document.querySelector('.zf-uni [data-go="zf"]')),'Accueil : cartes MY STYLE et ZIFAFI');
 await click(p,'[data-zfmystyle]');ok(await p.evaluate(()=>S.page==='home'),'« Explorer My Style » garde l’expérience existante');
 await click(p,'.zf-uni [data-go="zf"]');ok(await p.evaluate(()=>S.page==='zf'&&!!document.querySelector('.zf-start [data-zfprof]')),'ZIFAFI : tableau de bord, invitation au profil');
 ok(await p.evaluate(()=>!/%/.test(document.querySelector('.zf-mods').innerText)&&/Rien pour l’instant/.test(document.body.innerText)),'Tableau de bord : aucun pourcentage inventé');
 ok(await p.evaluate(()=>document.querySelector('#dock [data-go="home"]').getAttribute('aria-current')==='page'),'Barre du bas : Accueil reste allumé');
 for(const m of ['zf_prof','zf_robe','zf_col','zf_look','zf_insp','zf_acad','zf_looks']){await p.evaluate(m=>{go('zf');document.querySelector(`.zf-mods [data-go="${m}"]`).click()},m);await p.waitForTimeout(120);ok(await p.evaluate(m=>S.page===m,m),'Module '+m+' s’ouvre')}
 await p.evaluate(()=>go('zf'));await click(p,'[data-zfhome]');ok(await p.evaluate(()=>S.page==='home'),'Retour à My Style');
 // ——— Profil ———
 await p.evaluate(()=>go('zf'));await click(p,'.zf-start [data-zfprof]');
 ok(await p.evaluate(()=>S.page==='zf_prof'&&/Étape 1 sur 6/.test(document.body.innerText)&&!!document.querySelector('[role=progressbar]')),'Profil : étape 1 sur 6 avec progression');
 await p.fill('#zf_date','2027-05-20');await click(p,'[data-zfk="setting"] [data-zfv="salle"]');await click(p,'[data-zfk="aesthetic"] [data-zfv="classique"]');await click(p,'[data-zfk="aesthetic"] [data-zfv="modeste"]');
 ok(await p.evaluate(()=>S.zfDraft.aesthetic.length===2),'Choix multiples (styles)');
 await click(p,'[data-zfstep="1"]');
 await click(p,'[data-zfk="silhouette"] [data-zfv="trapeze"]');await click(p,'[data-zfk="silhouette"] [data-zfv="nsp"]');ok(await p.evaluate(()=>S.zfDraft.silhouette.join()==='nsp'),'« Je ne sais pas » remplace les autres choix');
 await click(p,'[data-zfk="silhouette"] [data-zfv="trapeze"]');ok(await p.evaluate(()=>S.zfDraft.silhouette.join()==='trapeze'),'Un vrai choix retire « Je ne sais pas »');
 await click(p,'[data-zfk="movement"] [data-zfv="essentiel"]');await click(p,'[data-zfk="neckline"] [data-zfv="bateau"]');
 ok(await p.evaluate(()=>!!document.querySelector('.zf-gl summary')),'Glossaire des termes de mode');
 await click(p,'[data-zfstep="2"]');await click(p,'[data-zfk="cover"] [data-zfv="bras"]');await click(p,'[data-zfk="volume"] [data-zfv="modere"]');
 ok(await p.evaluate(()=>!/défaut|corriger|cacher/i.test(document.querySelector('#page').innerText)),'Langage respectueux (rien à « corriger »)');
 await click(p,'[data-zfstep="3"]');ok(await p.evaluate(()=>/facultative/.test(document.body.innerText)&&!document.querySelector('#page input[type=file]')),'Étape silhouette facultative, sans photo ni mesure');
 await click(p,'[data-zfskip]');ok(await p.evaluate(()=>S.zfStep===4),'Étape silhouette : passer');
 await click(p,'[data-zfk="whites"] [data-zfv="ivoire"]');await click(p,'[data-zfk="metal"] [data-zfv="or"]');await p.fill('#zt_eviter','orange');
 await click(p,'[data-zfstep="5"]');ok(await p.evaluate(()=>/Relecture/.test(document.body.innerText)&&/Ivoire/.test(document.body.innerText)&&/orange/.test(document.body.innerText)),'Relecture : résumé des réponses');
 await click(p,'.zf-rv [data-zfstep="0"]');ok(await p.evaluate(()=>S.zfStep===0&&document.querySelector('#zf_date').value==='2027-05-20'),'Relecture → modifier une étape (réponses gardées)');
 for(const n of [1,2,3,4,5])await click(p,`#foot [data-zfstep="${n}"]`);await click(p,'[data-zfsaveprof]');
 let z=await st(p);ok(z&&z.prof&&z.prof.date==='2027-05-20'&&z.prof.silhouette[0]==='trapeze'&&z.prof.eviter==='orange'&&!z.prof.shape,'Profil enregistré (localStorage), rien d’inventé');
 ok(await p.evaluate(()=>S.page==='zf_robe'&&document.querySelectorAll('.zf-reco').length===3),'Après l’enregistrement : 3 directions de robe');
 await p.reload();await p.waitForTimeout(800);ok(await p.evaluate(()=>ZD.prof&&ZD.prof.date==='2027-05-20'),'Profil restauré après rechargement');
 await p.evaluate(()=>{document.getElementById('splash')?.remove();go('zf')});ok(await p.evaluate(()=>/Plus que \d+ jours/.test(document.body.innerText)&&!!document.querySelector('.zf-next')),'Tableau de bord personnalisé (compte à rebours réel, direction)');
 // ——— Robes ———
 await p.evaluate(()=>{S.zfShow=false;go('zf_robe')});await click(p,'[data-zfshow]');ok(await p.evaluate(()=>document.querySelectorAll('.zf-reco').length===3),'« Découvrir mon style de mariée » produit les recommandations');
 ok(await p.evaluate(()=>[...document.querySelectorAll('.zf-reco')].every(c=>c.querySelector('svg.zf-dress')&&/Illustration schématique/.test(c.innerText)&&c.querySelectorAll('.zf-dr').length>=7&&c.querySelector('.zf-why li'))),'Chaque robe : illustration étiquetée, 7+ détails, raisons');
 const k0=await p.evaluate(()=>document.querySelector('.zf-reco').dataset.key);
 await click(p,`[data-zfsave="${k0}"]`);z=await st(p);ok(z.saved.length===1&&z.saved[0].key===k0,'Enregistrer une robe');
 const keys=await p.evaluate(()=>[...document.querySelectorAll('.zf-reco')].slice(0,3).map(c=>c.dataset.key));
 await click(p,`[data-zfcmp="${keys[1]}"]`);await click(p,`[data-zfcmp="${keys[2]}"]`);await click(p,'[data-zfgocmp]');
 ok(await p.evaluate(()=>S.page==='zf_cmp'&&document.querySelectorAll('.zf-cmp svg').length===2&&document.querySelectorAll('.zf-tbl tr').length>=18),'Comparer deux robes');
 await p.evaluate(()=>back());
 const d2=await p.evaluate(()=>document.querySelectorAll('.zf-reco')[1].dataset.key);await click(p,`[data-zfrej="${d2}"]`);
 ok(await p.evaluate(k=>![...document.querySelectorAll('.zf-reco')].slice(0,3).some(c=>c.dataset.key===k)&&ZD.rej.includes(k),d2),'« Pas pour moi » écarte la proposition');
 const d3=await p.evaluate(()=>document.querySelectorAll('.zf-reco')[2].dataset.key),dir3=d3.split(':')[0];await click(p,`[data-zfalt="${dir3}"]`);
 ok(await p.evaluate(k=>document.querySelectorAll('.zf-reco')[2].dataset.key!==k,d3),'« Une autre option » propose autre chose');
 await click(p,'[data-zfunrej]');ok(await p.evaluate(()=>ZD.rej.length===0),'Revoir les propositions écartées');
 // ——— Couleurs ———
 await p.evaluate(()=>go('zf_col'));ok(await p.evaluate(()=>document.querySelectorAll('.zf-pal').length===6&&/Proche de tes choix/.test(document.body.innerText)),'Couleurs : 6 harmonies, liens expliqués avec ses choix');
 await click(p,'[data-zfpal="p1"]');z=await st(p);ok(z.pal.includes('p1'),'Enregistrer une palette');
 // ——— Look ———
 await p.evaluate(()=>{S.zfLook=null;go('zf_look')});ok(await p.evaluate(()=>/À décider/.test(document.querySelector('.zf-sum').innerText)),'Look : non choisi = « À décider »');
 await click(p,'[data-zflk="bijoux"][data-zfv="boucles"]');ok(await p.evaluate(()=>/encolure bateau/i.test(document.body.innerText)),'Look : conseil bijoux lié à l’encolure de la robe');
 await click(p,'[data-zflk="chaussures"][data-zfv="plates"]');await p.fill('#zf_lkname','Look cérémonie');await click(p,'[data-zflksave]');
 z=await st(p);ok(z.looks.length===1&&z.looks[0].nom==='Look cérémonie'&&z.looks[0].sel.bijoux==='boucles'&&z.looks[0].dress&&z.looks[0].pal==='p1','Look complet enregistré (robe, palette, choix)');
 ok(await p.evaluate(()=>S.page==='zf_looks'),'Après l’enregistrement : Mes looks');
 const id0=z.looks[0].id;await click(p,`[data-zflkedit="${id0}"]`);await click(p,'[data-zflk="voile"][data-zfv="chapelle"]');await click(p,'[data-zflksave]');
 z=await st(p);ok(z.looks.length===1&&z.looks[0].sel.voile==='chapelle','Modifier un look');
 await click(p,`[data-zflkdup="${id0}"]`);z=await st(p);ok(z.looks.length===2&&/\(copie\)/.test(z.looks[0].nom),'Dupliquer un look');
 await click(p,`[data-zflkfav="${id0}"]`);z=await st(p);ok(z.looks.find(l=>l.id===id0).fav,'Marquer un look favori');
 await click(p,`[data-zflksel="${z.looks[0].id}"]`);await click(p,`[data-zflksel="${z.looks[1].id}"]`);ok(await p.evaluate(()=>document.querySelectorAll('.zf-cmp2 > div').length===2),'Comparer deux looks');
 await click(p,`[data-zflkdel="${z.looks.find(l=>l.id!==id0).id}"]`);z=await st(p);ok(z.looks.length===1,'Supprimer un look (après confirmation)');
 // ——— Inspiration ———
 await p.evaluate(()=>go('zf_insp'));await p.waitForTimeout(400);
 await p.evaluate(()=>{document.querySelector('.zf-add').open=true});await click(p,'[data-zfinscat="voiles"]');await p.fill('#zf_it','Voile long');
 await p.setInputFiles('[data-zfinsfile]',path.join(__dirname,'..','icon-192.png'));await p.waitForTimeout(900);
 ok(await p.evaluate(()=>ZINS.length===1&&ZINS[0].cat==='voiles'&&ZINS[0].titre==='Voile long'&&document.querySelectorAll('.zf-ins img').length===1),'Inspiration : image ajoutée (catégorie, titre)');
 await p.setInputFiles('[data-zfinsfile]',{name:'x.txt',mimeType:'text/plain',buffer:Buffer.from('bonjour')});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>ZINS.length===1&&/format/.test(document.getElementById('toast').textContent)),'Inspiration : format refusé avec un message clair');
 await click(p,'[data-zfinsf="robes"]');ok(await p.evaluate(()=>document.querySelectorAll('.zf-ins').length===0),'Filtrer par catégorie');
 await click(p,'[data-zfinsf=""]');await click(p,'[data-zfinsfv]');await p.waitForTimeout(200);ok(await p.evaluate(()=>ZINS[0].fav),'Inspiration favorite');
 await p.reload();await p.waitForTimeout(800);await p.evaluate(()=>{document.getElementById('splash')?.remove();go('zf_insp')});await p.waitForTimeout(500);
 ok(await p.evaluate(()=>ZINS.length===1&&ZINS[0].fav&&ZD.insN===1),'Inspiration conservée après rechargement (IndexedDB)');
 await click(p,'[data-zfinsdel]');await p.waitForTimeout(300);ok(await p.evaluate(()=>ZINS.length===0),'Supprimer une inspiration');
 // ——— Académie ———
 await p.evaluate(()=>go('zf_acad'));ok(await p.evaluate(()=>document.querySelectorAll('[data-zfles]').length===9),'Académie : 9 leçons');
 await click(p,'[data-zfles="marcher"]');ok(await p.evaluate(()=>document.querySelectorAll('.zf-steps li svg.zf-fig').length>=4&&document.querySelectorAll('.zf-ul li').length>=3),'Leçon : schémas étape par étape, conseils, difficultés');
 await click(p,'[data-zflesdone="marcher"]');z=await st(p);ok(z.les.marcher===1,'Marquer une leçon terminée');
 await click(p,'#foot [data-zfles]');ok(await p.evaluate(()=>S.zfLes==='asseoir'),'Leçon suivante');
 await p.evaluate(()=>{S.zfLes='pratique';go('zf_les')});await click(p,'[data-zfprac="voile"]');z=await st(p);ok(z.prac.voile===1&&await p.evaluate(()=>/1 \/ 7/.test(document.body.innerText)),'Liste d’entraînement cochée pour de vrai');
 await p.evaluate(()=>go('zf'));ok(await p.evaluate(()=>/1 \/ 9 leçons terminées/.test(document.body.innerText)),'Tableau de bord : progression réelle des leçons');
 // ——— Aura ———
 await click(p,'[data-zfaura]');ok(await p.evaluate(()=>S.page==='chat'&&S.zfCtx==='mariee'&&document.querySelector('[data-zfctx="mariee"]').getAttribute('aria-pressed')==='true'),'Aura en mode « Stylisme mariée »');
 ok(await p.evaluate(()=>/MODE AURA — STYLISME MARIÉE/.test(PROFIL())&&/date du mariage 2027-05-20/.test(PROFIL())&&/n’invente ni marque/.test(PROFIL())),'PROFIL() envoie le profil mariée et les règles d’honnêteté');
 await click(p,'[data-zfctx="quotidien"]');ok(await p.evaluate(()=>!/STYLISME MARIÉE/.test(PROFIL())&&!document.querySelector('.ch-sug [data-go="zf"]')),'Retour à Aura quotidien : contexte mariée retiré');
 await p.evaluate(()=>{go('zf');window.__sent=[];window.send=t=>__sent.push(t)});await p.evaluate(()=>go('zf_col'));await click(p,'[data-zfask]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>S.page==='chat'&&S.zfCtx==='mariee'&&__sent.length===1),'« Demander à Aura » envoie la question en mode mariée');
 await p.evaluate(()=>home());ok(await p.evaluate(()=>S.zfCtx==='quotidien'),'Accueil My Style : Aura revient au quotidien');
 // ——— Langues ———
 await p.evaluate(()=>{S.lang='en';save();i18nApply();go('zf')});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/Your journey/.test(document.body.innerText)&&/Find my wedding dress/.test(document.body.innerText)),'Anglais : tableau de bord traduit');
 await p.evaluate(()=>{S.zfShow=true;go('zf_robe')});await p.waitForTimeout(300);ok(await p.evaluate(()=>/Why it may suit/.test(document.body.innerText)&&!/Pourquoi elle/.test(document.body.innerText)),'Anglais : recommandations traduites');
 await p.evaluate(()=>{S.lang='ar';save();i18nApply();go('zf_acad')});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.documentElement.dir==='rtl'&&/أكاديمية الأناقة/.test(document.body.innerText)),'Arabe : RTL et académie traduite');
 await p.evaluate(()=>{S.lang='fr';save();i18nApply();home()});
 // ——— Effacement ———
 await p.evaluate(()=>go('zf'));await click(p,'[data-zfwipe]');z=await st(p);ok(z===null||(!z.prof&&!z.looks.length&&!z.saved.length),'Effacer toutes les données ZIFAFI');
 await p.close();
 // ——— Données abîmées ———
 p=await open(390,()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'T',lang:'fr',later:true}));localStorage.setItem('monstyle_zf','{"prof":{"silhouette":"oops","volume":42,"date":"hier"},"looks":[null,{"nom":5}],"saved":[{"sil":"inconnue"}],"les":"x","pal":["zz"]}')});
 await p.evaluate(()=>go('zf'));ok(await p.evaluate(()=>S.page==='zf'&&ZD.prof.silhouette.length===0&&ZD.prof.date===''&&ZD.saved.length===0&&ZD.pal.length===0),'Données abîmées nettoyées sans planter');
 await p.close();
 // ——— Largeurs ———
 for(const w of [320,360,390,430,768,1280]){p=await open(w,()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'T',lang:'fr',later:true}));localStorage.setItem('monstyle_zf',JSON.stringify({prof:{silhouette:['trapeze'],volume:'modere',aesthetic:['romantique'],date:'2027-01-01'},saved:[],pal:['p1'],looks:[{id:'a',nom:'Un nom de look assez long pour tester',sel:{}},{id:'b',nom:'B',sel:{}}]}))});const bad=[];
  for(const pg of ['home','zf','zf_prof','zf_robe','zf_col','zf_look','zf_insp','zf_acad','zf_les','zf_looks','chat']){await p.evaluate(x=>{S.hist=[];S.zfShow=true;S.zfLkSel=['a','b'];S.zfLes='photos';go(x)},pg);await p.waitForTimeout(700);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth,small:[...document.querySelectorAll('#page button,#foot button')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height<40&&!e.closest('.ch-sug,.fchips,.hz-cats')}).length}));
   if(r.sw>r.W)bad.push(pg+' déborde ('+r.sw+'>'+r.W+')');if(r.small&&pg.startsWith('zf'))bad.push(pg+' : '+r.small+' bouton(s) < 40 px')}
  for(let s=0;s<6;s++){await p.evaluate(s=>{S.zfDraft=null;S.zfStep=s;go('zf_prof');render(false)},s);await p.waitForTimeout(700);const sw=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);if(sw)bad.push('profil étape '+(s+1)+' déborde')}
  await p.evaluate(()=>{S.lang='ar';save();i18nApply();go("zf_robe")});await p.waitForTimeout(700);if(await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth))bad.push('arabe déborde');
  ok(!bad.length,w+' px : pas de débordement, cibles tactiles correctes'+(bad.length?' — '+bad.join(', '):''));await p.close()}
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 console.log(fails?fails+' échec(s)':'Tous les tests passent');await b.close();process.exit(fails?1:0)})();
