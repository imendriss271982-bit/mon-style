// Tests « Contact et séance privée » (v156) : la page Contact de l'app, le VRAI code du Worker (/contact/new),
// l'email envoyé à Brevo (simulé). Lancer : python3 -m http.server 8765, puis : node tests/contact.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os');
const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGP4/58BAyQ+GoP9/z8zMDAwAAAvsAPj1vDGRwAAAABJRU5ErkJggg==','base64');
const img=path.join(os.tmpdir(),'ms-contact.png');fs.writeFileSync(img,png);
(async()=>{
 const W=(await import(require('url').pathToFileURL(path.join(__dirname,'../worker/worker.js')).href)).default;
 // Brevo simulé : on garde les emails « envoyés ».
 const sent=[];let brevoKo=false;const realFetch=globalThis.fetch;
 globalThis.fetch=async(u,o)=>{if(String(u).startsWith('https://api.brevo.com/')){if(brevoKo)return new Response('{"message":"x"}',{status:401});sent.push({key:o.headers['api-key'],mail:JSON.parse(o.body)});return new Response('{"messageId":"1"}',{status:201})}return realFetch(u,o)};
 const env={BREVO_KEY:'xkeysib-test'};let ip=0;
 const call=async(body,e=env,origin='https://imendriss271982-bit.github.io')=>{const r=await W.fetch(new Request('https://w.test/contact/new',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'10.2.0.'+(++ip)},body:JSON.stringify(body)}),e);return {s:r.status,j:await r.json()}};
 // ——— Worker seul ———
 ok((await call({type:'aide',email:'a@b.co',message:'x'},{})).s===503,'Worker : sans BREVO_KEY → « pas encore activé »');
 ok((await call({type:'aide',email:'pas-un-email',message:'x'})).j.code==='email','Worker : email invalide refusé');
 ok((await call({type:'aide',email:'a@b.co',message:'  '})).j.code==='vide','Worker : message vide refusé');
 ok((await call({type:'seance',email:'a@b.co'})).j.code==='date','Worker : séance sans date refusée');
 ok((await call({type:'aide',email:'a@b.co',message:'x'},env,'https://mystyle.divadivina.app')).s===403,'Worker : le site vitrine n’a pas accès au contact');
 ok((await call({type:'aide',email:'a@b.co',message:'x',site:'robot'})).j.ok&&!sent.length,'Worker : champ piège → rien n’est envoyé');
 const r1=await call({type:'aide',quoi:'bug',nom:'Sara<b>',email:'Sara@Mail.com',message:'Le bouton <script> ne marche pas',version:'155'});
 const m1=sent[0]&&sent[0].mail;
 ok(r1.j.ok&&m1&&m1.to[0].email==='imendriss@divadivina.app'&&m1.replyTo.email==='sara@mail.com'&&sent[0].key==='xkeysib-test','Worker : email envoyé à Imen, « Répondre » va à la cliente');
 ok(/Problème technique/.test(m1.subject)&&/&lt;script&gt;/.test(m1.htmlContent)&&!/<script>/.test(m1.htmlContent)&&/Sara&lt;b&gt;/.test(m1.htmlContent),'Worker : sujet clair, texte de la cliente échappé (pas de HTML injecté)');
 brevoKo=true;ok((await call({type:'aide',email:'a@b.co',message:'x'})).j.code==='envoi','Worker : Brevo en erreur → message clair');brevoKo=false;
 sent.length=0;
 // ——— Dans l'app ———
 const route=async r=>{const q=r.request();if(q.method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST'}});
  const res=await W.fetch(new Request(q.url(),{method:'POST',headers:{Origin:'https://imendriss271982-bit.github.io','Content-Type':'application/json','CF-Connecting-IP':'10.3.0.'+(++ip)},body:q.postData()}),env);
  r.fulfill({status:res.status,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:await res.text()})};
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('https://mon-style.imendriss271982.workers.dev/contact/**',route);
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Sara',lang:'fr',later:true,pays:'QA',info:{email:'sara@mail.com',tel:'+97455550000'},res:{corps:{forme:'Sablier',kibbe:'Soft Classic'}}}))});
 await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(200);
 await p.evaluate(()=>go('profil'));await p.waitForTimeout(300);
 ok(await p.evaluate(()=>!!document.querySelector('[data-ctgo="seance"]')&&/300 QAR/.test(document.querySelector('[data-ctgo="seance"]').textContent)&&!!document.querySelector('[data-ctgo="aide"]')),'Profil : tuiles « Séance privée » (300 QAR) et « Besoin d’aide ? »');
 await p.click('[data-ctgo="aide"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.page==='contact'&&document.getElementById('ct_email').value==='sara@mail.com'&&/imendriss@divadivina\.app/.test(document.querySelector('.ct-mail a').href)),'Besoin d’aide : email pré-rempli, adresse de contact affichée avec lien mailto');
 await p.click('[data-ctsend="aide"]');await p.waitForTimeout(200);
 ok(!sent.length,'Message vide : rien n’est envoyé');
 await p.fill('#ct_msg','Mon outfit check tourne sans fin.');await p.click('[data-ctquoi="question"]');await p.click('[data-ctquoi="bug"]');
 await p.setInputFiles('[data-ctphoto]',img);await p.waitForTimeout(300);
 ok(await p.evaluate(()=>document.getElementById('ct_msg').value==='Mon outfit check tourne sans fin.'&&CT.quoi==='bug'&&!!document.querySelector('.vf-photo img')),'Choix, message et capture gardés');
 await p.click('[data-ctsend="aide"]');await p.waitForTimeout(800);
 const a=sent[0]&&sent[0].mail;
 ok(a&&/outfit check tourne/.test(a.htmlContent)&&a.attachment&&a.attachment[0].content.length>20&&/app<\/td><td[^>]*>1\d\d</.test(a.htmlContent)&&a.replyTo.email==='sara@mail.com','Envoyé : message, capture jointe, version de l’app');
 ok(await p.evaluate(()=>!!document.querySelector('.ct-ok')&&document.getElementById('ct_msg').value===''),'Confirmation affichée, formulaire vidé');
 // ——— Séance ———
 await p.click('[data-cttab="seance"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/300 QAR/.test(document.querySelector('.ct-offre').textContent)&&!document.querySelector('.ct-ok')),'Séance : prix 300 QAR · 1 h');
 await p.click('[data-ctsend="seance"]');await p.waitForTimeout(200);
 ok(sent.length===1,'Séance sans date : rien n’est envoyé');
 const d=await p.evaluate(()=>{const d=new Date(Date.now()+5*86400000);return d.toISOString().slice(0,10)});
 await p.fill('#ct_date',d);await p.click('[data-ctmode="doha"]');await p.click('[data-ctcren="soir"]');await p.click('[data-ctobj="Mariage"]');await p.click('[data-ctobj="Garde-robe"]');await p.fill('#ct_note','Je me marie en mars.');
 ok(await p.evaluate(d=>document.getElementById('ct_date').value===d&&document.getElementById('ct_note').value==='Je me marie en mars.',d),'Date et petit mot gardés après les choix');
 await p.click('[data-ctsend="seance"]');await p.waitForTimeout(800);
 const s2=sent[1]&&sent[1].mail;
 ok(s2&&/Séance privée/.test(s2.subject)&&s2.subject.includes(d)&&/présentiel à Doha/.test(s2.htmlContent)&&/Soir/.test(s2.htmlContent)&&/Mariage, Garde-robe/.test(s2.htmlContent)&&/300 QAR/.test(s2.htmlContent)&&/Sablier/.test(s2.htmlContent)&&/mars/.test(s2.htmlContent),'Séance envoyée : date, format, créneau, objectif, prix, résultats et petit mot');
 // ——— Formules → réservation ———
 await p.evaluate(()=>{S.ctOk='';go('abo')});await p.waitForTimeout(300);
 await p.click('[data-buy="seance"]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>S.page==='contact'&&S.ctTab==='seance'),'Formules : « Séance avec la styliste » ouvre la réservation');
 // ——— Échec d'envoi → lien email ———
 brevoKo=true;await p.click('[data-cttab="aide"]');await p.fill('#ct_msg','Test');await p.click('[data-ctsend="aide"]');await p.waitForTimeout(800);brevoKo=false;
 ok(await p.evaluate(()=>{const l=document.querySelector('.note a[href^="mailto:"]');return l&&/subject=/.test(l.href)&&/Test/.test(decodeURIComponent(l.href))}),'Échec : lien email pré-rempli pour ne rien perdre');
 // ——— Arabe + petites largeurs ———
 await p.evaluate(()=>{const m=JSON.parse(localStorage.getItem('monstyle'));m.lang='ar';localStorage.setItem('monstyle',JSON.stringify(m))});
 await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();S.ctTab='seance';go('contact')});await p.waitForTimeout(500);
 ok(await p.evaluate(()=>/جلسة خاصة/.test(document.body.innerText)&&/أطلب جلستي/.test(document.body.innerText)&&document.documentElement.dir==='rtl'),'Arabe : page traduite, de droite à gauche');
 for(const w of [320,768]){await p.setViewportSize({width:w,height:800});await p.waitForTimeout(200);ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Pas de défilement horizontal à '+w+' px')}
 ok(!errs.length,'Aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(fails?`\n${fails} échec(s)`:'\nTout est bon');process.exit(fails?1:0);
})();
