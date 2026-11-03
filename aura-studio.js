/* My Style — v149 (choix d'Imen) : « Photo studio » de l'Outfit check.
   Le fond de la photo de tenue est enlevé SUR LE TÉLÉPHONE (MediaPipe Image Segmenter, modèle selfie multiclasse,
   même bibliothèque que aura-mesure.js) puis la silhouette est posée sur un fond professionnel dessiné en canvas
   (studio crème, gris pro, blanc boutique, soie My Style) avec une ombre au sol. Rien n'est envoyé à un serveur.
   La cliente peut enregistrer ou partager l'image (petite signature « My Style » en bas, pour le bouche-à-oreille).
   Chargé après aura-multi.js. Test : node tests/studio.js (segmentation simulée). */
const ST_MP="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const ST_MODELE="https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
const ST_FONDS=[["creme","Studio crème"],["gris","Gris pro"],["blanc","Blanc boutique"],["soie","Soie My Style"]];
const ST={seg:null,pret:null,bg:"creme",cache:new Map(),f:null,etat:""};
try{const b=localStorage.getItem("monstyle_stbg");if(ST_FONDS.some(x=>x[0]===b))ST.bg=b}catch(e){}

// Charge le segmenteur une seule fois. Remplaçable dans les tests : ST.segmenter = async canvas => Float32Array (fond 0..1).
function stPret(){if(ST.segmenter)return Promise.resolve(ST.segmenter);if(!ST.pret)ST.pret=(async()=>{
 const v=await import(ST_MP+"/vision_bundle.mjs"),fs=await v.FilesetResolver.forVisionTasks(ST_MP+"/wasm");
 const mk=d=>v.ImageSegmenter.createFromOptions(fs,{baseOptions:{modelAssetPath:ST_MODELE,delegate:d},runningMode:"IMAGE",outputCategoryMask:false,outputConfidenceMasks:true});
 let s;try{s=await mk("GPU")}catch(e){s=await mk("CPU")}
 return c=>{const r=s.segment(c),m=r.confidenceMasks[0],a=m.getAsFloat32Array().slice(),w=m.width,h=m.height;r.close&&r.close();return {a,w,h}}})();
 return ST.pret}

function stImage(f){return new Promise((ok,ko)=>{const u=URL.createObjectURL(f),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=()=>{URL.revokeObjectURL(u);ko(new Error("photo"))};im.src=u})}
let ST_SOIE=null;function stSoie(){if(!ST_SOIE)ST_SOIE=new Promise(ok=>{const im=new Image();im.onload=()=>ok(im);im.onerror=()=>ok(null);im.src="fond-soie.webp"});return ST_SOIE}

// Fond professionnel dessiné (aucune image à télécharger, sauf la soie de l'app).
function stFond(g,W,H,bg,soie){
 if(bg==="soie"&&soie){const k=Math.max(W/soie.width,H/soie.height);g.drawImage(soie,(W-soie.width*k)/2,(H-soie.height*k)/2,soie.width*k,soie.height*k);
  const v=g.createRadialGradient(W/2,H*.42,H*.1,W/2,H*.5,H*.8);v.addColorStop(0,"rgba(255,255,255,.25)");v.addColorStop(1,"rgba(120,90,50,.18)");g.fillStyle=v;g.fillRect(0,0,W,H);return}
 const P={creme:["#FBF6EE","#EADFCC","#D8C8AE"],gris:["#EEEEEC","#C9C9C6","#A9A9A6"],blanc:["#FFFFFF","#F6F6F6","#ECECEC"]}[bg]||["#FBF6EE","#EADFCC","#D8C8AE"];
 const r=g.createRadialGradient(W/2,H*.38,H*.05,W/2,H*.45,Math.max(W,H)*.85);r.addColorStop(0,P[0]);r.addColorStop(.6,P[1]);r.addColorStop(1,P[2]);g.fillStyle=r;g.fillRect(0,0,W,H);
 // sol du studio : léger dégradé en bas (papier qui tombe sans angle)
 const s=g.createLinearGradient(0,H*.78,0,H);s.addColorStop(0,"rgba(0,0,0,0)");s.addColorStop(1,bg==="blanc"?"rgba(0,0,0,.035)":"rgba(0,0,0,.08)");g.fillStyle=s;g.fillRect(0,H*.78,W,H*.22)}

