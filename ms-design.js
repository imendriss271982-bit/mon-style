/* Diva Divina — micro-interactions du système de design (v185). Aucune donnée, aucun réseau.
   1) en-tête en verre quand on descend ; 2) apparition échelonnée des blocs ; 3) onde au toucher des boutons dorés.
   Tout est coupé si la cliente a demandé « réduire les animations ». */
(function(){
 var RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 var H=document.documentElement;
 // 1. En-tête
 var tick=false;function sc(){tick=false;H.classList.toggle('ms-scrolled',(window.scrollY||0)>8)}
 addEventListener('scroll',function(){if(!tick){tick=true;requestAnimationFrame(sc)}},{passive:true});sc();
 if(RM)return;
 // 2. Apparition échelonnée des blocs de la page (une fois par rendu)
 var SEL='.card,.hz-st,.hr-card,.tile,.tw-row,.ev,.ac-duo,.ac-golfe,.ac-ronds,.ac-hero,.hx-an,.art,.zf-card,.opt,.photo,h1,h2';
 var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('ms-in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -6% 0px'}):null;
 function reveal(){var pg=document.getElementById('page');if(!pg||!io)return;
  var els=pg.querySelectorAll(SEL),n=0;
  for(var i=0;i<els.length;i++){var el=els[i];if(el.dataset.msRv)continue;
   if(el.parentElement&&el.parentElement.closest('.ms-rv'))continue; // pas d'animation imbriquée
   el.dataset.msRv=1;var r=el.getBoundingClientRect();
   if(r.top>innerHeight)continue; // sous l'écran : affiché tel quel, jamais caché
   el.classList.add('ms-rv');el.style.setProperty('--ms-dl',Math.min(n++,8)*45+'ms');io.observe(el)}}
 var pg=document.getElementById('page');
 if(pg&&'MutationObserver' in window){var t;new MutationObserver(function(){clearTimeout(t);t=setTimeout(reveal,0)}).observe(pg,{childList:true})}
 setTimeout(reveal,50);
 // 3. Onde au toucher
 var BTN='.btn,.hz-call,.gr-add,.lb.pri,.zf-u-b,.ac-cta,.zf-big,.tile';
 document.addEventListener('pointerdown',function(e){var b=e.target.closest&&e.target.closest(BTN);if(!b||b.disabled)return;
  var cs=getComputedStyle(b);if(cs.position==='static')return;
  var r=b.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2,s=document.createElement('span');
  s.className='ms-ripple';s.style.width=s.style.height=d+'px';s.style.left=(e.clientX-r.left-d/2)+'px';s.style.top=(e.clientY-r.top-d/2)+'px';
  b.appendChild(s);setTimeout(function(){s.remove()},620)},{passive:true});
})();
