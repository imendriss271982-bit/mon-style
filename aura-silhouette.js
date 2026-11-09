/* Diva Divina — Mesure automatique de la silhouette sur la photo en pied (v202, demandé par Imen :
   « القياس أوتوماتيكي بالنقاط، الحريفة ما تقيس شيء بيدها »).
   Le téléphone place 33 points sur le corps et trace le contour de la personne (MediaPipe Pose Landmarker de Google,
   gratuit, sur l'appareil ; la photo ne part pas pour cette étape). On mesure en pixels, au niveau du corps (sans les bras) :
   largeur des épaules, du buste, de la taille (le plus étroit) et des hanches (le plus large), puis on applique
   la même méthode que les mesures en cm (aura-corps.js : R_WE = taille / haut, R_HE = hanches / haut).
   Gemini ne décide plus la silhouette : il écrit seulement le Kibbe, les essences et les conseils pour la forme mesurée.
   Pour ajuster une règle : change un nombre dans SEUILS, puis augmente le ?v= de aura-silhouette.js dans index.html.
   classer() et mesurerMasque() n'utilisent pas le navigateur : testables dans Node (tests/silhouette.js). */
(function(root){
"use strict";

// Les largeurs vues de face ne sont pas des tours de poitrine/taille/hanches : seuils propres à la photo (à affiner avec de vraies photos).
const SEUILS={
 A:1.06,          // R_HE > 1,06 : hanches plus larges que le haut → Poire
 V:0.94,          // R_HE < 0,94 : haut plus large que les hanches → Triangle inversé
 X:0.76,          // R_WE ≤ 0,76 et haut ≈ hanches : taille marquée → Sablier
 O:0.96,          // R_WE ≥ 0,96 : volume au centre → Ronde
 O_doux:0.90,     // ou taille presque aussi large que le haut ET que les hanches (≥ 90 %) → Ronde
 buste_max:1.15,  // buste plus large que 115 % des épaules : les bras touchent sûrement le buste → on garde les épaules seules
 penche:7,        // épaules inclinées de plus de 7° : photo refusée (se tenir droite)
 profil:0.30,     // écart des épaules (points) < 30 % de la longueur du buste (épaules → hanches) : elle est de profil
 visible:0.5      // confiance minimale des points épaules, hanches, genoux
};

const ERR={
 cadre:"Je ne vois pas bien ta silhouette des épaules aux genoux. Recule un peu et reprends la photo.",
 droite:"Tiens-toi bien droite et de face, puis reprends la photo.",
 profil:"Tu es un peu de profil. Mets-toi bien de face, puis reprends la photo.",
 bras:"Tes bras touchent ton corps. Écarte-les un peu, puis reprends la photo."
};

const r2=x=>Math.round(x*100)/100;
const CM=()=>root.CORPS_MES||(typeof require==="function"?require("./aura-corps.js"):null);

// w = {epaules, poitrine (facultatif), taille, hanches} : largeurs dans la même unité (pixels).
function classer(w){
 const S=SEUILS;
 if(!(w&&w.epaules>0&&w.taille>0&&w.hanches>0))return null;
 const buste=w.poitrine>0&&w.poitrine<=w.epaules*S.buste_max?w.poitrine:0;
 const haut=buste?(w.epaules+buste)/2:w.epaules;
 const RWE=w.taille/haut,RHE=w.hanches/haut,WH=w.taille/w.hanches;
 let L;
 if(RWE>=S.O||(RWE>=S.O_doux&&WH>=S.O_doux))L="O";
 else if(RHE>S.A)L="A";
 else if(RHE<S.V)L="V";
 else if(RWE<=S.X)L="X";
 else L="H";
 return {lettre:L,ratios:{R_WE:r2(RWE),R_HE:r2(RHE)},RWE,RHE};
}

// Résultat au même format que l'analyse (forme, proportions, conseils, à éviter, hauteur si on la connaît).
function resultat(w,hauteur){
 const c=classer(w),C=CM();if(!c||!C)return null;
 const F=C.FORMES[c.lettre],h=Number(hauteur);
 const ht=h>0?(h<C.SEUILS.petite?"petite":h>C.SEUILS.grande?"grande":"moyenne"):"";
 return {lettre:c.lettre,forme:F.forme,ratios:c.ratios,
  proportions:"Tes hanches font "+Math.round(c.RHE*100)+" % de ton haut du corps, et ta taille "+Math.round(c.RWE*100)+" %.",
  conseils:F.conseils,a_eviter:F.a_eviter,hauteur:ht?C.HAUTEUR[ht]:"",
  largeurs:{epaules:Math.round(w.epaules),poitrine:Math.round(w.poitrine||0),taille:Math.round(w.taille),hanches:Math.round(w.hanches)}};
}

/* Mesure sur le contour. M = probabilité « personne » par pixel (0..1), largeur W, hauteur H.
   P = points du corps en pixels : P[i] = {x, y, v} (v = confiance). Indices MediaPipe :
   11/12 épaules, 13/14 coudes, 15/16 poignets, 23/24 hanches, 25/26 genoux. */
function mesurerMasque(M,W,H,P){
 const S=SEUILS,g=i=>P[i]||{x:0,y:0,v:0};
 for(const i of [11,12,23,24,25,26])if(!(g(i).v>=S.visible))return {erreur:ERR.cadre};
 const eG=g(11),eD=g(12),hG=g(23),hD=g(24);
 const angle=Math.abs(Math.atan2(eD.y-eG.y,eD.x-eG.x)*180/Math.PI);
 if(Math.min(angle,180-angle)>S.penche)return {erreur:ERR.droite};
 const dE=Math.hypot(eD.x-eG.x,eD.y-eG.y);
 const yS=(eG.y+eD.y)/2,yH=(hG.y+hD.y)/2,T=yH-yS;
 if(!(T>0))return {erreur:ERR.droite};
 if(dE<T*S.profil)return {erreur:ERR.profil};
 const xc=(eG.x+eD.x+hG.x+hD.x)/4;
 const on=(x,y)=>x>=0&&x<W&&y>=0&&y<H&&M[y*W+x]>=0.5;
 // Bande du corps sur la ligne y : la zone « personne » continue qui passe par le centre du corps.
 function bande(yf){const y=Math.round(yf);if(y<0||y>=H)return null;let x=Math.round(xc);
  if(!on(x,y)){let k=1;const lim=Math.round(W*0.08);while(k<=lim&&!on(x-k,y)&&!on(x+k,y))k++;if(k>lim)return null;x=on(x-k,y)?x-k:x+k}
  let l=x,r=x;while(on(l-1,y))l--;while(on(r+1,y))r++;return [l,r]}
 // Position du bras (épaule → coude → poignet) à la hauteur y, d'un côté.
 function brasX(a,b,c,y){const seg=[[a,b],[b,c]];for(const [p,q] of seg){if(!(p.v>=0.3&&q.v>=0.3))continue;
   if((p.y-y)*(q.y-y)<=0&&p.y!==q.y)return p.x+(q.x-p.x)*(y-p.y)/(q.y-p.y)}return null}
 // Le bras est-il collé au corps sur cette ligne ? (son tracé tombe dans la bande du corps)
 function colle(y,lr){for(const s of [[11,13,15],[12,14,16]]){const x=brasX(g(s[0]),g(s[1]),g(s[2]),y);if(x!=null&&x>lr[0]+2&&x<lr[1]-2)return true}return false}
 function zone(a,b,mode,bras){const n=12;const v=[];let touche=false;
  for(let i=0;i<=n;i++){const y=yS+T*(a+(b-a)*i/n),lr=bande(y);if(!lr)continue;if(bras&&colle(y,lr)){touche=true;continue}v.push(lr[1]-lr[0]+1)}
  if(!v.length)return {w:0,touche};
  v.sort((x,z)=>x-z);
  // Le plus étroit / le plus large, en écartant la valeur extrême (bruit du contour).
  const w=mode==="min"?v[Math.min(1,v.length-1)]:v[Math.max(0,v.length-2)];
  return {w,touche}}
 const ep=zone(0.04,0.10,"max",false);
 const bu=zone(0.18,0.32,"max",false); // bras collés au buste : écarté ensuite par buste_max
 const ta=zone(0.45,0.80,"min",true);
 const ha=zone(0.95,1.30,"max",true);
 if(!ep.w)return {erreur:ERR.cadre};
 if(!ta.w||!ha.w)return {erreur:(ta.touche||ha.touche)?ERR.bras:ERR.cadre};
 return {epaules:ep.w,poitrine:bu.w,taille:ta.w,hanches:ha.w};
}

/* ———————— Partie navigateur : placer les points, tracer le contour, mesurer ———————— */
const MP="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODELE="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task";
let pret=null;
function charger(){
 if(pret)return pret;
 pret=(async()=>{const v=await import(MP+"/vision_bundle.mjs");const fs=await v.FilesetResolver.forVisionTasks(MP+"/wasm");
  return v.PoseLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:MODELE,delegate:"CPU"},runningMode:"IMAGE",numPoses:1,outputSegmentationMasks:true})})();
 pret.catch(()=>{pret=null});
 return pret;
}
function image(file,max){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c)};
 im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error("photo"))};im.src=u})}