// Masque → alpha (pure, testable) : fond 0..1 → opacité de la silhouette, bords adoucis.
function stAlpha(bgConf){const a=new Uint8ClampedArray(bgConf.length);for(let i=0;i<bgConf.length;i++){const p=1-bgConf[i];a[i]=p<.25?0:p>.75?255:Math.round((p-.25)*510)}return a}

async function stRendu(f,bg){const k=bg;const c0=ST.cache.get(f);if(c0&&c0[k])return c0[k];
 const im=await stImage(f),sc=Math.min(1,1080/Math.max(im.naturalWidth,im.naturalHeight)),W=Math.round(im.naturalWidth*sc),H=Math.round(im.naturalHeight*sc);
 let base=c0&&c0.base;
 if(!base){const src=document.createElement("canvas");src.width=W;src.height=H;src.getContext("2d").drawImage(im,0,0,W,H);
  const seg=await stPret(),m=await seg(src);if(!m||!m.a||!m.w)throw new Error("masque");
  const al=stAlpha(m.a);let pers=0;for(let i=0;i<al.length;i++)if(al[i]>128)pers++;const part=pers/al.length;
  if(part<.03||part>.95)throw new Error("personne");
  // masque à la taille du masque, agrandi en douceur sur la photo
  const mc=document.createElement("canvas");mc.width=m.w;mc.height=m.h;const mg=mc.getContext("2d"),md=mg.createImageData(m.w,m.h);
  for(let i=0;i<al.length;i++){md.data[i*4+3]=al[i]}mg.putImageData(md,0,0);
  const cut=document.createElement("canvas");cut.width=W;cut.height=H;const cg=cut.getContext("2d");cg.drawImage(src,0,0);cg.globalCompositeOperation="destination-in";cg.imageSmoothingQuality="high";cg.drawImage(mc,0,0,W,H);
  // bas de la silhouette (pieds) pour poser l'ombre
  let pied=H*.95,minX=W,maxX=0;for(let y=m.h-1;y>=0;y--){let hit=false;for(let x=0;x<m.w;x++)if(al[y*m.w+x]>128){hit=true;minX=Math.min(minX,x/m.w*W);maxX=Math.max(maxX,x/m.w*W)}if(hit){pied=(y+1)/m.h*H;break}}
  base={cut,W,H,pied,cx:(minX+maxX)/2||W/2,lw:Math.max(W*.18,(maxX-minX)||W*.3)};ST.cache.set(f,{base})}
 const out=document.createElement("canvas");out.width=base.W;out.height=base.H;const g=out.getContext("2d");
 stFond(g,base.W,base.H,bg,bg==="soie"?await stSoie():null);
 // ombre au sol, douce
 g.save();g.translate(base.cx,Math.min(base.H-4,base.pied));g.scale(1,.16);const sh=g.createRadialGradient(0,0,2,0,0,base.lw*.75);sh.addColorStop(0,"rgba(0,0,0,.28)");sh.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=sh;g.beginPath();g.arc(0,0,base.lw*.75,0,7);g.fill();g.restore();
 g.drawImage(base.cut,0,0);
 // signature discrète
 const fz=Math.max(12,Math.round(base.W*.028));g.font="600 "+fz+"px Georgia,serif";g.textAlign="right";g.fillStyle=bg==="gris"?"rgba(60,50,40,.55)":"rgba(140,109,53,.75)";g.fillText("My Style",base.W-fz*.8,base.H-fz*.8);
 const url=out.toDataURL("image/jpeg",.9);ST.cache.get(f)[k]=url;return url}

function stRun(){const f=S.file&&S.file.outfit,el=document.getElementById("stImg");if(!f||!el)return;
 if(ST.f!==f){ST.f=f;ST.etat=""}
 const bg=ST.bg,box=el.closest(".st-box");box&&box.classList.add("busy");
 stRendu(f,bg).then(u=>{if(ST.f!==f||ST.bg!==bg)return;const e=document.getElementById("stImg");if(e){e.src=u;e.closest(".st-box").classList.remove("busy")}ST.etat="ok";stBtns()},
  ()=>{ST.etat="ko";const b=document.querySelector(".st-box");if(b){b.classList.remove("busy");b.classList.add("ko")}const n=document.getElementById("stNote");if(n)n.textContent="Le fond studio n’a pas marché sur cette photo. Prends-toi en pied, bien détachée du décor.";stBtns()})}
