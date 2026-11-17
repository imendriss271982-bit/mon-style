// Test v230 : bloc ELVORIQUE (bijoux, affiliation Awin 128211) dans la Boutique. Lancer : node tests/elvorique.js
const {chromium}=require('playwright');const URL=process.env.URL||'http://localhost:8765/';
let fails=0;const ok=(c,m)=>{console.log((c?'✓ ':'✗ ')+m);if(!c)fails++};
(async()=>{const b=await chromium.launch();const errs=[];
 for(const [lang,w] of [['fr',390],['ar',360],['en',768]]){
  const p=await b.newPage({viewport:{width:w,height:844}});p.on('pageerror',e=>errs.push(e.message));
  await p.goto(URL);await p.evaluate(l=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:l,later:true,info:{email:'t@t.qa'}}))},lang);
  await p.goto(URL);await p.waitForTimeout(900);await p.evaluate(()=>{document.getElementById('splash')?.remove();go('boutique')});await p.waitForTimeout(400);
  const n=await p.$$eval('a.ptn[href*="awinmid=128211"]',a=>a.length);ok(n===12,`${lang} : 12 bijoux affichés (${n})`);
  ok(await p.$$eval('.ptn-mq b',x=>x.some(e=>e.textContent==='ELVORIQUE')),`${lang} : en-tête ELVORIQUE`);
  const h=await p.$eval('a.ptn[href*="awinmid=128211"]',a=>a.href);ok(/awinaffid=3154850&ued=https%3A%2F%2Felvoriquejewelry.com%2Fproducts%2F/.test(h),`${lang} : lien Awin correct`);
  await p.click('[data-elf="oreilles"]');await p.waitForTimeout(250);
  ok(await p.$$eval('a.ptn[href*="awinmid=128211"]',a=>a.length)>0,`${lang} : filtre boucles d’oreilles`);
  await p.click('[data-elplus]').catch(()=>{});await p.waitForTimeout(250);
  ok(await p.$$eval('a.ptn[href*="awinmid=128211"]',a=>a.length)>12,`${lang} : Voir plus`);
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);ok(!ov,`${lang} : pas de débordement à ${w}px`);
  if(lang==='fr')await p.screenshot({path:'/tmp/elv-'+lang+'.png'});
  await p.close();}
 ok(!errs.length,'aucune erreur JS '+errs.join(' | '));await b.close();process.exit(fails?1:0)})();
