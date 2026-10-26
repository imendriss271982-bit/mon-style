// Touche chaque bouton de chaque page principale et signale ceux qui plantent ou ne font rien.
module.exports=async(p,errs,report)=>{
 for(const pg of ['home','boutique','beaute','profil','garde','news']){
  const n=await p.evaluate(x=>{S.hist=[];go(x);return document.querySelectorAll('#page button').length},pg);
  for(let i=0;i<n;i++){
   await p.evaluate(x=>{S.hist=[];S.flow=null;go(x)},pg);await p.waitForTimeout(120);
   const info=await p.evaluate(i=>{const bt=document.querySelectorAll('#page button')[i];if(!bt)return null;const a=[...bt.attributes].map(x=>x.name).filter(x=>x.startsWith('data-')).join(' ');return {a,t:bt.textContent.trim().slice(0,40),dis:bt.disabled}},i);
   if(!info||info.dis||/data-wipe|data-call|data-acam|data-mktry|data-buy|data-essai/.test(info.a))continue;
   const before=await p.evaluate(()=>S.page+'|'+document.querySelector('#page').innerHTML.length);
   const e0=errs.length;
   try{await p.evaluate(i=>document.querySelectorAll('#page button')[i].click(),i)}catch(e){errs.push(pg+' #'+i+' '+e.message)}
   await p.waitForTimeout(250);
   const after=await p.evaluate(()=>S.page+'|'+document.querySelector('#page').innerHTML.length);
   if(errs.length>e0)errs[errs.length-1]+=`  [page ${pg}, bouton « ${info.t} » ${info.a}]`;
   if(before===after&&!/data-say|data-replay|data-play/.test(info.a))report.push(`  inerte? ${pg} « ${info.t} » ${info.a}`);
  }}
};
