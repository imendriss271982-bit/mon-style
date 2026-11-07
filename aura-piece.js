/* v167 — « Coordonne-moi une tenue avec cette pièce » (principe d'Imen).
   Depuis la fiche d'une pièce de la garde-robe (ouverte depuis la garde-robe OU depuis une solution de l'Outfit check),
   la cliente choisit une occasion et Aura crée 2 tenues qui contiennent OBLIGATOIREMENT cette pièce,
   avec seulement les vraies pièces de sa garde-robe (ids vérifiés). Page P.g_piece, état S.pc.
   Chargé après aura-majlis.js. */
(function(){
if(typeof P==="undefined")return;
S.pc=S.pc||{id:"",occ:"",looks:[],busy:false,err:"",vus:[]};

const pcItem=()=>GR.items.find(i=>i.id===S.pc.id);
const pcOcc=()=>{const l=grOccs();return l.some(o=>o[0]===S.pc.occ)?S.pc.occ:l[0][0]};

function pcPrompt(x,o,vus){
 return REF+" Tu es styliste personnelle. La cliente veut porter CETTE pièce de sa garde-robe : « "+x.id+" : "+grCat(x.cat).toLowerCase()+", "+(x.nom||"")+(x.couleur?", "+x.couleur:"")+(x.type?", "+x.type:"")+" ». Crée 2 tenues différentes pour l’occasion « "+o[1]+" » ("+o[2]+")"+(typeof golfeRegle==="function"&&golfeRegle(o[0])?golfeRegle(o[0]):"")+". CHAQUE tenue contient OBLIGATOIREMENT la pièce "+x.id+", et UNIQUEMENT des pièces de sa garde-robe ci-dessous (utilise leurs identifiants). Chaque tenue : un haut et un bas, ou une robe, ou une abaya, plus si possible veste, chaussures, sac ou accessoire. Respecte son profil : "+(PROFIL()||"inconnu")+" (morphologie, couleurs de saison). "+(typeof pfRules==="function"?pfRules():"")+(vus.length?" Ne refais pas ces tenues déjà proposées : "+vus.join(" | ")+".":"")+" N’invente aucune pièce, aucune marque, aucun prix. Le conseil explique en une phrase pourquoi la pièce fonctionne dans cette tenue. Si une pièce manque pour bien finir la tenue, dis-le dans « manque » : achat facultatif.\nGarde-robe :\n"+grItemsTxt()+"\n"+FMT+'Format : {"tenues":[{"titre":"2 à 4 mots","pieces":["id"],"conseil":"1 phrase de styliste","manque":"pièce à acheter, ou vide"}]}';
}

async function pcCreer(){
 const x=pcItem(),o=GR_OCC.find(z=>z[0]===pcOcc());if(!x||!o||S.pc.busy)return;
 if(typeof isVip==="function"&&!isVip())return paywall("garde");
 if(GR.items.filter(i=>!i.wait).length<2){S.pc.err="Ajoute au moins une autre pièce à ta garde-robe pour que je puisse l’associer.";render(false);return}
 const sm=await getSample();if(!sm||!sm.json){toast("La création de tenues n’est pas disponible ici.");return}
 S.pc.busy=true;S.pc.err="";render(false);
 try{const r=await sm.json(pcPrompt(x,o,S.pc.vus));if(r&&r.erreur)throw new Error(r.erreur);
  const ids=new Set(GR.items.map(i=>i.id));
  const t=(r&&r.tenues||[]).map(z=>{let p=[...new Set((z.pieces||[]).map(String).filter(i=>ids.has(i)))];if(!p.includes(x.id))p.unshift(x.id);
   return {titre:String(z.titre||"Tenue"),pieces:p,conseil:String(z.conseil||""),manque:String(z.manque||"")}}).filter(z=>z.pieces.length>=2).slice(0,3);
  if(!t.length)throw new Error("Je n’ai pas trouvé de tenue avec cette pièce. Ajoute quelques pièces et réessaie.");
  S.pc.looks=t;S.pc.vus=[...S.pc.vus,...t.map(z=>z.titre)].slice(-12);S.pc.busy=false;
  if(S.page==="g_piece"){render(false);say("Voilà, "+NOM+". "+t[0].titre+" : "+t[0].conseil)}}
 catch(e){S.pc.busy=false;S.pc.err=errMsg(e);if(S.page==="g_piece"){render(false);say(S.pc.err)}}
}

P.g_piece=()=>{const x=pcItem();if(!x)return {back:true,html:`<h1>Article supprimé</h1>`,foot:`<button class="btn" data-view="garde">Retour à ma garde-robe</button>`};
 const occ=pcOcc(),by=id=>GR.items.find(i=>i.id===id);
 const sv=l=>GR.saved.some(t=>t.titre===l.titre&&t.pieces.join()===l.pieces.join());
 const looks=S.pc.looks.map((l,i)=>{const it=l.pieces.map(by).filter(Boolean);return `<article class="gr-look"><div class="gr-col n${Math.min(it.length,4)}">${it.slice(0,4).map(z=>grImg(z)).join("")}</div><b>${esc(l.titre)}</b><small>${it.map(z=>esc(z.nom||grCat(z.cat))).join(" · ")}</small><p>${esc(l.conseil)}</p>${l.manque?`<p class="gr-miss">Achat facultatif : ${esc(l.manque)}</p>`:""}<div class="gr-acts"><button type="button" data-pcsave="${i}" aria-pressed="${sv(l)}">${sv(l)?"♥ Enregistrée":"♡ Enregistrer"}</button></div></article>`}).join("");
 return {back:true,html:`<p class="step">Ma garde-robe</p><h1>Une tenue avec cette pièce</h1>
 <div class="pc-top">${grImg(x)}<div><b>${esc(x.nom||grCat(x.cat))}</b>${x.couleur?`<small>${esc(x.couleur)}</small>`:""}</div></div>
 <h2>Pour quelle occasion ?</h2>
 <div class="pk pc-occ">${grOccs().map(o=>`<button type="button" data-pcocc="${o[0]}" aria-pressed="${occ===o[0]}">${o[4]} ${o[1]}</button>`).join("")}</div>
 ${S.pc.err?`<div class="note">${esc(S.pc.err)}</div>`:""}
 ${S.pc.busy?`<div class="note">Je coordonne ta pièce avec ta garde-robe…</div>`:looks?`<div class="gr-looks">${looks}</div>`:""}`,
 say:S.pc.looks.length?"":"Choisis l’occasion, "+NOM+", et je te crée une tenue avec cette pièce.",
 foot:`<button class="btn" data-pcgo ${S.pc.busy?"disabled":""}>${S.pc.looks.length?"Autres idées":"Coordonne ma tenue"}</button>`}};
if(typeof DOCK_OF!=="undefined")DOCK_OF.g_piece="garde";

// Fiche d'une pièce : le bouton en premier, juste sous la photo.
if(P.g_item){const _i=P.g_item;P.g_item=()=>{const r=_i(),x=GR.items.find(i=>i.id===S.grItem);if(!x||x.wait||!r||typeof r.html!=="string")return r;
 const b=`<button type="button" class="btn pc-btn" data-pcopen="${x.id}">✨ Coordonne-moi une tenue avec cette pièce</button>`;
 const k=r.html.indexOf('<label class="lbl"');r.html=k>0?r.html.slice(0,k)+b+r.html.slice(k):r.html+b;return r}}

// Garde-robe : rappel sous « Mes articles ».
if(P.garde){const _g=P.garde;P.garde=a=>{const r=_g(a);if(a||!r||typeof r.html!=="string"||!GR.items.length)return r;
 r.html=r.html.replace(/(<h2>Mes articles <small class="gr-n">\d+<\/small><\/h2>)/,'$1<p class="pc-tip">✨ Touche une pièce : Aura te crée une tenue avec elle.</p>');return r}}

document.addEventListener("click",e=>{const t=e.target.closest("[data-pcopen],[data-pcocc],[data-pcgo],[data-pcsave]");if(!t)return;
 if(t.dataset.pcopen){if(S.pc.id!==t.dataset.pcopen)S.pc={id:t.dataset.pcopen,occ:S.pc.occ,looks:[],busy:false,err:"",vus:[]};go("g_piece");return}
 if(t.dataset.pcocc){if(S.pc.occ!==t.dataset.pcocc){S.pc.occ=t.dataset.pcocc;S.pc.looks=[];S.pc.vus=[];S.pc.err=""}const y=window.scrollY;render(false);window.scrollTo(0,y);return}
 if(t.hasAttribute("data-pcgo"))return pcCreer();
 if(t.dataset.pcsave){const l=S.pc.looks[+t.dataset.pcsave];if(!l)return;const k=GR.saved.findIndex(z=>z.titre===l.titre&&z.pieces.join()===l.pieces.join());
  if(k>=0){GR.saved.splice(k,1);toast("Tenue retirée")}else{GR.saved.unshift({id:Date.now().toString(36),titre:l.titre,pieces:[...l.pieces],conseil:l.conseil,manque:l.manque,occ:pcOcc(),jour:"",d:new Date().toISOString().slice(0,10)});toast("Tenue enregistrée")}
  grSave();const y=window.scrollY;render(false);window.scrollTo(0,y)}});

const st=document.createElement("style");st.textContent=`
.pc-btn{width:100%;margin:12px 0 6px}
.pc-top{display:flex;align-items:center;gap:14px;background:#fff;border-radius:16px;padding:10px;margin:10px 0 4px}
.pc-top img,.pc-top .gr-ph{width:72px;height:72px;object-fit:cover;border-radius:12px;flex:none;display:block}
.pc-top small{display:block;color:var(--mut,#6E6E6E);margin-top:2px}
.pc-occ{flex-wrap:wrap}
.pc-tip{font-size:13px;color:var(--accent);margin:-4px 0 10px}`;document.head.appendChild(st);
})();
