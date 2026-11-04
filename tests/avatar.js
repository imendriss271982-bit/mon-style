// Test de l'avatar cartoon du Style Twin (v157) : silhouettes, vraies pièces, personnalisation, sheila, tenue du jour, arabe, effacement.
// Lancer : python3 -m http.server 8765 (dans le dossier du projet), puis : node tests/avatar.js   (SHOTS=dossier pour des captures)
const {chromium}=require('playwright');
const URL=process.env.URL||'http://localhost:8765/',SHOTS=process.env.SHOTS||'';
(async()=>{const b=await chromium.launch(),errs=[],ko=[];const ok=(c,m)=>{if(c)console.log('✓ '+m);else{ko.push(m);console.log('✗ '+m)}};
 const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 const GR=[{id:'r1',cat:'robe',nom:'Robe rouge',hex:'#B3202A'},{id:'a1',cat:'abaya',nom:'Abaya noire',hex:'#151515'},{id:'h1',cat:'haut',nom:'Chemise blanche',hex:'#F7F7F2'},
  {id:'p1',cat:'pantalon',nom:'Pantalon beige',hex:'#C9B18E'},{id:'v1',cat:'veste',nom:'Blazer camel',hex:'#B8864B'},{id:'c1',cat:'chaussures',nom:'Escarpins nude',hex:'#D8B49A'},
  {id:'s1',cat:'sac',nom:'Sac noir',hex:'#222222'},{id:'j1',cat:'jupe',nom:'Jupe verte',hex:'#2F6B4F'}];
 const saved=[{titre:'Bureau',pieces:['h1','p1','v1','c1','s1']},{titre:'Soirée',pieces:['r1','c1']},{titre:'Majlis',pieces:['a1','c1','s1']}];
 const open=async(o={})=>{await p.goto(URL);await p.evaluate(o=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Imen',lang:o.lang||'fr',later:true,res:o.res||{},ans:o.ans||{}}));
  localStorage.setItem('monstyle_gr',JSON.stringify({items:o.gr||[],looks:{},saved:o.saved||[]}));if(o.av)localStorage.setItem('monstyle_avatar',JSON.stringify(o.av));sessionStorage.setItem('ms_hi','1')},o);
  await p.goto(URL);await p.waitForTimeout(1200);await p.evaluate(()=>{document.getElementById('splash')?.remove();S.hist=[]})};
 const shot=async n=>{if(SHOTS)await p.screenshot({path:SHOTS+'/'+n+'.png',fullPage:true})};
 // 1. Sans rien : tenue de base, message pour la silhouette
 await open();await p.evaluate(()=>go('twin'));await p.waitForTimeout(400);
 ok(await p.evaluate(()=>!!document.querySelector('.av-card .av-svg')),'Style Twin : carte avatar en haut');
 ok(/Ta tenue de base/.test(await p.evaluate(()=>document.querySelector('.av-card').innerText)),'Sans tenue : tenue de base');
 ok(/Fais ton analyse de silhouette/.test(await p.evaluate(()=>document.querySelector('.av-card').innerText)),'Sans silhouette : invite à faire l’analyse');
 // 2. Les 5 silhouettes changent la forme
 const largeurs={};
 for(const f of ['X · Sablier','A · Poire','V · Triangle inversé','H · Rectangle','O · Pomme']){await open({res:{corps:{forme:f}}});
  largeurs[f]=await p.evaluate(()=>{const d=avSVG(null);return d.match(/<path d="M([\d.]+),84 Q100/)[1]})}
 ok(new Set(Object.values(largeurs)).size>=4,'Les silhouettes donnent des épaules différentes : '+JSON.stringify(largeurs));
 // 3. Vraies pièces : tenue enregistrée, couleurs, « Autre tenue »
 await open({res:{corps:{forme:'X · Sablier'}},gr:GR,saved,ans:{cheveux:'noir'}});await p.evaluate(()=>go('twin'));await p.waitForTimeout(400);
 let svg=await p.evaluate(()=>document.querySelector('.av-card .av-svg').outerHTML);
 ok(/#B3202A/i.test(svg)||/#151515/.test(svg)||/#F7F7F2/i.test(svg),'L’avatar porte les couleurs des vraies pièces');
 const t1=await p.evaluate(()=>document.querySelector('.av-card').innerText);await shot('1-twin');
 await p.click('[data-avnext]');await p.waitForTimeout(300);
 const t2=await p.evaluate(()=>document.querySelector('.av-card').innerText);
 ok(t1!==t2,'« Autre tenue » change la tenue portée');
 const tout=await p.evaluate(()=>[0,1,2].map(i=>{S.avIdx=i;const t=avTenues()[i];return avSVG(t.it)}).join(''));
 ok(/#151515/.test(tout)&&/#B3202A/i.test(tout)&&/#B8864B/i.test(tout)&&/#222222/.test(tout),'Abaya, robe, blazer et sac dessinés avec leurs couleurs');
 ok(/#121212/.test(tout),'Cheveux : la couleur du questionnaire (noir)');
 // 4. Personnaliser : teint, coiffure, sheila
 await p.evaluate(()=>{S.hist=[];go('avatar')});await p.waitForTimeout(300);
 await p.click('[data-av="peau:4"]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>document.querySelector('.av-prev svg').outerHTML.includes('#8F5C3C')),'Teint choisi appliqué');
 await p.click('[data-av="coiffure:sheila"]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>!!document.querySelector('[data-av^="sheila:"]')),'Sheila : choix de sa couleur');
 await p.click('[data-av="sheila:#F3E7D3"]');await p.waitForTimeout(200);await shot('2-perso-sheila');
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('monstyle_avatar')).sheila==='#F3E7D3'&&document.querySelector('.av-prev svg').outerHTML.includes('#F3E7D3')),'Sheila crème enregistrée et dessinée');
 await p.reload();await p.waitForTimeout(1200);
 ok(await p.evaluate(()=>AV.peau===4&&AV.coiffure==='sheila'),'Choix gardés après rechargement');
 // 5. Tenue du jour
 await p.evaluate(()=>{const d=jrAuj();JR.d=d;JR.occ=jrOcc();JR.look={titre:'Bureau chic',pieces:['h1','p1','v1'],conseil:'',manque:''};document.getElementById('splash')?.remove();S.hist=[];go('jour')});await p.waitForTimeout(500);await shot('3-jour');
 ok(await p.evaluate(()=>!!document.querySelector('.jr-look .av-jour svg')),'Tenue du jour : l’avatar la porte');
 // 6. Données abîmées
 await open({av:{peau:99,cheveux:'rouge',coiffure:'x',sheila:5}});
 ok(await p.evaluate(()=>AV.peau===-1&&AV.coiffure==='longs'&&!AV.cheveux),'Données abîmées ignorées');
 // 7. Arabe
 await open({lang:'ar',res:{corps:{forme:'A · Poire'}},gr:GR,saved});await p.evaluate(()=>go('twin'));await p.waitForTimeout(600);await shot('4-arabe');
 const ar=await p.evaluate(()=>document.querySelector('.av-card').innerText);
 ok(/أفاتارچ/.test(ar)&&!/Ton avatar|Personnaliser/.test(ar),'Arabe : carte traduite');
 // 8. Largeurs
 for(const w of [320,768]){await p.setViewportSize({width:w,height:800});await p.waitForTimeout(200);
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),w+' px : aucun défilement horizontal')}
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(ko.length?ko.length+' échec(s)':'Tous les tests passent');process.exit(ko.length?1:0)})();
