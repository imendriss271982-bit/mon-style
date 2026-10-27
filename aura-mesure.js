/* My Style — Mesure précise du visage (méthode « Quelle est la forme de mon visage ? » : A, B, C, D).
   Le téléphone place 478 points sur le visage (MediaPipe Face Landmarker de Google, gratuit, sur l'appareil),
   mesure A (longueur), B (front), C (pommettes), D (mâchoire), puis applique les règles ci-dessous.
   Gemini ne décide plus la forme : il écrit seulement les conseils pour la forme mesurée.
   Pour ajuster une règle : change un nombre dans SEUILS, puis augmente le ?v= de aura-mesure.js dans index.html.
   classer() n'utilise pas le navigateur : testable dans Node (tests/mesure.js). */
(function(root){
"use strict";

// Toutes les proportions sont rapportées à C (largeur des pommettes), car la photo mesure en pixels, pas en cm.
const SEUILS={
 egal:0.90,            // front et mâchoire « équivalents » aux pommettes : au moins 90 % de C
                       // (dans le cours, 5 / 5,2 / 4,7 cm sont jugés équivalents : la mâchoire y fait 90 % de C)
 tres_proche:0.95,     // « très proches » : front presque aussi large que les pommettes (visage cœur)
 court:1.20,           // A/C sous ce seuil : carré ou rond ; au-dessus : rectangle ou oblong
 ovale_long:[1.35,1.60],    // ovale : longueur environ 1,5 fois la largeur
 ovale_machoire:[0.78,0.90],// ovale : mâchoire plus étroite que front et pommettes
 coeur_machoire:0.85,  // cœur : mâchoire nettement plus étroite
 diamant_front:0.85,   // diamant : front étroit
 diamant_machoire:0.95,// diamant : pommettes plus larges que la mâchoire
 triangle_machoire:0.97,// triangle : mâchoire au moins aussi large que les pommettes…
 triangle_front:1.05,  // …et plus large que le front
 anguleux:0.80,        // largeur à mi-chemin mâchoire-menton / largeur de la mâchoire : au-dessus = mâchoire anguleuse
 de_face:0.08          // nez décalé de plus de 8 % de la largeur du visage = visage tourné, photo refusée
};

// Noms identiques à ceux de l'app (traductions dans i18n.js, make-up par forme dans mkFaceKey).
const FORMES={triangle:"Triangle",diamant:"Diamant",coeur:"Cœur",carre:"Carré",rond:"Rond",rect:"Rectangulaire",oblong:"Oblong",ovale:"Ovale"};

// Formes types pour les visages entre deux cases : on prend la plus proche (L=A/C, f=B/C, j=D/C).
const TYPES=[["ovale",1.45,0.92,0.84],["court",1.10,0.96,0.94],["long",1.50,0.96,0.94],["coeur",1.35,0.98,0.78],["diamant",1.35,0.80,0.86],["triangle",1.30,0.85,1.00]];

const r2=x=>Math.round(x*100)/100;
const entre=(x,[a,b])=>x>=a&&x<=b;

// m = {A,B,C,D,ang} (mêmes unités pour A à D ; ang = largeur bas du visage / D)
function classer(m){
 const S=SEUILS,{A,B,C,D}=m,ang=m.ang==null?0:m.ang;
 if(!(A>0&&B>0&&C>0&&D>0))return null;
 const L=A/C,f=B/C,j=D/C,anguleux=ang>=S.anguleux;
 let cle=null,regle="";
 if(j>=S.triangle_machoire&&D>=B*S.triangle_front){cle="triangle";regle="mâchoire la plus large, front plus étroit"}
 else if(f<S.diamant_front&&j<S.diamant_machoire){cle="diamant";regle="pommettes les plus larges, front étroit"}
 else if(f>=S.tres_proche&&j<S.coeur_machoire){cle="coeur";regle="front aussi large que les pommettes, mâchoire étroite"}
 else if(f>=S.egal&&j>=S.egal){
  if(L<S.court){cle=anguleux?"carre":"rond";regle="front, pommettes et mâchoire équivalents, visage aussi long que large, mâchoire "+(anguleux?"anguleuse":"douce")}
  else{cle=anguleux?"rect":"oblong";regle="front, pommettes et mâchoire équivalents, visage allongé, mâchoire "+(anguleux?"anguleuse":"douce")}}
 else if(f>j&&entre(L,S.ovale_long)&&entre(j,S.ovale_machoire)){cle="ovale";regle="front et pommettes plus larges que la mâchoire, longueur environ 1,5 fois la largeur"}
 else{ // entre deux cases : forme type la plus proche
  let best=null,bd=1e9;
  for(const [k,tl,tf,tj] of TYPES){const d=((L-tl)/0.15)**2+((f-tf)/0.06)**2+((j-tj)/0.06)**2;if(d<bd){bd=d;best=k}}
  cle=best==="court"?(anguleux?"carre":"rond"):best==="long"?(anguleux?"rect":"oblong"):best;
  regle="forme la plus proche de tes proportions"}
 return {cle,forme:FORMES[cle],regle,L:r2(L),f:r2(f),j:r2(j),anguleux,
  // ratios de la méthode d'Imen (affichés sur la page résultat)
  R_HL:r2(L),R_JW:r2(D/B),R_CH:r2(C/D)};
}

// Phrase « pourquoi » en français, citée telle quelle si Gemini ne répond pas.
function pourquoi(c){
 if(!c)return "";
 const p=x=>Math.round(x*100)+" %";
 return "Ton visage est "+String(c.forme).toLowerCase()+" : "+c.regle+". Mesures : longueur "+String(c.L).replace(".",",")+" fois la largeur, front "+p(c.f)+" et mâchoire "+p(c.j)+" de la largeur des pommettes.";
}

/* ———————— Partie navigateur : placer les points et mesurer ———————— */
const MP="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODELE="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
// Contour du visage (MediaPipe), du haut du front au menton par un côté, puis remontée par l'autre.
const OVAL=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const ia=OVAL.indexOf(152),COTE1=OVAL.slice(0,ia+1),COTE2=OVAL.slice(ia).concat(10);
let pret=null;
function charger(){
 if(pret)return pret;
 pret=(async()=>{const v=await import(MP+"/vision_bundle.mjs");const fs=await v.FilesetResolver.forVisionTasks(MP+"/wasm");
  return v.FaceLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:MODELE,delegate:"CPU"},runningMode:"IMAGE",numFaces:1})})();
 pret.catch(()=>{pret=null});
 return pret;
}
function image(file,max){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();
 im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c)};
 im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error("photo"))};im.src=u})}
