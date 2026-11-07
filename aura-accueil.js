/* My Style — Accueil v174 (ordre voulu par Imen, 7 novembre 2026).
   « المجلس حنشيلها من فوق نخليها بس تحت » : la bande du Majlis disparaît du haut de l'accueil (l'onglet Majlis de la barre du bas reste).
   Ordre : salutation + Aura → (cartes d'avis : invitation / message du Majlis, réponse de la styliste, nouveauté)
           1. Que porter aujourd'hui ?  2. Your Style Twin  3. My Stylist (« Appeler Aura » qui bat comme un cœur)
           4. Outfit check  5. Ma garde-robe + Créer une tenue  6. Zifafi Wedding
           puis « Tout My Style » (3 portes : rien n'est perdu) et Inspirations du jour tout en bas.
   Chargé en DERNIER (après aura-majlis.js et aura-chatlook.js) : enveloppe P.home après toutes les autres.
   Arrêter : localStorage.monstyle_accueil = "0" (posé aussi par les tests des anciens accueils). */
const ACC_ON = (() => { try { return localStorage.getItem("monstyle_accueil") !== "0" && localStorage.getItem("monstyle_portes") !== "0"; } catch (e) { return true; } })();

// 1. Que porter aujourd'hui ? — toujours visible, même si la garde-robe n'est pas prête.
function acJour() {
  let l = null, met = "", pret = false;
  try { if (typeof jrMeteo === "function") jrMeteo(); } catch (e) {}
  try { l = typeof JR !== "undefined" && typeof jrAuj === "function" && JR.d === jrAuj() ? JR.look : null; } catch (e) {}
  try { met = typeof jrMeteoTxt === "function" ? jrMeteoTxt() : ""; } catch (e) {}
  try { pret = typeof grReady === "function" && grReady(); } catch (e) {}
  const meteo = met ? `<span data-noi18n>${esc(met)}</span> ›` : "›";
  if (l && l.titre) return `<button class="hr-card jr-home ac-jour" data-view="jour"><span class="hr-lab">Ta tenue d’aujourd’hui</span><b>${esc(l.titre)}</b>
   ${l.conseil ? `<small>${esc(l.conseil)}</small>` : ""}<em>${typeof JR !== "undefined" && JR.porte ? "Portée aujourd’hui ✓" : "Voir ma tenue"} ›</em></button>`;
  return `<button class="hr-card jr-home ac-jour" data-view="jour"><span class="hr-lab">Chaque jour</span><b>Que porter aujourd’hui ?</b>
   <small>${pret ? "Une tenue avec tes vêtements, selon la météo" : "Ajoute d’abord tes vêtements"}</small><em>${meteo}</em></button>`;
}

// 4. Outfit check
function acOutfit() {
  const oc = typeof ok === "function" ? ok("outfit") : null;
  const cam = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.6"/></svg>';
  return `<button class="hx-oc2 ac-oc" data-go="o_photo"><span class="hx-oc2-i"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6a2 2 0 1 1 2 2c-1 0-2 .7-2 1.6v.4l8.5 6.2c.8.6.4 1.8-.6 1.8H4.1c-1 0-1.4-1.2-.6-1.8L12 10"/></svg></span>
  <span class="hx-oc2-t"><small>Chaque jour</small><b>Outfit check</b><em>${oc ? `Dernière note : ${esc(String(oc.note))}/10` : "Une note et les changements à faire"}</em></span><span class="hx-oc2-c">${cam}</span></button>`;
}

// 5. Ma garde-robe + Créer une tenue (garde-robe en premier, comme Imen l'a dit)
function acActs() {
  let n = 0; try { n = grCount().tot; } catch (e) {}
  const cintre = typeof GR_HANGER !== "undefined" ? GR_HANGER : "";
  return `<div class="hz-acts ac-acts">
  <button data-go="garde"><span aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M9.5 11v2M14.5 11v2"/></svg></span><b>Ma garde-robe</b><small>${n ? n + " article" + (n > 1 ? "s" : "") : "À remplir"}</small></button>
  <button data-go="tenues"><span aria-hidden="true">${cintre}</span><b>Créer une tenue</b><small>Avec tes vêtements</small></button>
 </div>`;
}

