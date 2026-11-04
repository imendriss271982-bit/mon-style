/* My Style — v147 (choix d'Imen)
   1) Garde-robe : une seule photo peut contenir plusieurs pièces. Gemini repère chaque pièce (cadre box_2d),
      le téléphone la découpe, enlève le fond uni (sans IA, sur le téléphone) et range chaque pièce à part,
      avec son type précis (« Blazer long », « Robe blazer », « Blazer court »…) que la cliente peut corriger.
   2) Outfit check : plus de liste d'erreurs. Aura donne la note + des SOLUTIONS (changer / ajouter),
      en cherchant d'abord dans la garde-robe (« tu l'as déjà ») ; sinon un achat facultatif → Boutique.
   Chargé après aura-focus.js. Testable : node tests/multi.js */

// Types précis par catégorie : guident Gemini (il peut en écrire un autre s'il le faut).
const GR_TYPES={
 veste:["Blazer long","Blazer court","Blazer oversize","Blazer cintré","Trench","Manteau","Gilet sans manches","Cardigan","Veste en jean","Perfecto","Veste courte","Kimono"],
 robe:["Robe blazer","Robe chemise","Robe portefeuille","Robe droite","Robe trapèze","Robe fourreau","Robe longue","Robe midi","Robe courte","Robe de soirée","Combinaison"],
 haut:["Chemise","Blouse","T-shirt","Débardeur","Pull","Col roulé","Crop top","Body","Top habillé","Sweat"],
 pantalon:["Pantalon droit","Pantalon large","Pantalon cigarette","Pantalon à pinces","Jean slim","Jean droit","Jean large","Jogging","Short","Legging"],
 jupe:["Jupe crayon","Jupe plissée","Jupe trapèze","Jupe longue","Jupe midi","Mini-jupe","Jupe portefeuille"],
 abaya:["Abaya ouverte","Abaya fermée","Abaya kimono","Abaya ceinturée","Abaya brodée"],
 chaussures:["Escarpins","Sandales","Sandales à talons","Mules","Baskets","Bottines","Bottes","Ballerines","Mocassins"],
 sac:["Sac à main","Pochette","Cabas","Sac bandoulière","Mini-sac","Sac à dos"],
 accessoire:["Ceinture","Foulard","Sheila","Collier","Boucles d'oreilles","Bracelet","Montre","Lunettes de soleil","Chapeau","Bague"]};
const GR_MAXP=8;

const PR_MULTI=()=>"Tu es styliste. Voici une photo de la garde-robe d’une cliente : elle peut contenir UNE ou PLUSIEURS pièces (posées à plat, sur un cintre, ou portées). Repère CHAQUE pièce séparément (vêtement, chaussures — une paire = une pièce —, sac, accessoire), "+GR_MAXP+" au maximum, les plus visibles d’abord. Ignore le décor, les cintres, les meubles et la personne. Pour chaque pièce, donne son cadre box_2d = [ymin, xmin, ymax, xmax] en entiers de 0 à 1000 (relatif à la photo), bien serré autour de la pièce entière. "+
 "Catégorie parmi : haut, pantalon, jupe, robe, veste, abaya, chaussures, sac, accessoire (un jean ou un short = pantalon, une combinaison ou une robe blazer = robe, un gilet ou un manteau = veste). "+
 "Donne aussi son type précis, comme une styliste : "+Object.keys(GR_TYPES).map(k=>k+" → "+GR_TYPES[k].join(", ")).join(" ; ")+". Choisis le plus juste (longueur, coupe) ; un autre type est permis s’il est plus exact. "+
 "Donne aussi rot = la rotation (0, 90, 180 ou 270 degrés, dans le sens des aiguilles d’une montre) à appliquer à la pièce pour la mettre à l’endroit, comme dans une boutique : col, épaules ou taille en haut, ourlet et jambes en bas ; sac debout, anse en haut ; chaussures posées sur leur semelle. rot = 0 si elle est déjà droite. "+
 "S’il n’y a aucun vêtement, réponds {\"erreur\":\"Je ne vois pas de vêtement sur cette photo.\"}. "+FMT+
 "Format : {\"pieces\":[{\"box_2d\":[0,0,1000,1000],\"rot\":0,\"categorie\":\"\",\"type\":\"type précis\",\"nom\":\"2 à 4 mots, ex. Blazer long beige\",\"couleur\":\"1 à 2 mots\",\"hex\":\"#RRGGBB couleur dominante\",\"matiere\":\"1 mot ou vide\",\"style\":\"1 mot : classique, casual, chic, sport, romantique, bohème…\"}]}";

