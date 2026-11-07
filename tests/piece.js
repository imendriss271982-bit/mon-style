// Tests v167 : « Coordonne-moi une tenue avec cette pièce » (fiche d'une pièce, depuis la garde-robe et l'Outfit check).
// L'IA est simulée. Lancer : python3 -m http.server 8765, puis : node tests/piece.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));
 const items=[['veste','Blazer noir','noir'],['haut','Chemise blanche','blanc'],['pantalon','Pantalon large','beige'],['chaussures','Escarpins','nude'],['jupe','Jupe midi','camel']].map((a,i)=>({id:'it'+i,cat:a[0],nom:a[1],couleur:a[2],hex:'#999999'}));
 await p.goto(URL);
 await p.evaluate(it=>{localStorage.clear();localStorage.setItem('monstyle_portes','0');localStorage.setItem('monstyle_focus','{"all":true}');localStorage.setItem('monstyle_portes_vu','1');localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{outfit:{note:6,solutions:[{action:'ajouter',probleme:'Il manque une structure.',texte:'Ajoute ton blazer noir.',id:'it0'}]}}}));localStorage.setItem('monstyle_gr',JSON.stringify({items:it,looks:{},saved:[]}))},items);
 const boot=async()=>{await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()});await p.waitForTimeout(200)};
 await boot();
 await p.evaluate(()=>go('garde'));await p.waitForTimeout(200);
 ok(await p.$('.pc-tip'),'Garde-robe : rappel « Touche une pièce »');
 await p.click('[data-gitem="it0"]');await p.waitForTimeout(200);
 ok(await p.$('[data-pcopen="it0"]'),'Fiche de la pièce : bouton « Coordonne-moi une tenue »');
 await p.click('[data-pcopen="it0"]');await p.waitForTimeout(200);
 ok(await p.evaluate(()=>S.page==='g_piece'&&document.querySelectorAll('[data-pcocc]').length>=6),'Page de la pièce avec les occasions');
 await p.click('[data-pcocc="soiree"]');
 await p.evaluate(()=>{window.__pr=[];let n=0;SAMPLE={json:async pr=>{__pr.push(pr);n++;return {tenues:n===1?[{titre:'Soir chic',pieces:['it1','it2','zzz'],conseil:'Le noir structure.',manque:''},{titre:'Jupe et blazer',pieces:['it0','it4','it3'],conseil:'Élégant.',manque:'Boucles dorées'}]:[{titre:'Autre look',pieces:['it0','it1','it2'],conseil:'Net.',manque:''}]}}}});
 await p.click('[data-pcgo]');await p.waitForTimeout(400);
 const pr=await p.evaluate(()=>__pr[0]);
 ok(/OBLIGATOIREMENT la pièce it0/.test(pr)&&/Soirée/.test(pr)&&/Blazer noir/.test(pr),'Aura reçoit la pièce, l’occasion et la garde-robe');
 ok(await p.evaluate(()=>S.pc.looks.length===2&&S.pc.looks.every(l=>l.pieces.includes('it0'))&&!S.pc.looks[0].pieces.includes('zzz')),'Chaque tenue contient la pièce, pièce inventée retirée');
 ok(await p.evaluate(()=>document.querySelectorAll('.gr-look').length===2&&/Boucles dorées/.test(document.body.innerText)),'Tenues affichées avec l’achat facultatif');
 await p.click('[data-pcsave="0"]');
 ok(await p.evaluate(()=>GR.saved.length===1&&GR.saved[0].occ==='soiree'&&GR.saved[0].pieces[0]==='it0'),'Enregistrer la tenue');
 await p.click('[data-pcgo]');await p.waitForTimeout(400);
 ok(await p.evaluate(()=>/Ne refais pas/.test(__pr[1])&&/Soir chic/.test(__pr[1])&&S.pc.looks[0].titre==='Autre look'),'« Autres idées » demande des tenues différentes');
 // Depuis l'Outfit check : la pièce proposée ouvre sa fiche, puis la coordination
 await p.evaluate(()=>{S.flow=null;go('o_res')});await p.waitForTimeout(300);
 const h=await p.$('.oc-ph[data-gitem="it0"]');ok(h,'Outfit check : photo de la pièce de la garde-robe');
 if(h){await h.click();await p.waitForTimeout(200);ok(await p.$('[data-pcopen="it0"]'),'Outfit check → fiche → bouton de coordination')}
 // Arabe
 await p.evaluate(()=>{S.lang='ar';save();});await boot();await p.evaluate(()=>{S.pc.id='it0';go('g_piece')});await p.waitForTimeout(300);
 ok(await p.evaluate(()=>/لبسة بهالقطعة/.test(document.body.innerText)&&document.documentElement.scrollWidth<=innerWidth),'Arabe : traduit, sans défilement horizontal');
 ok(!errs.length,'Aucune erreur JS '+errs.join(' | '));
 await b.close();console.log(fails?fails+' échec(s)':'Tout est bon');process.exit(fails?1:0)})();
