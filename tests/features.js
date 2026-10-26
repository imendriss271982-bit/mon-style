// Tests fonctionnels : préférences de style, garde-robe, tenues enregistrées, semaine, autre version, données abîmées.
// L'IA est simulée (SAMPLE) : on vérifie le parcours et ce qui est envoyé à Aura, pas la qualité des réponses de Gemini.
// Lancer : python3 -m http.server 8765, puis : node tests/features.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
 const boot=async()=>{await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();home()})};
 await p.goto(URL);await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,res:{corps:{forme:'Sablier',kibbe:'Soft Classic'}}}))});
 await boot();
 // ——— Préférences ———
 await p.evaluate(()=>go('profil'));ok(await p.$('[data-view="prefs"]'),'Profil : lien « Mes préférences de style »');
 await p.click('[data-view="prefs"]');await p.waitForTimeout(300);
 await p.click('[data-pfk="aime"] [data-pfv="Rose"]');await p.click('[data-pfk="evite"] [data-pfv="Orange"]');
 await p.click('[data-pfk="evite"] [data-pfv="Rose"]');// passe Rose en « évite » : doit sortir de « aime »
 ok(await p.evaluate(()=>!PF.aime.includes('Rose')&&PF.evite.includes('Rose')),'Une couleur ne peut pas être aimée et évitée');
 await p.click('[data-pfk="aime"] [data-pfv="Bordeaux"]');
 await p.click('[data-pfk="evitePieces"] [data-pfv="Jupes"]');await p.click('[data-pfk="porte"] [data-pfv="Abayas"]');
 await p.click('[data-pfk="occasions"] [data-pfv="Ramadan"]');await p.click('[data-pfk="occasions"] [data-pfv="Mariages"]');
 await p.click('[data-pfone="pudeur"] [data-pfv="hijab"]');
 await p.fill('#pf_note','Je préfère les talons bas');
 const y0=await p.evaluate(()=>window.scrollY);
 await boot();
 const pf=await p.evaluate(()=>PF);
 ok(pf.aime.join()==='Bordeaux'&&pf.evite.join()==='Orange,Rose'&&pf.evitePieces.join()==='Jupes'&&pf.pudeur==='hijab'&&pf.note==='Je préfère les talons bas','Préférences gardées après rechargement');
 const prof=await p.evaluate(()=>PROFIL());
 ok(/couleurs qu’elle évite : orange, rose/.test(prof)&&/hijab/.test(prof)&&/talons bas/.test(prof),'Le profil envoyé à Aura contient les préférences');
 const fit=await p.evaluate(()=>{const j=CATALOGUE.find(a=>a.cat==='jupe');const before=artFit(j).sc;const keep=PF.evitePieces;PF.evitePieces=[];const after=artFit(j).sc;PF.evitePieces=keep;return [before,after]});
 ok(fit[0]<fit[1],'Boutique : une pièce évitée descend dans le classement ('+fit[0]+' < '+fit[1]+')');
 // ——— Garde-robe : ajout sans photo ———
 await p.evaluate(()=>go('garde'));
 const add=async(cat,nom,coul)=>{await p.evaluate(()=>go('garde'));await p.click('[data-gmanual]');await p.waitForTimeout(150);await p.fill('#g_nom',nom);await p.fill('#g_coul',coul);await p.click(`[data-gcat="${cat}"]`);await p.click('[data-back]');await p.waitForTimeout(100)};
 for(const a of [['haut','Chemise en soie','blanc'],['haut','Blouse fluide','beige'],['pantalon','Pantalon large','noir'],['jupe','Jupe plissée','camel'],['abaya','Abaya kimono','noir'],['veste','Blazer long','camel'],['chaussures','Escarpins','nude'],['sac','Sac structuré','bordeaux']])await add(...a);
 await p.evaluate(()=>go('garde'));
 ok(await p.evaluate(()=>GR.items.length===8&&grReady()),'8 articles ajoutés sans photo, garde-robe prête');
 ok(await p.evaluate(()=>GR.items.every(x=>x.nom&&x.cat)&&GR.items.find(x=>x.nom==='Abaya kimono').cat==='abaya'),'Nom et catégorie enregistrés (dont abaya)');
 await p.click('[data-gf="jupe"]');ok(await p.evaluate(()=>document.querySelectorAll('.gr-grid .gr-it').length===1),'Filtre par catégorie');
 await p.click('[data-gf=""]');
 ok(await p.evaluate(()=>/sa garde-robe enregistrée \(8 pièces\)/.test(PROFIL())),'Aura reçoit la liste des vraies pièces');
 ok(await p.evaluate(()=>grOccs()[0][0]==='mariage'||grOccs()[0][0]==='ramadan'),'Les occasions choisies (Mariages, Ramadan) passent en premier');
 // ——— Tenues (IA simulée) ———
 await p.evaluate(()=>{window.__pr=[];const ids=GR.items.map(x=>x.id);SAMPLE={json:async pr=>{__pr.push(pr);if(/Propose UNE autre tenue/.test(pr))return {titre:'Variante chic',pieces:[ids[1],ids[2],ids[6]],conseil:'Le beige adoucit.',manque:''};return {tenues:[{titre:'Iftar élégant',pieces:[ids[4],ids[6],ids[7]],conseil:'L’abaya noire structure.',manque:'Broche dorée'},{titre:'Soie et noir',pieces:[ids[0],ids[2],ids[6]],conseil:'Contraste net.',manque:''},{titre:'Pièce inventée',pieces:['zzz'],conseil:'',manque:''}]}}}});
 await p.click('[data-gocc="ramadan"]');await p.click('[data-glooks="ramadan"]');await p.waitForTimeout(400);
 const pr=await p.evaluate(()=>__pr[0]);
 ok(/Ramadan/.test(pr)&&/hijab/.test(pr)&&/N’utilise pas ces couleurs.*orange, rose/.test(pr)&&/Ne propose pas ces pièces : jupes/.test(pr),'Le prompt de tenues contient occasion, pudeur, couleurs et pièces évitées');
 ok(await p.evaluate(()=>GR.looks.ramadan.length===2),'Une tenue avec une pièce inventée est rejetée');
 ok(await p.evaluate(()=>/Achat facultatif : Broche dorée/.test(document.body.innerText)),'Achat facultatif distingué des pièces possédées');
 await p.click('[data-gsave="ramadan:0"]');await p.waitForTimeout(150);
 ok(await p.evaluate(()=>GR.saved.length===1&&GR.saved[0].titre==='Iftar élégant'),'Tenue enregistrée');
 await p.click('.gr-look [data-pfgood]');ok(await p.evaluate(()=>PF.avis[0]&&PF.avis[0].ok&&/Iftar élégant/.test(PF.avis[0].txt)),'Avis 👍 mémorisé');
 await p.click('[data-galt="ramadan:1"]');await p.waitForTimeout(500);
 ok(await p.evaluate(()=>GR.looks.ramadan[1].titre==='Variante chic'),'Autre version remplace la tenue');
 ok(await p.evaluate(()=>/tenues qu’elle a aimées : « Iftar élégant/.test(PROFIL())),'Les avis sont transmis à Aura');
 await boot();await p.evaluate(()=>go('garde'));
 ok(await p.evaluate(()=>GR.saved.length===1&&/Mes tenues enregistrées/.test(document.body.innerText)),'Tenue enregistrée retrouvée après rechargement');
 const sid=await p.evaluate(()=>GR.saved[0].id);
 await p.click(`[data-gday="${sid}:Ven"]`);ok(await p.evaluate(()=>GR.saved[0].jour==='Ven'&&!!document.querySelector('.gr-day.on')),'Tenue posée sur vendredi (Ma semaine)');
 // supprimer une pièce de la tenue enregistrée
 const abaya=await p.evaluate(()=>GR.saved[0].pieces[0]);
 await p.evaluate(id=>{S.grItem=id;go('g_item')},abaya);await p.click(`[data-gdel="${abaya}"]`);await p.waitForTimeout(200);
 ok(await p.evaluate(()=>GR.saved[0]&&GR.saved[0].pieces.length===2),'Pièce supprimée retirée de la tenue enregistrée');
 await p.evaluate(()=>go('garde'));await p.click(`[data-gunsave="${sid}"]`);ok(await p.evaluate(()=>GR.saved.length===0),'Tenue retirée');
 // préférences : suppression d'un avis puis effacement total
 await p.evaluate(()=>go('prefs'));await p.click('[data-pfdel]');ok(await p.evaluate(()=>PF.avis.length===0),'Avis supprimé');
 await p.click('[data-pfwipe]');ok(await p.evaluate(()=>pfEmpty()&&!PROFIL().includes('évite')),'Toutes les préférences effacées');
 // ——— Données abîmées ———
 await p.evaluate(()=>{localStorage.setItem('monstyle_pref','{pas du json');localStorage.setItem('monstyle_gr',JSON.stringify({items:[null,{id:1,cat:'xx'},{nom:'sans id'}],saved:[{pieces:'x'},{titre:'ok',pieces:['1']}]}))});
 await boot();await p.evaluate(()=>go('garde'));await p.evaluate(()=>go('prefs'));
 ok(await p.evaluate(()=>GR.items.length===1&&GR.items[0].cat==='haut'&&GR.saved.length===1&&pfEmpty()),'Données abîmées ignorées sans planter');
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 console.log(fails?fails+' échec(s)':'Tous les tests passent');await b.close();process.exit(fails?1:0)})();
