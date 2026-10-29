/* v127-129 : fond de soie vivant (choix d'Imen). Un petit dessin WebGL déforme l'image fond-soie.webp
   avec des vagues lentes et fait glisser la lumière sur les plis, comme un tissu qui ondule.
   L'image fixe (html::before / #splash) reste en dessous : si WebGL ne marche pas, rien ne casse. */
(function(){
"use strict";
var IMG="fond-soie.webp?v=1";
/* le dessin WebGL se fait hors écran, puis est recopié dans un canvas 2D visible :
   plus sûr avec le défilement des pages sur tous les navigateurs */
var cv=document.createElement("canvas");
cv.id="fondVivant";cv.setAttribute("aria-hidden","true");
var c2=cv.getContext("2d",{alpha:false});if(!c2)return;
var glc=document.createElement("canvas");
var gl=null;
try{gl=glc.getContext("webgl",{alpha:false,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:"low-power"})}catch(e){}
if(!gl)return;

var VS="attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
var FS=[
"precision mediump float;",
"uniform sampler2D tx;uniform vec2 res;uniform float ia;uniform float t;uniform float amp;",
"void main(){",
" vec2 uv=gl_FragCoord.xy/res; uv.y=1.-uv.y;",
/* image en « cover », calée en haut et au centre, un peu agrandie pour que les vagues ne montrent jamais le bord */
" float sa=res.x/res.y; vec2 s=vec2(1.); if(sa>ia){s.y=ia/sa;}else{s.x=sa/ia;}",
" vec2 q=vec2(.5+(uv.x-.5)*s.x, uv.y*s.y); q=.5+(q-.5)*.9;",
/* v129 : vagues bien visibles — grands plis de soie qui avancent et se croisent */
" float a1=q.y*5.0+q.x*2.0+t*1.3+sin(q.x*2.5+t*.6)*1.6;",
" float a2=(q.x*1.4-q.y)*7.0-t*1.6;",
" float a3=q.x*4.0-t*1.0+q.y*3.0;",
" float w1=sin(a1),w2=sin(a2),w3=sin(a3);",
" vec2 d=vec2(w1*.035+w2*.014, w3*.028+w1*.012)*amp;",
" vec3 c=texture2D(tx,q+d).rgb;",
/* lumière sur les plis : la pente de la vague éclaire un côté et ombre l'autre, comme sur du satin */
" float sl=cos(a1)*.6+cos(a2)*.3+cos(a3)*.35;",
" c*=1.0+sl*.11*amp;",
" c+=vec3(1.,.96,.88)*max(sl,0.)*.06*amp;",
/* reflet satiné qui traverse l'écran en diagonale (toutes les 8 s environ) */
" float sw=fract(t*.125); float band=(uv.x*.75+uv.y*.55)-(sw*2.6-.6);",
" c+=vec3(1.,.95,.86)*exp(-band*band*40.)*.26;",
" gl_FragColor=vec4(min(c,1.),1.);",
"}"].join("\n");

function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null}
var v=sh(gl.VERTEX_SHADER,VS),f=sh(gl.FRAGMENT_SHADER,FS);if(!v||!f)return;
var pr=gl.createProgram();gl.attachShader(pr,v);gl.attachShader(pr,f);gl.linkProgram(pr);
if(!gl.getProgramParameter(pr,gl.LINK_STATUS))return;
gl.useProgram(pr);
var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
var lp=gl.getAttribLocation(pr,"p");gl.enableVertexAttribArray(lp);gl.vertexAttribPointer(lp,2,gl.FLOAT,false,0,0);
var uRes=gl.getUniformLocation(pr,"res"),uIa=gl.getUniformLocation(pr,"ia"),uT=gl.getUniformLocation(pr,"t"),uAmp=gl.getUniformLocation(pr,"amp");
var tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);

/* moins de mouvement si la cliente a demandé « réduire les animations », mais le fond reste vivant */
var calme=false;try{calme=matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){}
gl.uniform1f(uAmp,calme?.45:1);

function sombre(){var r=document.documentElement,th=r.getAttribute("data-theme");
 if(th==="dark")return true;if(th==="light")return false;
 try{return matchMedia("(prefers-color-scheme:dark)").matches}catch(e){return false}}

var W=0,H=0;
function taille(){var dpr=Math.min(window.devicePixelRatio||1,1.5);
 var w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
 if(w!==W||h!==H){W=w;H=h;cv.width=w;cv.height=h;glc.width=w;glc.height=h;gl.viewport(0,0,w,h);gl.uniform2f(uRes,w,h)}}

/* le fond va derrière l'écran d'ouverture tant qu'il est là, puis derrière toute l'app */
function placer(){var sp=document.getElementById("splash");var hote=sp&&sp.isConnected&&getComputedStyle(sp).display!=="none"?sp:document.body;
 if(cv.parentNode!==hote){hote.insertBefore(cv,hote.firstChild);cv.style.position=hote===document.body?"fixed":"absolute"}}

var pret=false,t0=performance.now(),der=0;
function boucle(now){requestAnimationFrame(boucle);
 if(!pret||document.hidden)return;
 if(now-der<33)return;der=now; /* ~30 images/s : doux et léger pour la batterie */
 var nuit=sombre();cv.style.display=nuit?"none":"block";if(nuit)return;
 placer();taille();gl.viewport(0,0,W,H);
 gl.uniform1f(uT,(now-t0)/1000);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);c2.drawImage(glc,0,0)}

var im=new Image();
im.onload=function(){try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im)}catch(e){return}
 gl.uniform1f(uIa,im.naturalWidth/im.naturalHeight);pret=true;document.documentElement.classList.add("fv-on")};
im.src=IMG;
glc.addEventListener("webglcontextlost",function(e){e.preventDefault();pret=false;cv.remove();document.documentElement.classList.remove("fv-on")});
requestAnimationFrame(boucle);
})();