// Nettoie la réponse de Gemini. Ancien format (une seule pièce, sans cadre) accepté.
function grPieces(r){if(!r||typeof r!=="object"||r.erreur)return [];
 const raw=Array.isArray(r.pieces)?r.pieces:(r.categorie?[r]:[]);
 const ok=raw.filter(p=>p&&typeof p==="object").map(p=>{
  let b=Array.isArray(p.box_2d)&&p.box_2d.length===4?p.box_2d.map(Number):null;
  if(b&&b.every(n=>isFinite(n))){b=b.map(n=>Math.max(0,Math.min(1000,n)));if(b[2]-b[0]<25||b[3]-b[1]<25)b=null}else b=null;
  const cat=GR_CATS.some(c=>c[0]===p.categorie)&&p.categorie!=="bas"?p.categorie:"haut";
  return {box:b,rot:[90,180,270].includes(+p.rot)?+p.rot:0,cat,type:String(p.type||"").slice(0,30),nom:String(p.nom||"").slice(0,40),couleur:String(p.couleur||"").slice(0,24),
   hex:/^#[0-9a-f]{6}$/i.test(p.hex||"")?p.hex:"",matiere:String(p.matiere||"").slice(0,20),style:String(p.style||"").slice(0,20)}});
 // Deux cadres presque identiques = la même pièce : on n'en garde qu'un.
 const out=[];for(const p of ok){if(p.box&&out.some(q=>q.box&&grIoU(p.box,q.box)>.8))continue;out.push(p);if(out.length>=GR_MAXP)break}
 return out}
function grIoU(a,b){const y0=Math.max(a[0],b[0]),x0=Math.max(a[1],b[1]),y1=Math.min(a[2],b[2]),x1=Math.min(a[3],b[3]);
 const i=Math.max(0,y1-y0)*Math.max(0,x1-x0),u=(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-i;return u>0?i/u:0}

// Détourage sans IA : on part des bords du cadre et on enlève tout ce qui ressemble à la couleur du fond.
// Fond trop chargé (bords de couleurs très différentes) → on garde la découpe telle quelle, sans abîmer la pièce.
// Fonction pure sur des pixels RGBA : testable dans Node.
function grMasque(d,w,h){const n=w*h,bd=[];
 for(let x=0;x<w;x++){bd.push(x,(h-1)*w+x)}for(let y=1;y<h-1;y++){bd.push(y*w,y*w+w-1)}
 const ch=k=>bd.map(i=>d[i*4+k]).sort((a,b)=>a-b),med=k=>{const s=ch(k);return s[s.length>>1]};
 const bg=[med(0),med(1),med(2)],dist=i=>Math.hypot(d[i*4]-bg[0],d[i*4+1]-bg[1],d[i*4+2]-bg[2]);
 const dv=bd.map(dist).sort((a,b)=>a-b),p80=dv[Math.floor(dv.length*.8)];
 if(p80>45)return null;                                   // fond chargé : pas de détourage
 const tol=Math.max(26,Math.min(48,p80*2+14)),m=new Uint8Array(n),q=new Int32Array(n);let a=0,z=0;
 for(const i of bd)if(!m[i]&&dist(i)<tol){m[i]=1;q[z++]=i}
 while(a<z){const i=q[a++],x=i%w,y=(i-x)/w;
  for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!m[j]&&dist(j)<tol){m[j]=1;q[z++]=j}}
 const part=z/n;if(part<.03||part>.92)return null;          // rien trouvé, ou la pièce a la couleur du fond
 return m}

function grImage(file){return new Promise((ok,ko)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error("photo"))};im.src=u})}
// Découpe une pièce (cadre 0–1000), détoure, recadre au plus près, pose sur blanc (comme les autres vignettes).
function grDecoupe(im,box,rot){const W=im.naturalWidth||im.width,H=im.naturalHeight||im.height;
 let [y0,x0,y1,x1]=box.map((v,k)=>v/1000*(k%2?W:H));const py=(y1-y0)*.05,px=(x1-x0)*.05;
 y0=Math.max(0,y0-py);x0=Math.max(0,x0-px);y1=Math.min(H,y1+py);x1=Math.min(W,x1+px);
 const sw=x1-x0,sh=y1-y0,k=Math.min(1,420/Math.max(sw,sh)),w=Math.max(8,Math.round(sw*k)),h=Math.max(8,Math.round(sh*k));
 const c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");g.drawImage(im,x0,y0,sw,sh,0,0,w,h);
 let fin=c,det=false;try{const id=g.getImageData(0,0,w,h),m=grMasque(id.data,w,h);
  if(m){det=true;let t=h,l=w,b=0,r=0;const d=id.data;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;
    if(m[i]){// bord doux : un pixel du fond collé à la pièce garde un peu d'opacité
     const v=(x>0&&!m[i-1])||(x<w-1&&!m[i+1])||(y>0&&!m[i-w])||(y<h-1&&!m[i+w]);d[i*4+3]=v?90:0}
    else{if(y<t)t=y;if(y>b)b=y;if(x<l)l=x;if(x>r)r=x}}
   g.putImageData(id,0,0);const mg=Math.round(Math.max(w,h)*.04);l=Math.max(0,l-mg);t=Math.max(0,t-mg);r=Math.min(w-1,r+mg);b=Math.min(h-1,b+mg);
   const cw=r-l+1,chh=b-t+1,s=Math.max(cw,chh);fin=document.createElement("canvas");fin.width=s;fin.height=s;const f=fin.getContext("2d");
   f.fillStyle="#fff";f.fillRect(0,0,s,s);f.drawImage(c,l,t,cw,chh,(s-cw)/2,(s-chh)/2,cw,chh)}}catch(e){}
 if(!det){const f=document.createElement("canvas");f.width=w;f.height=h;const x=f.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,w,h);x.drawImage(c,0,0);fin=f}
 if(rot)fin=grTourneC(fin,rot);   // v158 : pièce remise à l’endroit (col / taille en haut)
 return {img:fin.toDataURL("image/jpeg",.78),det}}
