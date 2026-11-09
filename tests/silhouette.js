// Silhouette mesurée sur la photo (v202) : règles (classer) et mesure sur un contour dessiné (mesurerMasque).
// Lancer : node tests/silhouette.js
global.CORPS_MES=require('../aura-corps.js');
const S=require('../aura-silhouette.js');
const errs=[];const ok=(c,m)=>{console.log((c?'ok  ':'ERR ')+m);if(!c)errs.push(m)};

// 1. Règles sur des largeurs vues de face (pixels)
const cas=[
 ['Sablier',{epaules:120,poitrine:110,taille:80,hanches:118},'X · Sablier'],
 ['Poire',{epaules:100,poitrine:95,taille:80,hanches:125},'A · Poire'],
 ['Triangle inversé',{epaules:135,poitrine:125,taille:100,hanches:105},'V · Triangle inversé'],
 ['Rectangle',{epaules:115,poitrine:108,taille:95,hanches:112},'H · Rectangle'],
 ['Ronde',{epaules:120,poitrine:118,taille:118,hanches:122},'O · Ronde'],
];
for(const [nom,w,att] of cas){const r=S.resultat(w);ok(r&&r.forme===att,nom+' → '+(r&&r.forme)+' '+JSON.stringify(r&&r.ratios))}
ok(S.resultat(cas[0][1],158).hauteur===CORPS_MES.HAUTEUR.petite,'Hauteur du profil (158 cm) → conseil « petite »');
ok(S.resultat(cas[0][1]).hauteur==='','Sans hauteur connue : pas de conseil de hauteur inventé');
ok(S.classer({epaules:100,poitrine:160,taille:80,hanches:100}).ratios.R_WE===0.8,'Buste aberrant (bras collés) ignoré : épaules seules');

// 2. Mesure sur un contour dessiné : corps (largeurs choisies) + bras séparés du corps
function personne({ep,bu,ta,ha,brasColles,profil,penche}){
 const W=400,H=800,M=new Float32Array(W*H),xc=200,yS=200,yH=480,T=yH-yS;
 const largeur=y=>{const t=(y-yS)/T;
  if(t<0)return t>-0.15?ep*0.5:0;
  if(t<0.12)return ep; if(t<0.35)return ep+(bu-ep)*(t-0.12)/0.23; if(t<0.62)return bu+(ta-bu)*(t-0.35)/0.27;
  if(t<1.1)return ta+(ha-ta)*(t-0.62)/0.48; if(t<1.6)return ha*(1-(t-1.1)*0.6); return 0};
 for(let y=0;y<H;y++){const w=largeur(y);if(!w)continue;for(let x=Math.round(xc-w/2);x<=Math.round(xc+w/2);x++)M[y*W+x]=1}
 // bras : bande de 22 px, à 6 px du corps (ou collée)
 const brasX=[];
 for(let y=yS;y<yS+T*1.15;y++){const w=largeur(y),g=brasColles?-4:6;
  for(const s of [-1,1]){const x0=xc+s*(w/2+g);for(let k=0;k<22;k++){const x=Math.round(x0+s*k);if(x>=0&&x<W)M[y*W+x]=1}}}
 const ax=(y,s)=>xc+s*(largeur(y)/2+(brasColles?-4:6)+11);
 const dE=profil?ep*0.25:ep*0.42,tilt=penche?40:0;
 const P=[];for(let i=0;i<33;i++)P[i]={x:xc,y:yS,v:0};
 P[11]={x:xc-dE,y:yS-tilt/2,v:0.99};P[12]={x:xc+dE,y:yS+tilt/2,v:0.99};
 P[23]={x:xc-ha*0.3,y:yH,v:0.99};P[24]={x:xc+ha*0.3,y:yH,v:0.99};
 P[25]={x:xc-ha*0.25,y:yH+150,v:0.95};P[26]={x:xc+ha*0.25,y:yH+150,v:0.95};
 const yC=yS+T*0.6,yP=yS+T*1.1;
 P[13]={x:ax(yC,-1),y:yC,v:0.9};P[14]={x:ax(yC,1),y:yC,v:0.9};P[15]={x:ax(yP,-1),y:yP,v:0.9};P[16]={x:ax(yP,1),y:yP,v:0.9};
 return S.mesurerMasque(M,W,H,P);
}
let m=personne({ep:150,bu:140,ta:100,ha:150});
ok(m&&!m.erreur&&Math.abs(m.taille-100)<8&&Math.abs(m.hanches-150)<10,'Contour sablier : taille ≈ 100, hanches ≈ 150 ('+JSON.stringify(m)+')');
ok(m&&!m.erreur&&S.resultat(m).forme==='X · Sablier','Contour sablier → X · Sablier');
m=personne({ep:120,bu:115,ta:100,ha:160});
ok(m&&!m.erreur&&S.resultat(m).forme==='A · Poire','Contour poire → A · Poire ('+JSON.stringify(m)+')');
m=personne({ep:150,bu:140,ta:100,ha:150,brasColles:true});
ok(m&&m.erreur===S.ERR.bras,'Bras collés au corps → on demande de les écarter');
m=personne({ep:150,bu:140,ta:100,ha:150,profil:true});
ok(m&&m.erreur===S.ERR.profil,'De profil → on demande de se mettre de face');
m=personne({ep:150,bu:140,ta:100,ha:150,penche:true});
ok(m&&m.erreur===S.ERR.droite,'Épaules penchées → on demande de se tenir droite');
const P0=[];for(let i=0;i<33;i++)P0[i]={x:0,y:0,v:0.1};
ok(S.mesurerMasque(new Float32Array(4),2,2,P0).erreur===S.ERR.cadre,'Corps hors du cadre → on demande de reculer');

