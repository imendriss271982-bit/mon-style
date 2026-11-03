// Test des événements du Golfe (v155) : d'abord le pays de la cliente, puis « Ailleurs dans le Golfe ».
// Lancer : python3 -m http.server 8765 (dans le dossier du projet), puis : node tests/events.js
const {chromium}=require('playwright');
const URL=process.env.URL||'http://localhost:8765/';
(async()=>{const b=await chromium.launch(),errs=[],ko=[];const ok=(c,m)=>{if(c)console.log('✓ '+m);else{ko.push(m);console.log('✗ '+m)}};
 const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errs.push(e.message));
 const open=async(pays,lang='fr')=>{await p.goto(URL);await p.evaluate(([pays,lang])=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'T',lang,later:true,pays}));sessionStorage.setItem('ms_hi','1')},[pays,lang]);
  await p.goto(URL);await p.waitForTimeout(1200);await p.evaluate(()=>{document.getElementById('splash')?.remove();S.hist=[];go('news')});await p.waitForTimeout(600);return p.evaluate(()=>document.querySelector('#page').innerText)};
 let t=await open('QA');
 ok(/Événements mode et beauté/.test(t),'Titre Golfe');
 ok(t.indexOf('ERDEM')<t.indexOf('Ailleurs dans le Golfe'),'Qatar : événements du Qatar en premier');
 ok(/Dubai Shopping Festival/.test(t)&&/Ailleurs dans le Golfe/.test(t),'Qatar : le reste du Golfe en dessous');
 t=await open('SA');
 ok(t.indexOf('Riyadh Season')<t.indexOf('Ailleurs dans le Golfe'),'Arabie saoudite : Riyadh Season en premier');
 ok(/Qatar/.test(t.split('Ailleurs dans le Golfe')[1]||''),'Ailleurs : le pays est indiqué');
 t=await open('KW');
 ok(/Pas encore d’événement annoncé dans ton pays/.test(t),'Koweït : message clair quand rien n’est annoncé');
 ok(/Jewellery Arabia/.test(t),'Koweït : voit les événements du Golfe');
 t=await open('AE','ar');
 ok(/في باقي الخليج/.test(t)&&/فعاليات الموضة والجمال/.test(t),'Arabe : titres traduits');
 ok(!errs.length,'Aucune erreur JavaScript'+(errs.length?' : '+errs.join(' | '):''));
 await b.close();console.log(ko.length?ko.length+' échec(s)':'Tous les tests passent');process.exit(ko.length?1:0)})();