// Tourne un canvas de 90, 180 ou 270° (sens des aiguilles d’une montre).
function grTourneC(c,rot){rot=((+rot%360)+360)%360;if(!rot)return c;const q=rot%180!==0,o=document.createElement("canvas");o.width=q?c.height:c.width;o.height=q?c.width:c.height;
 const g=o.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,o.width,o.height);g.translate(o.width/2,o.height/2);g.rotate(rot*Math.PI/180);g.drawImage(c,-c.width/2,-c.height/2);return o}

const GR_FOND_MSG="Le fond de ta photo est trop chargé pour l’enlever. Pose tes pièces sur un fond blanc et reprends la photo.";
const grNewId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
// Remplace l'ancien ajout (une photo = une pièce) : une photo = toutes les pièces qu'elle contient.
grAdd=async function(files){const sm=await getSample();
 for(const f of files){let img;try{img=await grThumb(f)}catch(e){toast("Cette photo n’a pas pu être lue");continue}
  const tmp={id:grNewId(),img,cat:"",nom:"",couleur:"",hex:"",wait:1};
  await grKeep(tmp);GR.items.unshift(tmp);if(!grSave()){GR.items.shift();GRDB.del(tmp.id);break}
  if(S.page==="garde")render(false);
  let r=null;if(sm&&sm.json){f.mx=1280;try{r=await sm.json(PR_MULTI(),{images:[f]})}catch(e){r=null}}
  const ps=grPieces(r);
  if(!ps.length){Object.assign(tmp,{wait:0,cat:"haut",nom:"Article",todo:1});if(r&&r.erreur)toast(r.erreur);GR.looks={};grSave();if(S.page==="garde"||S.page==="g_item")render(false);continue}
  let im=null;if(ps.length>1||ps[0].box){try{im=await grImage(f)}catch(e){}}
  const nouv=[];let det=0;
  let charge=0;
  for(const p of ps){let pic=img,d=null;if(!p.box&&p.rot&&typeof grTourne==="function"){try{pic=await grTourne(img,p.rot)}catch(e){}}if(im&&p.box){try{d=grDecoupe(im,p.box,p.rot);pic=d.img;if(d.det)det++}catch(e){}}
   const x={id:grNewId(),img:pic,cat:p.cat,type:p.type,nom:p.nom||p.type||grCat(p.cat),couleur:p.couleur,hex:p.hex,style:p.style,matiere:p.matiere,wait:0};
   if(d&&!d.det){x.fond=1;charge++}   // fond trop chargé : pas de détourage (v151 : pas d'IA payante, on conseille un fond blanc)
   nouv.push(x)}
  const at=GR.items.indexOf(tmp);GR.items.splice(at<0?0:at,at<0?0:1,...nouv);GRDB.del(tmp.id);GR_IN_DB.delete(tmp.id);
  for(const x of nouv)await grKeep(x);GR.looks={};
  if(!grSave()){GR.items=GR.items.filter(x=>!nouv.includes(x));nouv.forEach(x=>GRDB.del(x.id));render(false);break}
  if(S.page==="garde"||S.page==="g_item")render(false);
  if(S.page==="garde"&&!GR.items.some(x=>x.wait)){const c=grCount(),noms=nouv.map(x=>(x.type||x.nom).toLowerCase());
   say((nouv.length>1?"J’ai trouvé "+nouv.length+" pièces : "+noms.join(", ")+".":"C’est noté : "+noms[0]+".")+" "+(charge?GR_FOND_MSG:(c.tot>=GR_MIN?"Ta garde-robe est prête.":"Encore "+(GR_MIN-c.tot)+" article"+(GR_MIN-c.tot>1?"s":"")+" et je coordonne tes tenues.")))}
  else if(charge)toast(GR_FOND_MSG)}
};