// Largeur du visage à la hauteur y : on cherche où chaque côté du contour croise cette ligne.
function xA(P,cote,y){for(let i=0;i<cote.length-1;i++){const a=P[cote[i]],b=P[cote[i+1]];
 if((a[1]-y)*(b[1]-y)<=0&&a[1]!==b[1])return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1])}return null}
function largeur(P,y){const a=xA(P,COTE1,y),b=xA(P,COTE2,y);return a==null||b==null?0:Math.abs(a-b)}
function maxLargeur(P,y1,y2){let m=0;const n=24;for(let i=0;i<=n;i++)m=Math.max(m,largeur(P,y1+(y2-y1)*i/n));return m}
// Mesures à partir des 478 points (coordonnées en pixels, tête redressée).
function mesurer468(lm,W,H){
 let P=lm.map(p=>[p.x*W,p.y*H]);
 const t=Math.atan2(P[263][1]-P[33][1],P[263][0]-P[33][0]),cs=Math.cos(-t),sn=Math.sin(-t);
 P=P.map(([x,y])=>[x*cs-y*sn,x*sn+y*cs]);
 const yv=i=>P[i][1],yOeil=(yv(33)+yv(263))/2,ySourcil=(yv(105)+yv(334))/2,yMenton=yv(152),yMach=(yv(172)+yv(397))/2;
 const C=maxLargeur(P,yOeil,yv(2));                        // pommettes : entre les yeux et le bas du nez
 const B=maxLargeur(P,ySourcil-(ySourcil-yv(10))*0.5,ySourcil); // front : juste au-dessus des sourcils
 const D=Math.abs(P[397][0]-P[172][0]);                    // mâchoire : angles de la mâchoire
 // Naissance des cheveux : invisible pour l'outil ; estimée par les tiers du visage (front ≈ glabelle-nez).
 const A=Math.max(yMenton-yv(10),(yMenton-yv(9))+(yv(2)-yv(9)));
 const ang=D?largeur(P,yMach+(yMenton-yMach)*0.5)/D:0;    // le bas du visage reste-t-il large (anguleux) ?
 const centre=(P[234][0]+P[454][0])/2,tourne=C?Math.abs(P[1][0]-centre)/C:0;
 return {A,B,C,D,ang,tourne};
}
const CACHE=typeof WeakMap!=="undefined"?new WeakMap():null;
// Résultat : {forme, cle, L, f, j, R_HL, R_JW, R_CH, pourquoi} ; {erreur} si le visage est tourné ; null si l'outil n'a pas pu mesurer.
function mesurer(file,delai){
 if(!file)return Promise.resolve(null);
 // Si le réseau est lent, on n'attend pas : l'analyse continue sans la mesure.
 const attente=t=>Promise.race([t,new Promise(ok=>setTimeout(()=>ok(null),delai||20000))]);
 if(CACHE&&CACHE.has(file))return attente(CACHE.get(file));
 const travail=(async()=>{
  const [fl,cv]=await Promise.all([charger(),image(file,1280)]);
  const r=fl.detect(cv),lm=r&&r.faceLandmarks&&r.faceLandmarks[0];
  if(!lm)return null;
  const m=mesurer468(lm,cv.width,cv.height);
  if(m.tourne>SEUILS.de_face)return {erreur:"Ton visage est un peu tourné. Regarde bien l’objectif, de face, et reprends la photo."};
  const c=classer(m);if(!c)return null;
  return {...c,pourquoi:pourquoi(c),mesures:{A:r2(m.A),B:r2(m.B),C:r2(m.C),D:r2(m.D),ang:r2(m.ang)}};
 })().catch(()=>null);
 if(CACHE)CACHE.set(file,travail);
 return attente(travail);
}

const api={SEUILS,FORMES,classer,pourquoi,mesurer,charger,mesurer468};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.MESURE=api;
})(typeof window!=="undefined"?window:globalThis);
