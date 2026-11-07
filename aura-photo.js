/* My Style — v158 (demande d'Imen) : bien photographier ses pièces, dans le bon sens.
   1) Page guide `P.g_guide` avant la photo de la garde-robe : dessin « comme ça / pas comme ça »,
      le sens de chaque type de pièce (col / taille en haut…) et 4 règles. Montrée les 3 premières fois,
      ensuite l'ajout est direct et le lien « Comment bien photographier ? » reste dans la garde-robe.
   2) Gemini renvoie `rot` pour chaque pièce : la vignette est remise à l'endroit (aura-multi.js).
   3) Bouton « Pivoter » dans la fiche d'une pièce si elle est encore de travers (sur le téléphone, coût 0).
   Chargé après aura-avatar.js. Test : node tests/photo.js */

const GG_KEY="monstyle_gguide",GG_MAX=3;
const ggVu=()=>{try{return +localStorage.getItem(GG_KEY)||0}catch(e){return 0}};
const ggNote=()=>{try{localStorage.setItem(GG_KEY,String(ggVu()+1))}catch(e){}};

// Tourne une image (dataURL) de 90/180/270° → nouvelle dataURL JPEG.
function grTourne(src,rot){return new Promise((ok,ko)=>{const im=new Image();im.onload=()=>{try{
 const c=document.createElement("canvas");c.width=im.naturalWidth||im.width;c.height=im.naturalHeight||im.height;
 const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0);
 ok(grTourneC(c,rot).toDataURL("image/jpeg",.82))}catch(e){ko(e)}};im.onerror=()=>ko(new Error("photo"));im.src=src})}

// Petits dessins (SVG, pas de photo) : la pièce dans le bon sens.
const GG_ICO={
 haut:'<path d="M30 12 L44 6 Q50 14 56 6 L70 12 L88 28 L77 38 L70 31 L70 92 L30 92 L30 31 L23 38 L12 28 Z"/>',
 bas:'<path d="M28 6 L72 6 L78 94 L57 94 L50 36 L43 94 L22 94 Z"/><path d="M28 14 H72" class="gg-l"/>',
 chaussures:'<path d="M8 74 Q8 58 26 60 L52 64 Q70 44 86 52 Q92 56 92 66 L92 76 L8 76 Z"/><path d="M8 82 H92" class="gg-l"/>',
 sac:'<path d="M34 34 Q34 12 50 12 Q66 12 66 34" class="gg-l" style="stroke-width:5"/><rect x="18" y="34" width="64" height="54" rx="8"/>'};
const ggSvg=(k,rot)=>`<svg viewBox="0 0 100 100" aria-hidden="true" class="gg-ic"><g${rot?` transform="rotate(${rot} 50 50)"`:""}>${GG_ICO[k]}</g></svg>`;

// Grand dessin : vue du dessus, pièces à plat sur fond blanc, flèche « Haut ».
function ggScene(){return `<div class="gg-scene"><div class="gg-cad gg-oui">
  <span class="gg-up" aria-hidden="true">↑</span>
  <div class="gg-drap">${ggSvg("haut")}${ggSvg("bas")}${ggSvg("chaussures")}${ggSvg("sac")}</div>
  <p class="gg-cap"><b>✓</b> <span>Comme ça</span></p></div>
 <div class="gg-cad gg-non">
  <div class="gg-drap gg-sale">${ggSvg("haut",90)}${ggSvg("bas",180)}</div>
  <p class="gg-cap"><b>✗</b> <span>Pas comme ça</span></p></div></div>`}

P.g_guide=()=>({back:true,html:`<p class="step">Ma garde-robe</p><h1>Bien photographier tes pièces</h1>
 <p class="lead">Une pièce bien posée, c’est une garde-robe propre et des tenues justes.</p>
 ${ggScene()}
 <h2>Le bon sens de chaque pièce</h2>
 <div class="gg-list">
  <div class="gg-row">${ggSvg("haut")}<p><b>Hauts, vestes, robes, abayas</b><span>Le col en haut, les manches dépliées sur les côtés.</span></p></div>
  <div class="gg-row">${ggSvg("bas")}<p><b>Pantalons et jupes</b><span>La taille en haut, les jambes ou l’ourlet vers le bas.</span></p></div>
  <div class="gg-row">${ggSvg("chaussures")}<p><b>Chaussures</b><span>Posées sur leur semelle, de profil, la paire côte à côte.</span></p></div>
  <div class="gg-row">${ggSvg("sac")}<p><b>Sacs</b><span>Debout, l’anse en haut.</span></p></div>
 </div>
 <h2>4 règles pour une belle photo</h2>
 <ol class="gg-reg">
  <li>Téléphone bien au-dessus, droit, pas en biais.</li>
  <li>Fond blanc (drap, sol clair), pièces qui ne se touchent pas.</li>
  <li>Lumière du jour, sans flash ni ombre.</li>
  <li>Toute la pièce dans le cadre, rien de coupé.</li>
 </ol>
 <p class="gg-note">Une pièce arrive quand même de travers ? Aura la redresse ; sinon, touche « Pivoter » dans sa fiche.</p>`,
 foot:`<label class="btn">Prendre la photo<input type="file" accept="image/*" capture="environment" data-ggadd hidden></label><label class="btn ghost">Choisir dans ma galerie<input type="file" accept="image/*" multiple data-ggadd hidden></label>`});
