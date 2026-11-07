/* v170 — Tenues demandées à Aura = tenues de SA garde-robe (choix d'Imen).
   1) Page Aura (écrit) : « fais-moi une tenue », « سوّي لي لبسة »… → Aura compose UNE tenue avec les vraies pièces
      de la garde-robe digitale (ids vérifiés) et la montre dans la discussion avec les photos des pièces.
      Garde-robe trop petite → elle invite à photographier ses vêtements.
   2) Appel vocal et chat ElevenLabs : règle ajoutée au contexte (CATCTX) : une tenue = seulement ses pièces.
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
const CL_OCC=[["soiree",/soir[ée]e|d[îi]ner|evening|night|party|سهر|عشا|حفل/i],["mariage",/mariage|wedding|عرس|زفاف|عرسه/i],["travail",/travail|bureau|r[ée]union|work|office|meeting|دوام|شغل|خدمة|اجتماع|مكتب/i],
 ["weekend",/week-?end|ويكند|ويك اند|كافي|café|coffee|shopping|مول/i],["voyage",/voyage|travel|trip|سفر|سفرة/i],["ramadan",/ramadan|iftar|ghabga|رمضان|فطور|غبقة/i],["aid",/a[ïi]d|eid|عيد/i]];
const clOcc=t=>{for(const [k,r] of CL_OCC)if(r.test(t||""))return k;try{if(typeof jrOccDefaut==="function")return jrOccDefaut()}catch(e){}return "quotidien"};
const clPieces=()=>GR.items.filter(x=>!x.wait);

function clPrompt(t,o){
 return REF+" Tu es sa styliste personnelle. Elle te demande : « "+t+" ». Compose UNE tenue pour l’occasion « "+o[1]+" » ("+o[2]+")"+(typeof golfeRegle==="function"&&golfeRegle(o[0])?golfeRegle(o[0]):"")+" UNIQUEMENT avec les pièces de sa garde-robe ci-dessous (utilise leurs identifiants exacts) : un haut et un bas, ou une robe, ou une abaya, plus si possible veste, chaussures, sac ou accessoire. Si elle cite une pièce précise, mets-la dans la tenue. Respecte son profil : "+(PROFIL()||"inconnu")+". "+(typeof pfRules==="function"?pfRules():"")+" N’invente aucune pièce, aucune marque, aucun prix et ne lui dis jamais d’acheter. Le conseil : 1 phrase chaleureuse qui dit pourquoi la tenue lui va.\nGarde-robe :\n"+grItemsTxt()+"\n"+FMT+'Format : {"titre":"2 à 4 mots","pieces":["id"],"conseil":"1 phrase"}';
}

async function clTenue(text){
 S.chat.push({r:"u",t:text},{r:"a",t:""});S.draft="";S.busy=true;render(false);
 const last=S.chat[S.chat.length-1];
 try{
  if(clPieces().length<3){last.t=tr("Pour te créer une tenue, j’ai besoin de tes vrais vêtements. Prends-les en photo dans ta garde-robe, et je les coordonne pour toi.");last.gogarde=1}
  else{const o=GR_OCC.find(x=>x[0]===clOcc(text))||GR_OCC[0];const sm=await getSample();if(!sm||!sm.json)throw new Error("La création de tenues n’est pas disponible ici.");
   const r=await sm.json(clPrompt(text,o));if(r&&r.erreur)throw new Error(r.erreur);
   const ids=new Set(clPieces().map(x=>x.id)),p=[...new Set((r&&r.pieces||[]).map(String).filter(i=>ids.has(i)))];
   if(p.length<2)throw new Error("Je n’ai pas réussi à composer une tenue avec ta garde-robe. Réessaie, ou ajoute quelques pièces.");
   last.t=String(r.titre||"Ta tenue")+" : "+String(r.conseil||"");last.look={titre:String(r.titre||"Ta tenue"),pieces:p,conseil:String(r.conseil||""),manque:"",occ:o[0]}}
 }catch(e){last.t=typeof errMsg==="function"?errMsg(e):"Une erreur est survenue. Réessaie."}
 S.busy=false;try{save()}catch(e){}if(S.page==="chat"){render(false);if(last.t)say(last.t)}
}

// Carte de la tenue dans la discussion : photos des vraies pièces + Enregistrer.
window.clLookHTML=c=>{
 if(c.gogarde)return `<button type="button" class="btn cl-go" data-go="garde">📷 Photographier mes vêtements</button>`;
 const l=c.look;if(!l||!Array.isArray(l.pieces))return "";const it=l.pieces.map(id=>GR.items.find(x=>x.id===id)).filter(Boolean);if(!it.length)return "";
 const sv=GR.saved.some(t=>t.pieces.join()===l.pieces.join());
 return `<div class="cl-look"><div class="gr-col n${Math.min(it.length,4)}">${it.slice(0,4).map(x=>grImg(x)).join("")}</div><small>${it.map(x=>esc(x.nom||grCat(x.cat))).join(" · ")}</small><button type="button" class="cl-sv" data-clsave="${S.chat.indexOf(c)}" aria-pressed="${sv}">${sv?"♥ Enregistrée":"♡ Enregistrer"}</button></div>`};

const _send=send;
send=async function(text){const t=(text||"").trim();
 if(t&&!S.busy&&!S.cphoto&&clDemande(t)&&typeof GR!=="undefined"){if(typeof msgLeft==="function"&&msgLeft()<=0)return paywall("chat");if(typeof useMsg==="function")useMsg();return clTenue(t)}
 return _send(text)};
window.send=send;

document.addEventListener("click",e=>{const b=e.target.closest("[data-clsave]");if(!b)return;const c=S.chat[+b.dataset.clsave],l=c&&c.look;if(!l)return;
 const k=GR.saved.findIndex(z=>z.pieces.join()===l.pieces.join());
 if(k>=0){GR.saved.splice(k,1);toast("Tenue retirée")}else{GR.saved.unshift({id:Date.now().toString(36),titre:l.titre,pieces:[...l.pieces],conseil:l.conseil,manque:"",occ:l.occ||"quotidien",jour:"",d:new Date().toISOString().slice(0,10)});toast("Tenue enregistrée")}
 grSave();const y=window.scrollY;render(false);window.scrollTo(0,y)});

// Voix et chat ElevenLabs : une tenue = seulement ses pièces.
if(typeof CATCTX==="function"){const _c=CATCTX;CATCTX=function(v){return _c(v)+" RÈGLE TENUES : quand elle te demande une tenue, compose-la UNIQUEMENT avec les pièces de sa garde-robe listées dans son profil, en les nommant (« ton blazer beige… ») ; ne lui dis pas d’acheter. Si sa garde-robe est vide ou presque, invite-la à prendre ses vêtements en photo dans l’onglet Garde-robe."};window.CATCTX=CATCTX}

const st=document.createElement("style");st.textContent=`
.cl-look{margin-top:10px;background:#fff;border-radius:14px;padding:8px}
.cl-look .gr-col{border-radius:10px;overflow:hidden}
.cl-look small{display:block;color:var(--mut,#6E6E6E);margin:6px 2px;font-size:12px}
.cl-sv{border:1px solid #E6E6E6;background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer;color:var(--accent)}
.cl-go{margin-top:10px;width:100%}`;document.head.appendChild(st);
window.clDemande=clDemande;window.clOcc=clOcc;
})();
