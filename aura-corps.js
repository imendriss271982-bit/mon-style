/* My Style — Morphologie avec les mesures de la cliente (sans photo).
   Elle donne : hauteur (cm), tour de poitrine, tour de taille, tour de hanches, largeur d'épaules (cm).
   On applique la méthode d'Imen (aura-methode.js, MORPHOLOGIE) : R_WE = taille / épaules, R_HE = hanches / épaules.
   « Épaules » = moyenne du tour de poitrine et de la largeur d'épaules ramenée à un tour (× EPAULE_TOUR),
   pour que des épaules larges comptent même avec une petite poitrine.
   Pour ajuster une règle : change un nombre dans SEUILS, puis augmente le ?v= de aura-corps.js dans index.html.
   Aucune dépendance au navigateur : testable dans Node (tests/corps.js). Les textes sont en français ;
   leurs traductions sont dans i18n.js (l'app les traduit à l'affichage et pour la voix). */
(function(root){
"use strict";

const SEUILS={
 EPAULE_TOUR:2.4,   // largeur d'épaules (dos, d'une pointe à l'autre) × 2,4 ≈ tour du haut du corps (ex. 39 cm → 94 cm)
 A:1.05,            // R_HE > 1,05 : hanches plus larges que le haut → Poire
 V:0.95,            // R_HE < 0,95 : haut plus large que les hanches → Triangle inversé
 X:0.75,            // R_WE ≤ 0,75 et haut ≈ hanches : taille marquée → Sablier
 O:1.00,            // R_WE ≥ 1,00 : volume au centre → Ronde
 O_doux:0.92,       // ou taille presque aussi large que le haut ET que les hanches (≥ 92 %) → Ronde
 petite:160,        // hauteur sous ce seuil : conseils « petite »
 grande:172         // hauteur au-dessus : conseils « grande »
};

// Limites raisonnables (cm). En dehors : on demande de vérifier la mesure.
const BORNES={hauteur:[120,220],poitrine:[60,180],taille:[45,180],hanches:[60,190],epaules:[25,65]};

// Même format que l'analyse par photo (lettre · nom). « Ronde » = O (Pomme dans la vitrine de la boutique).
const FORMES={
 X:{forme:"X · Sablier",conseils:"Marque ta taille : robes portefeuille, ceintures, tailles hautes et matières qui suivent tes courbes.",a_eviter:"Les coupes droites et très amples qui cachent ta taille."},
 A:{forme:"A · Poire",conseils:"Attire le regard vers le haut : encolures bateau, couleurs claires et détails en haut, pantalons droits ou évasés, jupes trapèze.",a_eviter:"Les bas moulants très clairs et les détails sur les hanches."},
 V:{forme:"V · Triangle inversé",conseils:"Équilibre en bas : jupes trapèze, pantalons larges, couleurs et motifs en bas, hauts simples à col V.",a_eviter:"Les épaulettes, les manches bouffantes et les encolures bateau."},
 H:{forme:"H · Rectangle",conseils:"Crée des courbes : ceintures, péplums, volants, jupes évasées et superpositions.",a_eviter:"Les robes droites sans forme et les coupes trop carrées."},
 O:{forme:"O · Ronde",conseils:"Allonge et fluidifie : col V, coupe empire, tissus fluides, vestes longues ouvertes, et mets tes jambes en valeur.",a_eviter:"Les ceintures serrées à la taille et les matières épaisses ou brillantes au centre."}
};
const HAUTEUR={
 petite:"Tu es plutôt petite : préfère les tailles hautes, les tenues d’une seule couleur et les longueurs au genou ou à la cheville pour t’allonger.",
 moyenne:"Ta hauteur est moyenne : tu peux jouer avec toutes les longueurs, en gardant la taille bien placée.",
 grande:"Tu es plutôt grande : tu peux porter les longueurs maxi, les pantalons larges et les contrastes haut / bas sans te raccourcir."
};

const r2=x=>Math.round(x*100)/100;
// Nombre à partir d'un texte (« 92,5 » accepté). Rien ou invalide → NaN.
const num=v=>{const s=String(v==null?"":v).replace(",",".").trim();return s===""?NaN:Number(s)};

// Vérifie les 5 mesures. Renvoie {ok:true, m} ou {ok:false, champ, erreur}.
function verifier(d){const m={};
 for(const k of Object.keys(BORNES)){const v=num(d&&d[k]);const [lo,hi]=BORNES[k];
  if(!isFinite(v))return {ok:false,champ:k,erreur:"vide"};
  if(v<lo||v>hi)return {ok:false,champ:k,erreur:"hors",min:lo,max:hi};
  m[k]=Math.round(v*10)/10}
 if(m.taille>m.hanches*1.3||m.taille>m.poitrine*1.3)return {ok:false,champ:"taille",erreur:"hors",min:BORNES.taille[0],max:BORNES.taille[1]};
 return {ok:true,m}}

// Classe la silhouette. m = {hauteur, poitrine, taille, hanches, epaules} en cm (déjà vérifiées).
function classer(m){const S=SEUILS;
 const haut=(m.poitrine+m.epaules*S.EPAULE_TOUR)/2;
 const RWE=m.taille/haut,RHE=m.hanches/haut,WH=m.taille/m.hanches;
 let L;
 if(RWE>=S.O||(RWE>=S.O_doux&&WH>=S.O_doux))L="O";
 else if(RHE>S.A)L="A";
 else if(RHE<S.V)L="V";
 else if(RWE<=S.X)L="X";
 else L="H";
 const ht=m.hauteur<S.petite?"petite":m.hauteur>S.grande?"grande":"moyenne";
 const F=FORMES[L];
 return {lettre:L,forme:F.forme,ratios:{R_WE:r2(RWE),R_HE:r2(RHE)},
  proportions:"Tes hanches font "+Math.round(RHE*100)+" % de ton haut du corps, et ta taille "+Math.round(RWE*100)+" %.",
  conseils:F.conseils,a_eviter:F.a_eviter,hauteur:HAUTEUR[ht],grandeur:ht}}

// Résultat complet, au même format que l'analyse par photo (sans Kibbe : il se lit sur une photo).
function resultat(d){const v=verifier(d);if(!v.ok)return v;const c=classer(v.m);
 return {ok:true,res:{forme:c.forme,ratios:c.ratios,proportions:c.proportions,conseils:c.conseils,a_eviter:c.a_eviter,hauteur:c.hauteur,src:"mesures",mes:v.m}}}

const API={SEUILS,BORNES,FORMES,HAUTEUR,verifier,classer,resultat};
if(typeof module!=="undefined"&&module.exports)module.exports=API;else root.CORPS_MES=API;
})(typeof window!=="undefined"?window:this);