// 3. Traductions des messages
const src=require('fs').readFileSync(__dirname+'/../i18n.js','utf8');
for(const k in S.ERR)ok(src.includes('["'+S.ERR[k]+'"'),'Traduction présente : '+k);

if(!process.env.PAGE){if(errs.length){console.log('\n'+errs.length+' échec(s)');process.exit(1)}else console.log('\nTout est bon.')}

// 4. Dans l'app (PAGE=1, serveur python3 -m http.server 8765 lancé) : forme imposée à Gemini, badge « mesurée », photo refusée.
if(process.env.PAGE)(async()=>{
 const {chromium}=require('playwright');const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:820}});
 p.on('pageerror',e=>errs.push('pageerror: '+e.message));p.on('dialog',d=>d.dismiss());
 await p.goto('http://localhost:8765/');await p.evaluate(()=>{localStorage.clear();localStorage.setItem('monstyle',JSON.stringify({nom:'Test',lang:'fr',later:true,info:{taille:158},res:{}}))});
 await p.goto('http://localhost:8765/');await p.waitForTimeout(900);
 const r=await p.evaluate(async()=>{document.getElementById('splash')?.remove();window.say=()=>{};window.__pr=[];
  SAMPLE={json:async pr=>{__pr.push(pr);return {forme:'H · Rectangle',proportions:'x',kibbe:'Soft Classic',kibbe_pourquoi:'k',essences:['Classique'],conseils:'Marque ta taille.',a_eviter:'Le trop ample.'}}};
  SILHOUETTE.mesurer=async(f,h)=>SILHOUETTE.resultat({epaules:120,poitrine:110,taille:80,hanches:118},h);
  S.file.body=new File([new Uint8Array(10)],'b.jpg',{type:'image/jpeg'});S.flow=['c_run','r_corps'];S.hist=['home'];S.page='c_run';render(false);await run('c_run');
  await new Promise(ok=>setTimeout(ok,600));
  const ok1={pr:__pr.slice(-1)[0]||'',res:S.res.corps,page:S.page,txt:document.getElementById('page').innerText};
  SILHOUETTE.mesurer=async()=>({erreur:SILHOUETTE.ERR.bras});S.res.corps=null;__pr=[];S.flow=['c_run','r_corps'];S.page='c_run';render(false);await run('c_run');
  await new Promise(ok=>setTimeout(ok,300));
  return {...ok1,err:S.err,pr2:__pr.length}});
 ok(/DÉJÀ ÉTÉ MESURÉE.*X · Sablier/.test(r.pr),'Gemini reçoit la silhouette mesurée (X · Sablier)');
 ok(r.res&&r.res.forme==='X · Sablier'&&r.res.mesure_ok===1&&r.res.kibbe==='Soft Classic','Résultat : forme mesurée gardée, Kibbe de Gemini ('+(r.res&&r.res.forme)+')');
 ok(r.res&&r.res.hauteur===CORPS_MES.HAUTEUR.petite,'Hauteur du profil utilisée (158 cm)');
 ok(/mesurée sur ta photo/.test(r.txt),'Page résultat : « Forme mesurée sur ta photo »');
 ok(r.err===S.ERR.bras&&r.pr2===0,'Bras collés : message affiché, rien envoyé à Gemini');
 await b.close();
 if(errs.length){console.log('\n'+errs.length+' échec(s)');process.exit(1)}else console.log('\nApp : tout est bon.');
})();