const CACHE=typeof WeakMap!=="undefined"?new WeakMap():null;
// Résultat : {forme, lettre, ratios, proportions, conseils, a_eviter, hauteur, largeurs} ;
// {erreur} si la photo ne permet pas de mesurer (de profil, bras collés…) ; null si l'outil n'a pas pu tourner (réseau).
function mesurer(file,hauteur,delai){
 if(!file)return Promise.resolve(null);
 const attente=t=>Promise.race([t,new Promise(ok=>setTimeout(()=>ok(null),delai||25000))]);
 if(CACHE&&CACHE.has(file))return attente(CACHE.get(file).then(m=>m&&!m.erreur&&m.w?resultat(m.w,hauteur):m));
 const travail=(async()=>{
  const [pl,cv]=await Promise.all([charger(),image(file,1024)]);
  const r=pl.detect(cv),lm=r&&r.landmarks&&r.landmarks[0],mk=r&&r.segmentationMasks&&r.segmentationMasks[0];
  if(!lm||!mk){if(r&&r.close)r.close();return lm?null:{erreur:ERR.cadre}}
  const W=mk.width,H=mk.height,M=mk.getAsFloat32Array().slice();if(r.close)r.close();
  const P=lm.map(p=>({x:p.x*W,y:p.y*H,v:p.visibility==null?1:p.visibility}));
  const w=mesurerMasque(M,W,H,P);
  return w.erreur?w:{w};
 })().catch(()=>null);
 if(CACHE)CACHE.set(file,travail);
 return attente(travail.then(m=>m&&!m.erreur&&m.w?resultat(m.w,hauteur):m));
}

const api={SEUILS,ERR,classer,resultat,mesurerMasque,mesurer,charger};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.SILHOUETTE=api;
})(typeof window!=="undefined"?window:globalThis);