// Garde-robe : astuce pour la photo groupée + le type précis sous le nom de chaque pièce.
if(typeof P!=="undefined"&&P.garde){const _g=P.garde;P.garde=(asT)=>{const r=_g(asT);if(!r||asT||typeof r.html!=="string")return r;
 r.html=r.html.replace('<div class="gr-adds">','<p class="gr-tip"><span aria-hidden="true">📸 </span><span>Pose tes pièces à plat sur un fond blanc (drap blanc, sol clair), sans qu’elles se touchent : Aura enlève le fond toute seule.</span> <span>Tu peux en photographier plusieurs ensemble, elle range chacune à sa place.</span></p><div class="gr-adds">');
 GR.items.forEach(x=>{if(x.type&&!x.wait&&norm(x.type)!==norm(x.nom||"")){const a=`data-gitem="${x.id}" aria-label="${esc(x.nom||"Article")}">`,i=r.html.indexOf(a);
  if(i>=0){const s=r.html.indexOf("</span></button>",i);if(s>0)r.html=r.html.slice(0,s)+`<small class="gr-ty">${esc(x.type)}</small>`+r.html.slice(s)}}});
 return r}}
if(typeof P!=="undefined"&&P.g_item){const _i=P.g_item;P.g_item=()=>{const r=_i(),x=GR.items.find(i=>i.id===S.grItem);if(!x||!r||typeof r.html!=="string")return r;
 const ty=x.cat&&GR_TYPES[x.cat]?GR_TYPES[x.cat]:[];
 if(x.fond)r.html=r.html.replace('<label class="lbl" for="g_nom">','<p class="gr-fond">'+esc(GR_FOND_MSG)+'</p><label class="lbl" for="g_nom">');
 r.html=r.html.replace('<label class="lbl" for="g_coul">',`<label class="lbl" for="g_type">Type précis</label><input class="field" id="g_type" data-gi="type" list="g_types" value="${esc(x.type||"")}" placeholder="Par exemple : blazer long"><datalist id="g_types">${ty.map(t=>`<option value="${esc(t)}">`).join("")}</datalist><label class="lbl" for="g_coul">`);
 return r}}
// Le type précis part aussi chez Aura (tenues, Outfit check, appel vocal).
if(typeof grItemsTxt==="function"){grItemsTxt=function(){return GR.items.filter(x=>!x.wait).map(x=>x.id+" : "+grCat(x.cat).toLowerCase()+(x.type?" ("+x.type.toLowerCase()+")":"")+", "+(x.nom||"")+(x.couleur?", "+x.couleur:"")+(x.matiere?", "+x.matiere:"")+(x.style?", style "+x.style:"")).join("\n")}}

