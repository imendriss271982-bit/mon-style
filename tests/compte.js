// Tests « Mon compte » (v181), de bout en bout : deux téléphones, le VRAI code du Worker sur une base SQLite
// qui imite D1, email (Brevo) simulé. Téléphone A crée son compte et sauvegarde ; téléphone B se connecte avec
// le même email et récupère profil, garde-robe et photo ; « Effacer toutes mes données » efface aussi le cloud.
// Lancer : python3 -m http.server 8765, puis : node tests/compte.js
const {chromium}=require('playwright');const path=require('path');
const {DatabaseSync}=require('node:sqlite');
const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
const piece='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGP4/58BAyQ+GoP9/z8zMDAwAAAvsAPj1vDGRwAAAABJRU5ErkJggg==';
(async()=>{
 const W=(await import(require('url').pathToFileURL(path.join(__dirname,'../worker/worker.js')).href)).default;
 const db=new DatabaseSync(':memory:');
 const D1={prepare(sql){const st={args:[],bind(...a){st.args=a;return st},async first(){return db.prepare(sql).get(...st.args)||null},async all(){return {results:db.prepare(sql).all(...st.args)}},
   async run(){const s=db.prepare(sql);if(/RETURNING/i.test(sql))return {results:s.all(...st.args)};const r=s.run(...st.args);return {meta:{changes:r.changes}}}};return st},
   async batch(l){const o=[];for(const s of l)o.push(await s.run());return o}};
 const MAILS=[];const realFetch=globalThis.fetch;
 globalThis.fetch=async(u,o)=>{if(String(u).includes('api.brevo.com')){MAILS.push(JSON.parse(o.body));return new Response('{}',{status:201})}return realFetch(u,o)};
 const env={MAJLIS:D1,GEMINI_KEY:'g',BREVO_KEY:'b'};let ip=0;
 const route=async r=>{const q=r.request();if(q.method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST'}});
  const res=await W.fetch(new Request(q.url(),{method:'POST',headers:{Origin:'https://imendriss271982-bit.github.io','Content-Type':'application/json','CF-Connecting-IP':'10.5.'+(++ip%200)+'.1'},body:q.postData()}),env);
  r.fulfill({status:res.status,headers:{'Access-Control-Allow-Origin':'*','Content-Type':res.headers.get('Content-Type')||'application/json'},body:Buffer.from(await res.arrayBuffer())})};
 const code=()=>(MAILS.at(-1).htmlContent.match(/>(\d{6})</)||[])[1];
 const b=await chromium.launch();
 const tel=async(lang,init,w=390)=>{const ctx=await b.newContext({viewport:{width:w,height:844}});await ctx.route('https://mon-style.imendriss271982.workers.dev/**',route);
  await ctx.route('https://cdn.jsdelivr.net/**',r=>r.abort());await ctx.route('https://esm.sh/**',r=>r.abort());
  await ctx.addInitScript(()=>{window.CP_TEST=1});
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(URL);await p.evaluate(([lang,init])=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Sara',lang,later:true,pays:'QA',...(init||{})}))},[lang,init]);
  await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});return p};
 const ouvrirProfil=async p=>{await p.evaluate(()=>{S.hist=[];go('profil')});await p.waitForTimeout(250)};

 // ——— Téléphone A : une cliente avec son analyse et sa garde-robe ———
 const A=await tel('fr',{res:{visage:{forme:'ovale'},corps:{forme:'X · Sablier',kibbe:'Soft Classic'}},info:{email:'sara@example.com',taille:165}});
 await A.evaluate(async p=>{GR.items=[{id:'it1',cat:'haut',nom:'Chemise blanche',couleur:'Blanc',img:p},{id:'it2',cat:'bas',nom:'Pantalon noir',couleur:'Noir',img:p}];grSave();for(const x of GR.items)await grKeep(x)},piece);
 await ouvrirProfil(A);
 ok(await A.$('.cp-card')!==null&&/Sauvegarde ton style/.test(await A.textContent('.cp-card')),'Profil : carte « Sauvegarde ton style »');
 ok(await A.inputValue('#cpEmail')==='sara@example.com','Email du profil déjà rempli');
 await A.click('[data-cp="envoyer"]');await A.waitForSelector('#cpCode');
 ok(MAILS.length===1&&MAILS[0].to[0].email==='sara@example.com','Code envoyé par email');
 await A.fill('#cpCode','000001'===code()?'000002':'000001');await A.click('[data-cp="verif"]');await A.waitForSelector('.cp-err');
 ok(/pas le bon/.test(await A.textContent('.cp-err')),'Mauvais code : message clair');
 await A.fill('#cpCode',code());await A.click('[data-cp="verif"]');await A.waitForSelector('.cp-card.on');
 await A.evaluate(()=>cpPush());await A.waitForTimeout(400);
 ok(/Connectée/.test(await A.textContent('.cp-card.on')),'Compte créé : « Ton style est sauvegardé », connectée');
 const n=db.prepare("SELECT COUNT(*) AS n FROM ms_users").get().n,keys=db.prepare("SELECT k FROM ms_data").all().map(x=>x.k),ph=db.prepare("SELECT pid FROM ms_photo ORDER BY pid").all().map(x=>x.pid);
 ok(n===1&&keys.includes('monstyle')&&keys.includes('monstyle_gr')&&ph.join()==='it1,it2','Sauvegardé dans le cloud : profil, garde-robe, 2 photos');
 // Changement sur A → seul ce qui change repart
 await A.evaluate(()=>{S.nom='Sara M';save()});await A.evaluate(()=>cpPush());await A.waitForTimeout(300);
 ok(JSON.parse(db.prepare("SELECT v FROM ms_data WHERE k='monstyle'").get().v).nom==='Sara M','Un changement est sauvegardé');

 // ——— Téléphone B (vide) : même email → récupération ———
 const B=await tel('ar',{});
 await B.evaluate(()=>{S.res={};save()});
 await ouvrirProfil(B);
 const rtl=await B.evaluate(()=>document.documentElement.dir);
 ok(rtl==='rtl'&&/احفظي ستايلچ/.test(await B.textContent('.cp-card')),'Téléphone en arabe : carte traduite, droite à gauche');
 await B.fill('#cpEmail','sara@example.com');await B.click('[data-cp="envoyer"]');await B.waitForSelector('#cpCode');
 ok(/كود/.test(MAILS.at(-1).subject),'Email du code en arabe');
 await B.fill('#cpCode',code());
 await Promise.all([B.waitForNavigation({timeout:15000}).catch(()=>null),B.click('[data-cp="verif"]')]);
 await B.waitForTimeout(1500);
 const got=await B.evaluate(()=>({nom:S.nom,visage:S.res&&S.res.visage&&S.res.visage.forme,n:GR.items.length,img:!!(GR.items[0]&&GR.items[0].img),tok:!!CP.tok}));
 ok(got.nom==='Sara M'&&got.visage==='ovale'&&got.n===2&&got.img&&got.tok,'Nouveau téléphone : profil, analyse, garde-robe et photos récupérés');

 // ——— Téléphone C (déjà un style) : choix ———
 const C=await tel('fr',{res:{visage:{forme:'rond'}}});
 await ouvrirProfil(C);await C.fill('#cpEmail','sara@example.com');await C.click('[data-cp="envoyer"]');await C.waitForSelector('#cpCode');
 await C.fill('#cpCode',code());await C.click('[data-cp="verif"]');await C.waitForSelector('[data-cp="recup"]');
 ok(true,'Téléphone qui a déjà un style : on lui demande lequel garder');
 await C.evaluate(()=>cpPush());await C.waitForTimeout(300);
 ok(JSON.parse(db.prepare("SELECT v FROM ms_data WHERE k='monstyle'").get().v).nom==='Sara M','Pendant le choix, rien n\'écrase le compte');
 await Promise.all([C.waitForNavigation({timeout:15000}).catch(()=>null),C.click('[data-cp="recup"]')]);await C.waitForTimeout(1200);
 ok(await C.evaluate(()=>S.res.visage.forme)==='ovale','« Récupérer celui de mon compte » : le style du compte remplace celui du téléphone');

 // ——— Largeur 320 px ———
 const D=await tel('fr',{},320);await ouvrirProfil(D);await D.waitForTimeout(900);
 const dw=await D.evaluate(()=>[document.documentElement.scrollWidth,innerWidth,[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,4).map(e=>e.tagName+'.'+e.className)]);
 ok(dw[0]<=dw[1],'320 px : la carte ne déborde pas'+(dw[0]>dw[1]?' — '+JSON.stringify(dw):''));

 // ——— Mesure d'usage ———
 await A.evaluate(()=>{cpEv('open');go('garde');go('profil');cpEvFlush()});await A.waitForTimeout(400);
 const ev=db.prepare("SELECT e FROM ms_ev").all().map(x=>x.e);
 ok(ev.includes('open')&&ev.includes('p:garde')&&db.prepare("SELECT COUNT(*) AS n FROM ms_act").get().n>=1,'Mesure d\'usage : ouverture et écrans comptés');

 // ——— Effacer toutes mes données (sur B) ———
 await B.evaluate(()=>{document.getElementById('splash')?.remove();S.hist=[];go('profil')});await B.waitForTimeout(200);
 await B.click('[data-wipe]');await B.waitForTimeout(800);
 ok(db.prepare("SELECT COUNT(*) AS n FROM ms_users").get().n===0&&db.prepare("SELECT COUNT(*) AS n FROM ms_photo").get().n===0,'« Effacer toutes mes données » : compte et copie dans le cloud supprimés');
 ok(await B.evaluate(()=>!localStorage.getItem('monstyle_compte')),'… et la session est oubliée sur le téléphone');

 for(const [n,p] of [['A',A],['B',B],['C',C],['D',D]])ok(!p.errs.length,'Téléphone '+n+' : aucune erreur JavaScript'+(p.errs.length?' — '+p.errs.join(' | '):''));
 await b.close();console.log(fails?fails+' échec(s)':'Tout est bon');process.exit(fails?1:0)})();
