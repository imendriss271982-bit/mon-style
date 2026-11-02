// Tests « Vérifié par une vraie styliste » (v143) de bout en bout : la cliente envoie une demande depuis l'app,
// la styliste répond depuis styliste.html, la cliente reçoit la réponse (carte de l'accueil, texte, vocal).
// Le VRAI code du Worker tourne dans le test, avec un KV simulé. Lancer : python3 -m http.server 8765, puis : node tests/verif.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGP4/58BAyQ+GoP9/z8zMDAwAAAvsAPj1vDGRwAAAABJRU5ErkJggg==','base64');
const img=path.join(os.tmpdir(),'ms-verif.png');fs.writeFileSync(img,png);
(async()=>{
 const W=(await import('data:text/javascript;base64,'+fs.readFileSync(path.join(__dirname,'../worker/worker.js')).toString('base64'))).default;
 const store=new Map(),KV={async put(k,v,o={}){store.set(k,{v,meta:o.metadata||null})},async get(k,t){const e=store.get(k);return e?(t==='json'?JSON.parse(e.v):e.v):null},async delete(k){store.delete(k)},async list({prefix}){return {keys:[...store.keys()].filter(k=>k.startsWith(prefix)).map(name=>({name,metadata:store.get(name).meta})),list_complete:true}}};
 const CODE='TEST-STYLISTE-01',env={VERIF:KV,STYLISTE_HASH:crypto.createHash('sha256').update(CODE).digest('hex')};let ip=0;
 const route=async r=>{const q=r.request();if(q.method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST'}});
  const res=await W.fetch(new Request(q.url(),{method:'POST',headers:{Origin:'https://imendriss271982-bit.github.io','Content-Type':'application/json','CF-Connecting-IP':'10.1.0.'+(++ip)},body:q.postData()}),env);
  r.fulfill({status:res.status,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:await res.text()})};
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('https://mon-style.imendriss271982.workers.dev/verif/**',route);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 const boot=async()=>{await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(200)};
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Sara',lang:'fr',later:true,pays:'QA',res:{corps:{forme:'Sablier',kibbe:'Soft Classic'}}}))});
 await boot();
 // ——— Entrées ———
 await p.evaluate(()=>go('profil'));await p.waitForTimeout(300);
 ok(await p.$('.vf-tile[data-view="verif"]'),'Profil : tuile « Vérifié par une vraie styliste »');
 await p.evaluate(()=>go('twin'));await p.waitForTimeout(300);
 ok(await p.$('.vf-twin [data-view="verif"]'),'Style Twin : tuile « Vérifié par une vraie styliste »');
 // ——— Envoi ———
 await p.evaluate(()=>go('verif'));await p.waitForTimeout(300);
 ok(await p.$('[data-vfsend]')&&await p.$('#vf_q'),'Première fois : formulaire affiché');
 await p.click('[data-vfsend]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>VF.length===0),'Demande vide : rien n’est envoyé');
 await p.click('[data-vfq="couleurs"]');await p.click('[data-vfq="tenue"]');await p.click('[data-vfq="tenue"]');await p.click('[data-vfq="visage"]');
 await p.fill('#vf_q','Est-ce que le corail me va vraiment ?');
 await p.setInputFiles('[data-vfphoto]',img);await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.getElementById('vf_q').value==='Est-ce que le corail me va vraiment ?'&&VF_FORM.quoi.join()==='couleurs,visage'&&!!document.querySelector('.vf-photo img')),'Choix, question et photo gardés (la question n’est pas effacée par la photo)');
 await p.click('[data-vfsend]');await p.waitForTimeout(800);
 const d=await p.evaluate(()=>VF[0]);
 ok(d&&d.statut==='attente'&&/^[0-9a-f]{16}$/.test(d.id),'Demande envoyée et gardée sur le téléphone');
 const doc=JSON.parse(store.get('d:'+d.id).v);
 ok(doc.nom==='Sara'&&doc.pays==='QA'&&/Sablier/.test(doc.profil)&&doc.photo.startsWith('data:image/jpeg')&&doc.question==='Est-ce que le corail me va vraiment ?','Le serveur reçoit prénom, pays, résultats, question et photo');
 ok(await p.evaluate(()=>/En attente/.test(document.querySelector('.vf-row').textContent)&&!!document.querySelector('[data-vfnew]')),'Liste : « En attente », bouton « Nouvelle demande »');
 // ——— La styliste répond ———
 const a=await ctx.newPage();a.on('pageerror',e=>errs.push('styliste: '+e.message));
 await a.goto(URL+'styliste.html');await a.waitForTimeout(300);
 await a.fill('#code','FAUX-CODE');await a.click('#go');await a.waitForTimeout(400);
 ok(await a.evaluate(()=>/Code incorrect/.test(document.body.innerText)&&!!document.getElementById('code')),'Espace styliste : mauvais code refusé');
 await a.fill('#code',CODE.toLowerCase());await a.click('#go');await a.waitForTimeout(500);
 ok(await a.evaluate(()=>/1 demande en attente/.test(document.body.innerText)&&/Sara/.test(document.querySelector('.item').textContent)),'Espace styliste : la demande de Sara est en attente');
 await a.click('.item');await a.waitForTimeout(400);
 ok(await a.evaluate(()=>/corail me va vraiment/.test(document.body.innerText)&&/Sablier/.test(document.querySelector('.profil').textContent)&&!!document.querySelector('.photo')&&/Couleurs/.test(document.body.innerText)),'La styliste voit la question, les résultats, la photo et ce qui est coché');
 await a.click('#send');await a.waitForTimeout(200);
 ok(await a.evaluate(()=>/Écris ou enregistre ta réponse/.test(document.body.innerText)),'Réponse vide : message clair');
 await a.fill('#rep','Oui ! Le corail illumine ton teint. Porte-le près du visage.');
 await a.evaluate(()=>{st.audio='data:audio/mp4;base64,AAAAHGZ0eXBNNEEg';draw()});
 ok(await a.evaluate(()=>document.getElementById('rep').value.startsWith('Oui !')&&!!document.querySelector('.rec audio')),'Le texte reste quand on ajoute le vocal');
 await a.click('#send');await a.waitForTimeout(600);
 ok(await a.evaluate(()=>/Réponse envoyée/.test(document.body.innerText)),'Réponse envoyée');
 await a.click('#bk');await a.waitForTimeout(200);
 ok(await a.evaluate(()=>/Aucune demande en attente/.test(document.body.innerText)),'Plus rien en attente');
 // ——— La cliente reçoit la réponse ———
 await boot();await p.evaluate(()=>{vfDernier=0;return vfMaj(true)});await p.waitForTimeout(500);
 ok(await p.$('.vf-home'),'Accueil : carte « Ta styliste t’a répondu »');
 await p.click('.vf-home');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>S.page==='verif_rep'&&/Le corail illumine ton teint/.test(document.body.innerText)&&!!document.querySelector('.vf-bulle.elle audio')),'La cliente lit la réponse et peut écouter le vocal');
 ok(await p.evaluate(()=>VF[0].vu===1&&VF[0].rep.vocal===true&&!JSON.stringify(JSON.parse(localStorage.getItem('monstyle_verif'))).includes('data:audio')),'Réponse marquée lue ; le vocal n’est pas copié sur le téléphone');
 await p.evaluate(()=>home());await p.waitForTimeout(300);
 ok(!(await p.$('.vf-home')),'Carte de l’accueil retirée une fois la réponse lue');
 // « Effacer toutes mes données » : supprimée du téléphone et du serveur
 const id0=await p.evaluate(()=>VF[0].id);
 await p.evaluate(()=>{vfWipe()});await p.waitForTimeout(400);
 ok(!store.has('d:'+id0)&&await p.evaluate(()=>VF.length===0&&!localStorage.getItem('monstyle_verif')),'Effacer mes données : demande supprimée du téléphone et du serveur');
 await p.evaluate(x=>{VF=[x];vfSave()},await p.evaluate(()=>null)||{id:id0,token:'0'.repeat(32),cree:Date.now(),quoi:[],question:'',statut:'attente',rep:null,vu:0});
 // Demande expirée sur le serveur → retirée
 store.clear();await p.evaluate(()=>{VF[0].statut='attente';vfDernier=0;return vfMaj(true)});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>VF.length===0),'Demande effacée du serveur (60 jours) : retirée de l’app');
 // Données abîmées
 await p.evaluate(()=>localStorage.setItem('monstyle_verif','{oops'));await boot();ok(await p.evaluate(()=>Array.isArray(VF)&&VF.length===0),'Données abîmées ignorées');
 // Serveur indisponible
 await ctx.unroute('https://mon-style.imendriss271982.workers.dev/verif/**');await ctx.route('https://mon-style.imendriss271982.workers.dev/verif/**',r=>r.fulfill({status:503,headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({erreur:"Le service de la styliste n'est pas encore activé."})}));
 await p.evaluate(()=>go('verif'));await p.waitForTimeout(200);await p.click('[data-vfq="visage"]');await p.click('[data-vfsend]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/pas encore activé/.test(document.querySelector('.note')?.textContent||'')&&VF.length===0),'Serveur indisponible : message clair');
 // Langues
 for(const [lang,t] of [['en','Checked by a real stylist'],['ar','مراجعة من ستايلست حقيقية']]){await p.evaluate(l=>{S.lang=l;S.vfErr='';go('verif')},lang);await p.waitForTimeout(300);
  const h=await p.evaluate(()=>document.querySelector('h1').textContent);const fr=await p.evaluate(()=>/Que veux-tu|Ta question|Envoyer à ma/.test(document.body.innerText));
  ok(h===t&&!fr,'Traduit ('+lang+') : '+h)}
 // Largeurs
 await p.evaluate(()=>{S.lang='fr';save();VF=[{id:'0123456789abcdef',token:'0123456789abcdef0123456789abcdef',cree:Date.now(),quoi:['visage','couleurs','tenue'],question:'Une très longue question pour vérifier que rien ne déborde sur un petit téléphone même avec beaucoup de texte',statut:'repondu',rep:{texte:'Réponse longue '.repeat(20),quand:Date.now(),vocal:false},vu:1}];S.vid=VF[0].id});
 for(const w of [320,360,390,768,1280]){await p.setViewportSize({width:w,height:800});await a.setViewportSize({width:w,height:800});const bad=[];
  for(const pg of ['verif','verif_rep']){await p.evaluate(x=>{S.hist=[];go(x)},pg);await p.waitForTimeout(700);
   const r=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}));if(r.sw>r.W)bad.push(pg+' déborde')}
  const r2=await a.evaluate(()=>({sw:document.documentElement.scrollWidth,W:document.documentElement.clientWidth}));if(r2.sw>r2.W)bad.push('styliste.html déborde');
  ok(!bad.length,w+' px : aucun défilement horizontal'+(bad.length?' — '+bad.join(', '):''))}
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 console.log(fails?fails+' test(s) en échec':'Tous les tests passent');await b.close();process.exit(fails?1:0)})();