// ——— Outfit check : solutions au lieu d'erreurs ———
// Nettoie les solutions : un id qui n'existe pas dans la garde-robe est retiré (jamais de pièce inventée).
function ocSols(o){if(!o||!Array.isArray(o.solutions))return [];const by=id=>GR.items.find(x=>x.id===String(id)&&!x.wait);
 return o.solutions.filter(s=>s&&typeof s==="object"&&s.texte).slice(0,4).map(s=>{const it=s.id?by(s.id):null;
  return {action:s.action==="ajouter"?"ajouter":"changer",probleme:String(s.probleme||"").slice(0,160),texte:String(s.texte).slice(0,200),it:it||null,achat:it?"":String(s.achat||"").slice(0,80)}})}
function ocHtml(o){const sols=ocSols(o),apres=Math.round(+o.note_apres||0);
 if(!sols.length)return (o.changements||[]).length?`<h2>Pour aller plus loin</h2><ul class="tips">${o.changements.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:"";
 return `<h2>${apres>+o.note&&apres<=10?"Pour passer à "+apres+"/10":"Pour aller plus loin"}</h2><div class="oc-sols">${sols.map(s=>`<div class="oc-sol">
  ${s.it?`<button class="oc-ph" data-gitem="${s.it.id}" aria-label="${esc(s.it.nom||"Article")}">${grImg(s.it)}</button>`:`<span class="oc-ph oc-buy" aria-hidden="true">🛍️</span>`}
  <div class="oc-tx">${s.probleme?`<span class="oc-tag oc-pb">Le souci</span><p class="oc-pbt">${esc(s.probleme)}</p>`:""}<span class="oc-tag">${s.probleme?"L’idée d’Aura":(s.action==="ajouter"?"Ajoute":"Change")}</span><p>${esc(s.texte)}</p>
  ${s.it?`<small class="oc-ok">✓ Tu l’as déjà dans ta garde-robe</small>`:`<small class="oc-no">${s.achat?esc(s.achat)+" · ":""}<span>achat facultatif</span></small><button class="link oc-go" data-go="boutique">Voir dans la Boutique</button>`}</div></div>`).join("")}</div>`}
function ocSay(o){const s=ocSols(o)[0];if(!s)return (o.changements||[]).length?" "+o.changements[0]:"";return (s.probleme?" "+s.probleme:"")+" "+s.texte+(s.it?" Tu l’as déjà.":"")}

(function(){const st=document.createElement("style");st.textContent=`
.gr-fond{font-size:13px;color:#8C6D35;background:#FBF6EE;border-radius:12px;padding:8px 10px;margin:10px 0}
.gr-tip{font-size:13px;color:var(--mut,#6E6E6E);margin:4px 0 10px;line-height:1.45}
.gr-it .gr-ty{display:block;font-size:11px;color:var(--accent);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.oc-sols{display:grid;gap:10px;margin:6px 0 14px}
.oc-sol{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid #E6E6E6;border-radius:18px;padding:10px}
.oc-ph{flex:0 0 72px;width:72px;height:72px;border:0;padding:0;border-radius:14px;overflow:hidden;background:var(--soft,#F5F5F5);display:flex;align-items:center;justify-content:center;font-size:30px;cursor:pointer}
.oc-ph img,.oc-ph .gr-ph{width:100%;height:100%;object-fit:cover;border-radius:14px}.oc-buy{cursor:default}
.oc-tx{min-width:0;flex:1}.oc-tx p{margin:4px 0;font-size:14.5px;line-height:1.4}
.oc-tag{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--accent)}
.oc-pb{color:#A0522D}.oc-pbt{color:#5A4F48}.oc-pbt+.oc-tag{margin-top:2px}
.oc-ok{color:#3C7A3F;font-weight:600}.oc-no{color:var(--mut,#6E6E6E)}.oc-go{display:block;padding:4px 0 0;font-size:13px}
@media (prefers-color-scheme:dark){.oc-sol{background:var(--card,#1f1c1a);border-color:#3a3530}.oc-ok{color:#8FCB8F}}`;document.head.appendChild(st)})();
