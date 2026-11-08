// Tests « Le Majlis » (v159) : deux téléphones (Sara et Noura), le VRAI code du Worker (/majlis/…) sur une base
// SQLite qui imite D1, segmentation du visage simulée. Lancer : python3 -m http.server 8765, puis : node tests/majlis.js
const {chromium}=require('playwright');const fs=require('fs'),path=require('path'),os=require('os');
const {DatabaseSync}=require('node:sqlite');
const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGP4/58BAyQ+GoP9/z8zMDAwAAAvsAPj1vDGRwAAAABJRU5ErkJggg==','base64');
const img=path.join(os.tmpdir(),'ms-majlis.png');fs.writeFileSync(img,png);
const piece='data:image/png;base64,'+png.toString('base64');
(async()=>{
 const W=(await import(require('url').pathToFileURL(path.join(__dirname,'../worker/worker.js')).href)).default;
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE mj_users (id TEXT PRIMARY KEY, th TEXT NOT NULL, nom TEXT, code TEXT UNIQUE, cree INTEGER, vu INTEGER);
 CREATE TABLE mj_amis (a TEXT NOT NULL, b TEXT NOT NULL, cree INTEGER, PRIMARY KEY (a, b));
 CREATE TABLE mj_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, conv TEXT NOT NULL, de TEXT NOT NULL, t INTEGER, txt TEXT, img TEXT, look TEXT, lu INTEGER DEFAULT 0);`);
 const D1={prepare(sql){const st={args:[],bind(...a){st.args=a;return st},async first(){return db.prepare(sql).get(...st.args)||null},async all(){return {results:db.prepare(sql).all(...st.args)}},async run(){const r=db.prepare(sql).run(...st.args);return {meta:{last_row_id:Number(r.lastInsertRowid)}}}};return st},async batch(l){for(const s of l)await s.run()}};
 const env={MAJLIS:D1};const AI=[];let AI_REP='Le blanc et le noir, c’est très chic, Sara ! Ajoute une ceinture dorée.';let ip=0;
 const route=async r=>{const q=r.request();if(q.method()==='OPTIONS')return r.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'POST'}});
  const res=await W.fetch(new Request(q.url(),{method:'POST',headers:{Origin:'https://imendriss271982-bit.github.io','Content-Type':'application/json','CF-Connecting-IP':'10.4.'+(++ip%200)+'.1'},body:q.postData()}),env);
  r.fulfill({status:res.status,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:await res.text()})};
 const b=await chromium.launch();
 const tel=async(nom,lang,extra,q='')=>{const ctx=await b.newContext({viewport:{width:390,height:844}});await ctx.route('https://mon-style.imendriss271982.workers.dev/majlis/**',route);
  await ctx.route('https://cdn.jsdelivr.net/**',r=>r.abort());
  await ctx.route(u=>u.href==='https://mon-style.imendriss271982.workers.dev/',r=>{AI.push(JSON.parse(r.request().postData()));r.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify({reponse:AI_REP})})});
  const p=await ctx.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(URL);await p.evaluate(([nom,lang,extra])=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom,lang,later:true,pays:'QA',res:{corps:{forme:'Sablier'}}}));for(const k in extra)localStorage.setItem(k,extra[k])},[nom,lang,extra]);
  await p.goto(URL+q);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(250);return p};
 const gr=JSON.stringify({items:[{id:'a1',cat:'haut',nom:'Chemise blanche',couleur:'Blanc',img:piece},{id:'a2',cat:'bas',nom:'Pantalon noir',couleur:'Noir',img:piece}],looks:{},saved:[{id:'L1',titre:'Look bureau chic',pieces:['a1','a2'],occ:'bureau',jour:'',d:'2026-11-01'}]});
 const sara=await tel('Sara','fr',{monstyle_gr:gr,monstyle_portes_vu:'1'});
 // ——— Sara : l'en-tête et son Majlis ———
 ok(await sara.evaluate(()=>{const h=document.getElementById('dkmj');return h&&h.getBoundingClientRect().width>30&&!document.querySelector('#dock [data-go="profil"]')&&!document.querySelector('.mj-bar')}),'Barre du bas : onglet Majlis à la place de Profil, plus de bande en haut (v174)');
 await sara.click('#dkmj');await sara.waitForTimeout(700);
 ok(await sara.evaluate(()=>S.page==='majlis'&&/^[0-9a-f]{16}$/.test(MJ.uid)&&/^[A-Z2-9]{6}$/.test(MJ.code)),'Majlis ouvert : compte créé tout seul avec son prénom');
 ok(await sara.evaluate(()=>!!document.querySelector('.mj-vide')&&/wa\.me\/\?text=.*majlis%3D[A-Z2-9]{6}/.test(document.querySelector('.mj-wa').href)),'Majlis vide + bouton WhatsApp avec le lien d’invitation');
 ok(await sara.evaluate(()=>document.getElementById('dkmj').getAttribute('aria-current')==='page'&&document.getElementById('back').hidden),'Onglet Majlis allumé, page principale (sans retour)');
 const code=await sara.evaluate(()=>MJ.code);
 ok(JSON.parse(await sara.evaluate(()=>localStorage.getItem('monstyle_majlis'))).token.length===32,'Jeton gardé sur le téléphone');
 // ——— Noura ouvre le lien ———
 const noura=await tel('Noura','fr',{},'?majlis='+code);
 await noura.waitForTimeout(1600);
 ok(await noura.evaluate(()=>!location.search.includes('majlis')),'Le code est retiré de l’adresse');
 ok(await noura.evaluate(()=>{const c=document.querySelector('.mj-invite');return c&&/Sara/.test(c.textContent)&&/t’invite dans son Majlis/.test(c.textContent)}),'Accueil de Noura : « Sara t’invite dans son Majlis »');
 await noura.click('[data-mjjoin]');await noura.waitForTimeout(900);
 ok(await noura.evaluate(()=>S.page==='mj_chat'&&S.mjAmiNom==='Sara'&&!localStorage.getItem('monstyle_mj_inv')),'Rejoindre → conversation avec Sara');
 await noura.fill('#mj_txt','Coucou Sara ! Montre-moi ta tenue 😍');await noura.click('[data-mjsend]');await noura.waitForTimeout(500);
 ok(await noura.evaluate(()=>document.querySelectorAll('.mj-b.moi').length===1&&document.getElementById('mj_txt').value===''),'Noura envoie un message');
 await noura.fill('#mj_txt','Et tu viens samedi ?');await noura.press('#mj_txt','Enter');await noura.waitForTimeout(500);
 ok(await noura.evaluate(()=>document.querySelectorAll('.mj-b.moi').length===2),'Touche Entrée = envoyer');
 // ——— Sara reçoit ———
 await sara.evaluate(()=>home());await sara.evaluate(()=>mjNonLus());await sara.waitForTimeout(800);
 ok(await sara.evaluate(()=>{const i=document.querySelector('#dkmj .mj-bd');return i&&!i.hidden&&i.textContent==='2'}),'Pastille : 2 messages non lus');
 ok(await sara.evaluate(()=>{const c=document.querySelector('.mj-msg');return c&&/Noura/.test(c.textContent)&&/t’a écrit/.test(c.textContent)}),'Accueil : « Noura t’a écrit dans le Majlis »');
 await sara.click('.mj-msg');await sara.waitForTimeout(800);
 ok(await sara.evaluate(()=>S.page==='mj_chat'&&document.querySelectorAll('.mj-b.elle').length===2&&/Montre-moi/.test(document.getElementById('mjList').textContent)),'Sara lit les messages de Noura');
 ok(await sara.evaluate(()=>MJ.nl===0&&document.querySelector('#dkmj .mj-bd').hidden),'Pastille remise à zéro');
 await sara.fill('#mj_txt','Oui ! Je t’envoie mon look');await sara.click('[data-mjsend]');await sara.waitForTimeout(400);
 // ——— v164 : par défaut Aura ne vient QUE si on l'appelle ———
 {const n0=AI.length;await sara.evaluate(()=>{mjAuraPhoto(S.mjAmi,999,{img:'data:image/jpeg;base64,AAAA',look:'x'});mjAuraSiBesoin(S.mjAmi,'Quelle couleur de sac avec ma robe ?');mjAuraFin(S.mjAmi)});await sara.waitForTimeout(800);
  ok(AI.length===n0&&await sara.evaluate(()=>!document.querySelector('.mj-b.mj-aura')),'Par défaut : photo, question de style ou fin de discussion → Aura ne dit rien (seulement si on l’appelle)');
  await sara.evaluate(()=>{MJ_AURA_OPT.auto=true});await noura.evaluate(()=>{MJ_AURA_OPT.auto=true});}
 // tenue enregistrée depuis le sélecteur
 await sara.click('.mj-plus');await sara.waitForTimeout(200);
 ok(await sara.evaluate(()=>!!document.querySelector('[data-mjsendlook="L1"]')&&!!document.querySelector('[data-mjphoto]')),'Bouton + : photo ou tenue enregistrée');
 await sara.click('[data-mjsendlook="L1"]');await sara.waitForTimeout(1200);
 ok(await sara.evaluate(()=>{const l=[...document.querySelectorAll('.mj-b.moi')].pop();return l&&l.querySelector('img')&&/^data:image\/jpeg/.test(l.querySelector('img').src)&&/Look bureau chic/.test(l.textContent)}),'Tenue envoyée : collage des vraies pièces + titre');
 await sara.waitForTimeout(800);
 ok(AI.length===1&&AI[0].images.length===1&&/Majlis/.test(AI[0].prompt)&&/visage/i.test(AI[0].prompt),'Aura : l’IA reçoit la tenue (une seule demande)');
 ok(await sara.evaluate(()=>{const a=[...document.querySelectorAll('.mj-b.mj-aura')];return a.length===1&&/ceinture dorée/.test(a[0].textContent)&&/Aura/.test(a[0].textContent)}),'Aura commente la tenue par écrit dans la conversation');
 ok(db.prepare("SELECT COUNT(*) n FROM mj_msgs WHERE de='aura' AND lu=1 AND look LIKE '@%'").get().n===1,'Conseil d’Aura rangé sur le serveur (lié à la photo, déjà lu)');
 // Noura voit tout arriver (boucle de 3 s)
 await noura.waitForTimeout(3600);
 ok(await noura.evaluate(()=>document.querySelectorAll('.mj-b.elle').length===2&&!!document.querySelector('.mj-b.elle img')),'Noura reçoit le message et la tenue sans recharger');
 ok(await noura.evaluate(()=>{const a=document.querySelector('.mj-b.mj-aura');return a&&/ceinture dorée/.test(a.textContent)}),'Noura voit aussi le conseil d’Aura');
 ok(await noura.evaluate(()=>/Vu/.test([...document.querySelectorAll('.mj-b.moi')].pop().textContent)),'Noura voit « Vu » sous son dernier message');
 // Noura appelle Aura par son nom (sans photo à elle : conseil général)
 AI_REP='Noura, une sandale nude allongera la silhouette de Sara.';
 await noura.fill('#mj_txt','أورا شو رأيك بالحذاء؟');await noura.click('[data-mjsend]');await noura.waitForTimeout(900);
 ok(AI.length===2&&AI[1].images.length===1&&/On t’appelle/.test(AI[1].prompt)&&/ne connais pas le profil/.test(AI[1].prompt),'« أورا » dans un message → Aura répond en regardant la dernière photo');
 ok(await noura.evaluate(()=>document.querySelectorAll('.mj-b.mj-aura').length===2),'Réponse d’Aura affichée');
 await noura.fill('#mj_txt','Laura vient aussi');await noura.click('[data-mjsend]');await noura.waitForTimeout(700);
 ok(AI.length===2,'« Laura » n’appelle pas Aura');
 const rAura=await noura.evaluate(async()=>{const cv=MJC[S.mjAmi],ph=cv.msgs.find(m=>m.img);try{const r=await mjApi('aura',{...mjAuth(),ami:S.mjAmi,txt:'encore',ref:ph.id});return r.deja}catch(e){return 'err'}});
 ok(rAura===true,'Un seul conseil d’Aura par photo (serveur)');
 // ——— Photo : visage caché sur le téléphone ———
 const zone=await sara.evaluate(async()=>{
  const c=document.createElement('canvas');c.width=200;c.height=200;const g=c.getContext('2d'),d=g.createImageData(200,200);for(let i=0;i<d.data.length;i+=4){const v=(i/4)%2?255:0;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}g.putImageData(d,0,0);
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  MJ_SEG.segmenter=async cv=>{const w=64,h=64,face=new Float32Array(w*h),hair=new Float32Array(w*h);for(let y=8;y<20;y++)for(let x=26;x<38;x++)face[y*w+x]=.9;return {face,hair,w,h}};
  const r=await mjCacherVisage(blob);const im=await mjImage(r.url),o=document.createElement('canvas');o.width=im.width;o.height=im.height;const og=o.getContext('2d');og.drawImage(im,0,0);
  const varz=(x0,y0)=>{const p=og.getImageData(x0,y0,6,6).data;let mn=255,mx=0;for(let i=0;i<p.length;i+=4){mn=Math.min(mn,p[i]);mx=Math.max(mx,p[i])}return mx-mn};
  return {visage:r.visage,dansVisage:varz(100,40),dehors:varz(30,160)};});
 ok(zone.visage&&zone.dansVisage<60&&zone.dehors>150,'Visage pixellisé, le reste de la photo intact');
 await sara.evaluate(()=>{S.mjPick=1;render(false)});await sara.setInputFiles('[data-mjphoto]',img);await sara.waitForTimeout(1200);
 const nImg=await sara.evaluate(()=>document.querySelectorAll('.mj-b.moi img').length);
 ok(nImg===2,'Photo envoyée après avoir caché le visage');
 await sara.evaluate(()=>{MJ_SEG.segmenter=null;MJ_SEG.pret=Promise.reject(new Error('réseau'));MJ_SEG.pret.catch(()=>{});S.mjPick=1;render(false)});
 await sara.setInputFiles('[data-mjphoto]',img);await sara.waitForTimeout(1000);
 ok(await sara.evaluate(()=>document.querySelectorAll('.mj-b.moi img').length)===nImg&&/visage/.test(await sara.evaluate(()=>document.getElementById('toast').textContent)),'Visage impossible à cacher → la photo n’est PAS envoyée');
 // ——— Partager une tenue depuis « Mes tenues » ———
 await sara.evaluate(()=>{MJ_SEG.pret=null;go('tenues')});await sara.waitForTimeout(400);
 ok(await sara.evaluate(()=>!!document.querySelector('[data-mjlook="L1"]')),'Mes tenues : bouton « Au Majlis »');
 await sara.click('[data-mjlook="L1"]');await sara.waitForTimeout(700);
 ok(await sara.evaluate(()=>S.page==='majlis'&&!!document.querySelector('.mj-part')&&!!document.querySelector('[data-mjami]')),'Choisir l’amie à qui envoyer');
 const avant=await sara.evaluate(()=>MJC[MJ.amis[0].id].msgs.length);
 await sara.click('[data-mjami]');await sara.waitForTimeout(1200);
 await sara.waitForTimeout(800);
 ok(await sara.evaluate(a=>S.page==='mj_chat'&&MJC[S.mjAmi].msgs.length===a+2&&MJC[S.mjAmi].msgs.slice(-1)[0].aura&&!S.mjPart,avant),'Tenue envoyée, conversation ouverte');
 // ——— Aura toute seule (v161) : mot de fin, puis conseil quand on parle de style ———
 const nAI=AI.length;
 await noura.evaluate(()=>{go('majlis')});await noura.waitForTimeout(300);
 const sId=await noura.evaluate(()=>MJ.amis[0].id);
 for(let i=0;i<3;i++){await sara.evaluate(i=>mjEnvoyer(S.mjAmi,{txt:'msg Sara '+i}),i);await noura.evaluate(([a,i])=>mjEnvoyer(a,{txt:'msg Noura '+i}),[sId,i]);}
 await sara.evaluate(()=>mjCharger(S.mjAmi,true));await sara.waitForTimeout(500);
 AI_REP='يا بنات، ما أحلى جمعتكم 💛';
 await sara.evaluate(()=>home());await sara.waitForTimeout(1200);
 ok(AI.length===nAI+1&&/La discussion se termine/.test(AI[nAI].prompt),'Sara quitte la conversation → Aura prépare un mot de fin');
 ok(db.prepare("SELECT COUNT(*) n FROM mj_msgs WHERE de='aura' AND txt LIKE '%جمعتكم%'").get().n===1,'Mot de fin d’Aura rangé (vu par les deux)');
 await sara.evaluate(()=>{go('mj_chat')});await sara.waitForTimeout(900);await sara.evaluate(()=>home());await sara.waitForTimeout(800);
 ok(AI.length===nAI+1,'Pas de deuxième mot de fin sans nouvelle discussion');
 // conseil quand on parle de style
 await noura.evaluate(a=>{S.mjAmi=a;S.mjAmiNom='Sara';go('mj_chat')},sId);await noura.waitForTimeout(900);
 await noura.fill('#mj_txt','On se voit à 20h');await noura.click('[data-mjsend]');await noura.waitForTimeout(600);
 ok(AI.length===nAI+1,'Message ordinaire → Aura ne dit rien');
 for(let i=0;i<3;i++)await noura.evaluate(([a,i])=>mjEnvoyer(a,{txt:'ok '+i}),[sId,i]);
 AI_REP='';const DBA=db.prepare("SELECT COUNT(*) n FROM mj_msgs WHERE de='aura'").get().n;
 await noura.fill('#mj_txt','شو لون الشنطة اللي يليق مع الفستان؟');await noura.click('[data-mjsend]');await noura.waitForTimeout(900);
 ok(AI.length===nAI+2&&/renvoie une réponse vide/.test(AI[nAI+1].prompt),'Question de style → Aura est consultée');
 ok(db.prepare("SELECT COUNT(*) n FROM mj_msgs WHERE de='aura'").get().n===DBA,'Réponse vide de l’IA → Aura ne publie rien');
 AI_REP='Avec un fstan noir, une pochette dorée, Noura 💛';
 await noura.fill('#mj_txt','Et quelles chaussures je mets ?');await noura.click('[data-mjsend]');await noura.waitForTimeout(900);
 ok(await noura.evaluate(()=>/pochette dorée/.test([...document.querySelectorAll('.mj-b.mj-aura')].pop().textContent)),'Aura glisse son conseil dans la discussion');
 AI_REP='Le blanc et le noir, c’est très chic, Sara ! Ajoute une ceinture dorée.';
 // ——— v165 : tenue créée par Aura → à une amie ; l'amie dit « ما عجبني » → Aura répond ———
 await sara.evaluate(()=>{MJ_AURA_OPT.auto=false;GR.looks={quotidien:[{titre:'Look plage chic',pieces:['a1','a2'],conseil:'x'}]}});
 ok(await sara.evaluate(()=>/data-mjgl="quotidien:0"/.test(grActs(GR.looks.quotidien[0],'quotidien',0))),'Tenue créée par Aura : bouton « À une amie »');
 await sara.evaluate(()=>{const b=document.createElement('button');b.dataset.mjgl='quotidien:0';document.body.appendChild(b);b.click();b.remove()});await sara.waitForTimeout(600);
 ok(await sara.evaluate(()=>S.page==='majlis'&&S.mjPart&&S.mjPart.kind==='gl'),'… puis choisir l’amie');
 await sara.click('[data-mjami]');await sara.waitForTimeout(1500);
 const glId=await sara.evaluate(()=>{const m=[...MJC[S.mjAmi].msgs].reverse().find(x=>x.img&&x.moi);return m&&m.look==='Look plage chic'?m.id:0});
 ok(glId>0&&await sara.evaluate(()=>S.page==='mj_chat'),'Tenue d’Aura envoyée direct dans le chat');
 const nA=AI.length;AI_REP='Noura, le blanc illumine Sara 💛 Avec ton pantalon noir et une touche dorée, ça vous plaira à toutes les deux.';
 await noura.evaluate(()=>mjEnvoyer(S.mjAmi,{txt:'Hmm ما عجبني اللون'}));await sara.waitForTimeout(5000);
 ok(AI.length===nA+1&&/vient de répondre/.test(AI[nA].prompt)&&AI[nA].images.length===1&&/Chemise blanche/.test(AI[nA].prompt),'Noura dit « ما عجبني » → Aura répond sur le téléphone de Sara (tenue + sa garde-robe)');
 ok(db.prepare("SELECT COUNT(*) n FROM mj_msgs WHERE de='aura' AND look=?").get('@'+glId).n===1&&await sara.evaluate(()=>/touche dorée/.test([...document.querySelectorAll('.mj-b.mj-aura')].pop().textContent)),'Réponse d’Aura affichée et rangée (vue par les deux)');
 await noura.evaluate(()=>mjEnvoyer(S.mjAmi,{txt:'vraiment ما عجبني'}));await sara.waitForTimeout(4500);
 ok(AI.length===nA+1,'Une seule réponse d’Aura par tenue');
 await noura.evaluate(()=>mjEnvoyer(S.mjAmi,{txt:'Trop belle !'}));await sara.waitForTimeout(4000);
 ok(AI.length===nA+1,'Avis positif → Aura ne dit rien');
 // ——— Arabe + petit écran ———
 await noura.evaluate(()=>{S.lang='ar';save();i18nApply();home()});await noura.setViewportSize({width:320,height:640});await noura.waitForTimeout(400);
 ok(await noura.evaluate(()=>{const d=document.getElementById('dkmj');return document.documentElement.dir==='rtl'&&/المجلس/.test(d.textContent)&&d.getBoundingClientRect().right<=321&&document.documentElement.scrollWidth<=320}),'320 px en arabe : onglet « المجلس » dans la barre du bas, pas de défilement horizontal');
 await noura.click('#dkmj');await noura.waitForTimeout(700);
 ok(await noura.evaluate(()=>/المجلس/.test(document.querySelector('h1').textContent)&&!!document.querySelector('.mj-ami')),'« المجلس » traduit, Sara dans la liste');
 await noura.screenshot({path:path.join(os.tmpdir(),'majlis-ar.png')});
 await noura.click('.mj-ami');await noura.waitForTimeout(900);
 ok(await noura.evaluate(()=>document.documentElement.scrollWidth<=320&&!!document.querySelector('.mj-cmp .send-b')),'Conversation à 320 px : barre d’écriture complète');
 await noura.screenshot({path:path.join(os.tmpdir(),'majlis-chat-ar.png'),fullPage:true});
 ok(await noura.evaluate(()=>/Oui ! Je t’envoie mon look/.test(document.getElementById('mjList').textContent)),'Les messages des amies ne sont jamais traduits');
 // ——— Retirer + effacer ———
 await noura.click('[data-mjquit]');await noura.waitForTimeout(800);
 ok(await noura.evaluate(()=>S.page!=='mj_chat'&&MJ.amis.length===0),'Retirer Sara du Majlis');
 ok(db.prepare('SELECT COUNT(*) n FROM mj_msgs').get().n===0,'Conversation effacée du serveur');
 await sara.evaluate(()=>mjWipe());await sara.waitForTimeout(500);
 ok(db.prepare('SELECT COUNT(*) n FROM mj_users').get().n===1&&await sara.evaluate(()=>!localStorage.getItem('monstyle_majlis')&&!MJ.uid),'Effacer mes données : compte supprimé du téléphone et du serveur');
 const errs=[...sara.errs,...noura.errs];ok(!errs.length,'Aucune erreur JS'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(fails?fails+' échec(s)':'Tout est bon');process.exit(fails?1:0);
})();