// « Tout My Style » : les 3 portes (Mon style, M'habiller, Acheter) pour garder l'accès à tout le reste. Zifafi a déjà sa carte.
function acPortes() {
  if (typeof PORTES === "undefined" || !PORTES || typeof ptPortes !== "function" || typeof PT_IC === "undefined") return "";
  const P4 = ptPortes();
  return `<section class="pt-sec ac-tout"><h2 class="hz-h">Tout My Style</h2><div class="pt-grid ac-grid">${["style", "habiller", "acheter"].map(k => {
    const p = P4[k];
    return `<button class="pt-door" data-porte="${k}"><span class="pt-di"><svg viewBox="0 0 24 24" aria-hidden="true">${PT_IC[k]}</svg></span><b>${p.t}</b><small>${p.s}</small></button>`;
  }).join("")}</div></section>`;
}

if (ACC_ON && typeof P.home === "function") {
  const acHomeAvant = P.home;
  P.home = (...a) => {
    const o = acHomeAvant(...a);
    if (!o || typeof o.html !== "string") return o;
    const t = document.createElement("template");
    t.innerHTML = o.html;
    const hx = t.content.querySelector(".hx");
    if (!hx) return o;
    const pick = s => hx.querySelector(s);
    const top = pick(".hz-top"), st = pick(".hz-st"), insp = pick(".hz-insp");
    // Cartes qui n'apparaissent que quand il y a quelque chose à lire (la bande fixe du Majlis .mj-bar est retirée).
    // (Le Majlis met ses cartes avant tout l'accueil, hors de .hx : on les cherche dans toute la page.)
    const avis = [".mj-invite", ".mj-msg", ".vf-home", ".fx-new"].map(s => t.content.querySelector(s)).filter(Boolean);
    t.content.querySelectorAll(".mj-bar").forEach(x => x.remove());
    if (st) st.classList.add("ac-st");
    const neuf = document.createElement("template");
    neuf.innerHTML = `${acJour()}
${typeof twinCard === "function" ? twinCard() : ""}
<span class="ac-stp"></span>
${acOutfit()}
${acActs()}
${typeof zfHomeCards === "function" ? zfHomeCards() : ""}
${acPortes()}`;
    const place = neuf.content.querySelector(".ac-stp");
    if (st) place.replaceWith(st); else place.remove();
    hx.replaceChildren(...[top, ...avis].filter(Boolean), ...neuf.content.childNodes, ...(insp ? [insp] : []));
    o.html = t.innerHTML;
    return o;
  };

  const st = document.createElement("style");
  st.textContent = `
.hz .ac-jour{margin-top:16px}
.hz .ac-jour b{font-size:19px}
.hz .tw-card{margin-top:14px}
.hz .ac-st{margin-top:14px}
.hz .ac-oc{margin-top:14px}
.hz .ac-acts{margin-top:14px}
.hz .zf-uni{margin-top:14px}
.hz .ac-tout{margin-top:22px}
/* « Appeler Aura » grossit et rapetisse comme un cœur, avec des ondes dorées, pour qu'on comprenne qu'il faut toucher. */
.hz .ac-st{overflow:visible}
.hz .ac-st .hz-call{animation:acBeat 1.6s ease-in-out infinite!important;overflow:visible}
.hz .ac-st .hz-call svg{animation:acRing 1.6s ease-in-out infinite;transform-origin:50% 50%}
@keyframes acBeat{0%,100%{transform:scale(1);box-shadow:0 6px 16px rgba(140,109,53,.25),0 0 0 0 rgba(140,109,53,.7),0 0 0 0 rgba(140,109,53,.45)}15%{transform:scale(1.07)}30%{transform:scale(1)}45%{transform:scale(1.04)}70%{box-shadow:0 6px 16px rgba(140,109,53,.25),0 0 0 12px rgba(140,109,53,0),0 0 0 22px rgba(140,109,53,0)}}
@keyframes acRing{0%,55%,100%{transform:rotate(0)}5%,15%,25%{transform:rotate(-16deg)}10%,20%,30%{transform:rotate(16deg)}}
@media (prefers-reduced-motion:reduce){.hz .ac-st .hz-call,.hz .ac-st .hz-call svg{animation:none!important}}
@media (min-width:341px){.ac-grid{grid-template-columns:1fr 1fr 1fr}.ac-grid .pt-door{min-height:118px;padding:14px 12px}.ac-grid .pt-door small{font-size:12px}}`;
  document.head.appendChild(st);
}
