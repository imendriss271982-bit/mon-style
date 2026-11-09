/* v171 — Tenues demandées à Diva = tenues de SA garde-robe, montrées sur la page « Créer une tenue » (choix d'Imen).
   Page Diva (écrit) : « fais-moi une tenue », « سوّي لي لبسة »… → rien dans la discussion : la page `tenues`
   s'ouvre sur l'occasion demandée et Diva y ajoute UNE tenue faite avec les vraies pièces (ids vérifiés), en tête de
   GR.looks[occ]. Elle y a les boutons habituels (Enregistrer, 👍/👎, Autre version, 💬 À une amie) : le partage
   au Majlis seulement si elle le choisit. Garde-robe trop petite → la même page l'invite à ajouter ses vêtements.
   Appel vocal et chat ElevenLabs : règle ajoutée au contexte (CATCTX) : une tenue = seulement ses pièces.
   Chargé après aura-piece.js. */
(function(){
if(typeof send!=="function")return;

// Demande de tenue (création), pas une question sur une photo.
const CL_DEM=[
 /\b(cr[ée]e|fais|propose|compose|trouve|donne|choisis|pr[ée]pare|coordonne)[-\s]*(moi|m['’])?\b.{0,40}\b(tenue|look|outfit|ensemble)/i,
 /\b(que|quoi)\s+(porter|mettre)\b/i,/\bje\s+mets\s+quoi\b/i,
 /\b(make|create|give|suggest|style|pick|build|put together)\b.{0,30}\b(outfit|look)\b/i,/\bwhat\s+(should|to|do)\s+i\s+wear\b/i,
 /(سو[ّ]?ي|سويلي|سوي\s*لي|اعمل[يى]?\s*لي|اعمليلي|نس[ّ]?قي?\s*لي|نسقيلي|اقترحي?\s*(علي|لي)|اختاري?\s*لي|عطيني|ادّيني).{0,30}(لبس|لبسة|لبسه|اوتفيت|أوتفيت|outfit|طقم|لوك|ستايل)/,
 /(شو|شنو|وش|ايش|إيش|شن)\s*(ألبس|البس|نلبس)/,/شنلبس|شنلبسو/
];
const clDemande=t=>CL_DEM.some(r=>r.test(t||""));
const CL_OCC=[["soiree",/soir[ée]e|\bce soir\b|d[îi]ner|evening|night|party|سهر|عشا|حفل/i],["mariage",/mariage|wedding|عرس|زفاف/i],["travail",/travail|bureau|r[ée]union|work|office|meeting|دوام|شغل|خدمة|اجتماع|مكتب/i],
 ["weekend",/week-?end|ويكند|ويك اند|café|coffee|shopping|مول/i],["voyage",/voyage|travel|trip|سفر|سفرة/i],["ramadan",/ramadan|iftar|ghabga|رمضان|فطور|غبقة/i],["aid",/a[ïi]d|eid|عيد/i]];
const clOcc=t=>{for(const [k,r] of CL_OCC)if(r.test(t||""))return k;return "quotidien"};
const clPieces=()=>GR.items.filter(x=>!x.wait);

function clPrompt(t,o){
 return REF_TENUE+" Tu es sa styliste personnelle. Elle te demande : « "+t+" ». Compose UNE tenue pour l’occasion « "+o[1]+" » ("+o[2]+")"+(typeof golfeRegle==="function"&&golfeRegle(o[0])?golfeRegle(o[0]):"")+" UNIQUEMENT avec les pièces de sa garde-robe ci-dessous (utilise leurs identifiants exacts) : un haut et un bas, ou une robe, ou une abaya, plus si possible veste, chaussures, sac ou accessoire. Si elle cite une pièce précise, mets-la dans la tenue. Respecte son profil : "+(PROFIL()||"inconnu")+". "+(typeof pfRules==="function"?pfRules():"")+" N’invente aucune pièce, aucune marque, aucun prix et ne lui dis jamais d’acheter. Le conseil : 1 phrase chaleureuse qui dit pourquoi la tenue lui va.\nGarde-robe :\n"+grItemsTxt()+"\n"+FMT+'Format : {"titre":"2 à 4 mots","pieces":["id"],"conseil":"1 phrase"}';
}

async function clTenue(text){
 const o=GR_OCC.find(x=>x[0]===clOcc(text))||GR_OCC[0];
 S.draft="";S.grOcc=o[0];S.grErr="";
 if(clPieces().length<3){go("tenues");return}
 S.grBusy=o[0];go("tenues");
 try{const sm=await getSample();if(!sm||!sm.json)throw new Error("La création de tenues n’est pas disponible ici.");
  const r=await sm.json(clPrompt(text,o));if(r&&r.erreur)throw new Error(r.erreur);
  const ids=new Set(clPieces().map(x=>x.id)),p=[...new Set((r&&r.pieces||[]).map(String).filter(i=>ids.has(i)))];
  if(p.length<2)throw new Error("Je n’ai pas réussi à composer une tenue avec ta garde-robe. Réessaie, ou ajoute quelques pièces.");
  const l={titre:String(r.titre||"Ta tenue"),pieces:p,conseil:String(r.conseil||""),manque:""};
  GR.looks[o[0]]=[l,...(GR.looks[o[0]]||[]).filter(x=>x.pieces.join()!==p.join())].slice(0,6);grSave();
  S.grBusy=null;if(S.page==="tenues"){render(false);window.scrollTo(0,0);say(l.titre+". "+l.conseil)}}
 catch(e){S.grBusy=null;S.grErr=typeof errMsg==="function"?errMsg(e):"Une erreur est survenue. Réessaie.";if(S.page==="tenues"){render(false);say(S.grErr)}}
}

const _send=send;
send=async function(text){const t=(text||"").trim();
 if(t&&!S.busy&&!S.cphoto&&!S.grBusy&&clDemande(t)&&typeof GR!=="undefined"){if(typeof msgLeft==="function"&&msgLeft()<=0)return paywall("chat");if(typeof useMsg==="function")useMsg();return clTenue(t)}
 return _send(text)};
window.send=send;

// Voix et chat ElevenLabs : une tenue = seulement ses pièces.
if(typeof CATCTX==="function"){const _c=CATCTX;CATCTX=function(v){return _c(v)+" RÈGLE TENUES : quand elle te demande une tenue, compose-la UNIQUEMENT avec les pièces de sa garde-robe listées dans son profil, en les nommant (« ton blazer beige… ») ; ne lui dis pas d’acheter. Si sa garde-robe est vide ou presque, invite-la à prendre ses vêtements en photo dans l’onglet Garde-robe."};window.CATCTX=CATCTX}

window.clDemande=clDemande;window.clOcc=clOcc;
})();