if(typeof DOCK_OF!=="undefined")DOCK_OF.g_guide="garde";

// Garde-robe : les 3 premières fois, « Ajouter en photo » ouvre le guide ; ensuite lien pour le revoir.
if(P.garde){const _g=P.garde;P.garde=(asT)=>{const r=_g(asT);if(!r||asT||typeof r.html!=="string")return r;
 if(ggVu()<GG_MAX)r.html=r.html.replace(/<label class="gr-add">([^<]*)(<span aria-hidden="true">📷<\/span>)<input type="file" accept="image\/\*" capture="environment" data-gadd hidden><\/label>/,'<button type="button" class="gr-add" data-gguide>$1$2</button>');
 r.html=r.html.replace('<div class="gr-adds">','<button type="button" class="link gg-lien" data-gguide>Comment bien photographier ?</button><div class="gr-adds">');
 return r}}

// Fiche d'une pièce : bouton « Pivoter » sous la photo.
if(P.g_item){const _i=P.g_item;P.g_item=()=>{const r=_i(),x=GR.items.find(i=>i.id===S.grItem);if(!x||!x.img||!r||typeof r.html!=="string")return r;
 const k=r.html.indexOf('<div class="gr-big">');if(k<0)return r;const e=r.html.indexOf("</div>",k);if(e<0)return r;
 r.html=r.html.slice(0,e+6)+'<button type="button" class="gg-rot" data-grot><span aria-hidden="true">↻</span> <span>Pivoter</span></button>'+r.html.slice(e+6);return r}}

document.addEventListener("click",e=>{const t=e.target.closest("[data-gguide],[data-grot]");if(!t)return;
 if(t.hasAttribute("data-gguide")){go("g_guide");return}
 const x=GR.items.find(i=>i.id===S.grItem);if(!x||!x.img||t.disabled)return;t.disabled=true;
 grTourne(x.img,90).then(async img=>{x.img=img;GR.looks={};try{await GRDB.put(x.id,img);GR_IN_DB.add(x.id)}catch(e){}grSave();render(false)})
  .catch(()=>{t.disabled=false;toast("Cette photo n’a pas pu être tournée")})});
document.addEventListener("change",e=>{if(!e.target.hasAttribute||!e.target.hasAttribute("data-ggadd"))return;
 const fs=[...(e.target.files||[])];e.target.value="";if(!fs.length)return;ggNote();
 if(S.page==="g_guide")back();grAdd(fs)});

(function(){const st=document.createElement("style");st.textContent=`
.gg-scene{display:grid;grid-template-columns:1.4fr 1fr;gap:10px;margin:14px 0 6px}
.gg-cad{background:#fff;border:1px solid #E6E6E6;border-radius:18px;padding:10px;position:relative;min-width:0}
.gg-oui{border-color:#8C6D35}
.gg-drap{background:#FAFAF7;border:1.5px dashed #CDBB98;border-radius:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px;aspect-ratio:3/4}
.gg-sale{background:repeating-linear-gradient(45deg,#EFE6D6 0 8px,#E2D3BA 8px 16px);border-style:solid;border-color:#D8C8AC;align-content:center}
.gg-ic{width:100%;height:auto;max-width:72px;justify-self:center;align-self:center}
.gg-ic path:not(.gg-l),.gg-ic rect{fill:#E9DCC4;stroke:#8C6D35;stroke-width:2.5;stroke-linejoin:round}
.gg-ic .gg-l{fill:none;stroke:#8C6D35;stroke-width:2.5;stroke-linecap:round}
.gg-up{position:absolute;top:16px;inset-inline-start:16px;z-index:1;background:#8C6D35;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700}
.gg-cap{margin:8px 0 0;font-size:13px;text-align:center}.gg-oui .gg-cap b{color:#3E7B4F}.gg-non .gg-cap b{color:#A2463C}
.gg-non .gg-ic{opacity:.75}
.gg-list{display:grid;gap:8px;margin:6px 0 4px}
.gg-row{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid #E6E6E6;border-radius:16px;padding:8px 12px}
.gg-row .gg-ic{flex:0 0 44px;width:44px}
.gg-row p{margin:0;min-width:0}.gg-row b{display:block;font-size:14.5px}.gg-row span{display:block;font-size:13.5px;color:var(--muted,#6E6E6E);line-height:1.4}
.gg-reg{margin:6px 0 10px;padding-inline-start:22px;font-size:14.5px;line-height:1.5}
.gg-note{font-size:13px;color:#8C6D35;background:#FBF6EE;border-radius:12px;padding:8px 10px;margin:4px 0 8px}
.gg-lien{display:block;margin:2px 0 8px;font-size:13.5px}
.gg-rot{display:flex;align-items:center;gap:6px;margin:8px auto 4px;background:#fff;border:1px solid #E6E6E6;border-radius:999px;padding:7px 16px;font:inherit;font-size:14px;color:#8C6D35;cursor:pointer}
.gg-rot:disabled{opacity:.5}
@media(max-width:340px){.gg-scene{grid-template-columns:1fr}}
`;document.head.appendChild(st)})();
