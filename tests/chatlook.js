// Tests v170 : garde-robe « photo d'abord » et tenue demandée à Aura dans la discussion = tenue de SA garde-robe.
// L'IA est simulée. Lancer : python3 -m http.server 8765, puis : node tests/chatlook.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 const items=[['veste','Blazer noir','noir'],['haut','Chemise blanche','blanc'],['pantalon','Pantalon large','beige'],['chaussures','Escarpins','nude']].map((a,i)=>({id:'it'+i,cat:a[0],nom:a[1],couleur:a[2],hex:'#999999'}));
 const boot=async()=>{await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(200)};
 await p.goto(URL);
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle_gguide','5');localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true}))});
 await boot();await p.evaluate(()=>go('garde'));await p.waitForTimeout(200);
 ok(await p.evaluate(()=>{const c=document.querySelector('.gr-adds label.gr-add input[capture="environment"]');const g=document.querySelector('.gr-gal input[multiple]');return !!c&&!!g&&document.querySelector('.gr-adds').firstElementChild.matches('label.gr-add')}),'Garde-robe : la caméra en premier, galerie en petit lien');
 // Reconnaissance des demandes
 ok(await p.evaluate(()=>['Fais-moi une tenue pour ce soir','سوّي لي لبسة للدوام','اعمليلي outfit','شو ألبس اليوم؟','Make me an outfit for work','Que porter demain ?'].every(clDemande)),'Demandes de tenue reconnues (fr, ar, en)');
 ok(await p.evaluate(()=>!['Comment tu trouves ma tenue ?','Quelle couleur me va ?','وش رايچ في لبستي؟'].some(clDemande)),'Questions ordinaires non détournées');
 ok(await p.evaluate(()=>clOcc('سوّي لي لبسة للدوام')==='travail'&&clOcc('tenue pour une soirée')==='soiree'&&clOcc('لبسة للعرس')==='mariage'),'Occasion lue dans la demande');
 // Garde-robe vide → invitation à photographier
 await p.evaluate(()=>{go('chat')});await p.waitForTimeout(200);
 await p.evaluate(()=>send('Fais-moi une tenue'));await p.waitForTimeout(300);
 ok(await p.$('.bub.a [data-go="garde"]'),'Garde-robe vide : bouton « Photographier mes vêtements »');
 // Garde-robe pleine → tenue avec ses pièces
 await p.evaluate(it=>{GR.items=it;grSave();window.__pr=[];SAMPLE={json:async pr=>{__pr.push(pr);return {titre:'Chic du soir',pieces:['it0','it1','zzz','it3'],conseil:'Le noir et blanc te va.'}}}},items);
 await p.evaluate(()=>send('سوّي لي لبسة للسهرة'));await p.waitForTimeout(400);
 const pr=await p.evaluate(()=>__pr[0]);
 ok(/UNIQUEMENT avec les pièces de sa garde-robe/.test(pr)&&/Soirée/.test(pr)&&/Blazer noir/.test(pr)&&/jamais d’acheter/.test(pr),'Aura reçoit la garde-robe, l’occasion, sans achat');
 ok(await p.evaluate(()=>{const l=S.chat[S.chat.length-1].look;return l&&l.pieces.join()==='it0,it1,it3'}),'Pièce inventée retirée');
 ok(await p.evaluate(()=>document.querySelectorAll('.cl-look .gr-col > *').length===3),'Tenue affichée avec les photos de ses pièces');
 await p.click('.cl-sv');ok(await p.evaluate(()=>GR.saved.length===1&&GR.saved[0].occ==='soiree'),'Enregistrer la tenue');
 // Une vraie question passe toujours par la conversation normale
 ok(await p.evaluate(()=>/RÈGLE TENUES/.test(CATCTX(true))),'Voix : règle « seulement ses pièces » dans le contexte');
 ok(!errs.length,'Aucune erreur JS '+errs.join(' | '));
 await b.close();console.log(fails?fails+' échec(s)':'Tout est bon');process.exit(fails?1:0)})();