function stBtns(){document.querySelectorAll("[data-stsave],[data-stshare]").forEach(b=>b.disabled=ST.etat!=="ok")}

function stHtml(){if(!(S.file&&S.file.outfit&&S.url&&S.url.outfit))return "";
 return `<div class="stp"><div class="st-box busy"><img id="stImg" src="${S.url.outfit}" alt="Ta tenue en photo studio"><span class="st-wait" aria-hidden="true">✨</span></div>
 <div class="st-ch" role="radiogroup" aria-label="Fond">${ST_FONDS.map(x=>`<button type="button" data-stbg="${x[0]}" aria-pressed="${ST.bg===x[0]}"><i class="st-sw st-${x[0]}"></i>${x[1]}</button>`).join("")}</div>
 <p class="st-note" id="stNote">Le fond est enlevé sur ton téléphone : ta photo ne part nulle part.</p>
 <div class="st-act"><button class="btn" data-stsave disabled>Enregistrer la photo</button>${navigator.share?`<button class="btn" data-stshare disabled>Partager</button>`:""}</div></div>`}

if(typeof P!=="undefined"&&P.o_res){const _o=P.o_res;P.o_res=()=>{const r=_o();if(!r||typeof r.html!=="string"||!ok("outfit"))return r;const h=stHtml();if(!h)return r;
 const i=r.html.indexOf('<div class="big">');r.html=i>=0?r.html.slice(0,i)+h+r.html.slice(i):h+r.html;
 let n=0;const t=()=>{if(document.getElementById("stImg"))stRun();else if(n++<20)requestAnimationFrame(t)};requestAnimationFrame(t);return r}}

function stFichier(){const f=S.file&&S.file.outfit,c=f&&ST.cache.get(f),u=c&&c[ST.bg];if(!u)return null;
 const b=atob(u.split(",")[1]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return new File([a],"my-style-tenue.jpg",{type:"image/jpeg"})}
document.addEventListener("click",e=>{const t=e.target.closest("[data-stbg],[data-stsave],[data-stshare]");if(!t)return;
 if(t.dataset.stbg){ST.bg=t.dataset.stbg;try{localStorage.setItem("monstyle_stbg",ST.bg)}catch(x){}document.querySelectorAll("[data-stbg]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.stbg===ST.bg));if(ST.etat!=="ko"){ST.etat="";stBtns();stRun()}return}
 const f=stFichier();if(!f)return;
 if(t.hasAttribute("data-stshare")&&navigator.share){navigator.share({files:[f],title:"My Style"}).catch(()=>{});return}
 const a=document.createElement("a"),u=URL.createObjectURL(f);a.href=u;a.download=f.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast("Photo enregistrée")});

(function(){const st=document.createElement("style");st.textContent=`
.stp{margin:4px 0 14px}.st-box{position:relative;border-radius:22px;overflow:hidden;background:#F5F5F5;max-height:62vh;display:flex;justify-content:center;box-shadow:0 6px 22px rgba(80,55,20,.12)}
.st-box img{display:block;max-width:100%;max-height:62vh;object-fit:contain}.st-wait{display:none}
.st-box.busy img{filter:blur(2px) saturate(.8);opacity:.7}.st-box.busy .st-wait{display:flex;position:absolute;inset:0;align-items:center;justify-content:center;font-size:34px;animation:grp 1.1s ease-in-out infinite alternate}
.st-ch{display:flex;gap:8px;overflow-x:auto;padding:10px 0 2px;scrollbar-width:none}.st-ch::-webkit-scrollbar{display:none}
.st-ch button{flex:0 0 auto;display:flex;align-items:center;gap:6px;border:1px solid #E6E6E6;background:#fff;color:var(--ink);border-radius:99px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}
.st-ch button[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset;font-weight:600}
.st-sw{width:16px;height:16px;border-radius:50%;border:1px solid rgba(0,0,0,.12)}.st-creme{background:#EADFCC}.st-gris{background:#C9C9C6}.st-blanc{background:#fff}.st-soie{background:url(fond-soie.webp) center/cover}
.st-note{font-size:12.5px;color:#6E6E6E;margin:6px 0}.st-act{display:flex;gap:8px}.st-act .btn{flex:1;margin:0}`;document.head.appendChild(st)})();
