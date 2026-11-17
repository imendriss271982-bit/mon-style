/* Diva Divina — Diva, ta styliste ET ton amie (v227, Imen 17 novembre 2026 : « علاقة… أنا صديقة ستايلست… perfect »).
   Chargé APRÈS aura-accueil.js (pour écrire dans l'accueil final), avant ms-design.
   1) LE MOT DE DIVA sur l'accueil, sous « Salut [prénom] » : une phrase personnelle, sans IA, tirée de SA vie
      (souvenirs de aura-souvenirs.js, tenues, garde-robe, ancienneté) — jamais inventée :
        événement demain → « Demain c'est « عرس أختي » ! On prépare ta tenue ensemble ? » (+ bouton)
        événement passé sans nouvelles → « J'espère que « … » s'est bien passé, raconte-moi 💛 » (si pas déjà une question sur l'accueil)
        belle note récente (≥ 8) → « Ta tenue de mardi était superbe (9/10), j'y pense encore ✨ »
        tenue du jour portée plusieurs jours de suite → « 3 jours de suite avec mes idées, j'adore ta régularité 🌟 »
        1 semaine / 1 mois / 100 jours ensemble → un petit mot de complicité
        sinon un mot doux selon le moment de la journée.
      Le même mot reste toute la journée (pas de changement à chaque ouverture).
   2) LA RELATION DANS LA TÊTE DE DIVA : `PROFIL()` reçoit « TA RELATION AVEC ELLE » (depuis combien de temps vous vous
      connaissez + la manière d'être une amie : prénom, chaleur, compliments vrais, mémoire, encouragement, jamais de jugement
      sur le corps) → chat écrit et appel vocal. */

const AM_DEBUT = (() => {
  // Première ouverture connue : focus (v146), sinon le plus vieux souvenir, sinon aujourd'hui (gardée ensuite).
  try {
    let d = +localStorage.getItem("monstyle_debut") || 0;
    if (!d) { try { d = +(JSON.parse(localStorage.getItem("monstyle_focus") || "{}").first || 0); } catch (e) {} }
    if (!d && typeof SV !== "undefined" && SV.l.length) d = Math.min(...SV.l.map(x => x.t));
    if (!d) d = Date.now();
    localStorage.setItem("monstyle_debut", String(d));
    return d;
  } catch (e) { return Date.now(); }
})();
const amJours = () => Math.floor((Date.now() - AM_DEBUT) / 864e5);
const amAuj = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
const amMemeJour = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const AM_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function amSerie() {
  // Jours de suite (jusqu'à aujourd'hui ou hier) où elle a porté la tenue du jour.
  if (typeof SV === "undefined") return 0;
  const jours = new Set(SV.l.filter(x => x.k === "jour").map(x => new Date(x.t).toDateString()));
  let n = 0, d = new Date();
  if (!jours.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (jours.has(d.toDateString())) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Le mot du jour : [phrase en français (traduite par i18n.js), variable {0}, action facultative].
function amMot() {
  const now = Date.now(), l = typeof SV !== "undefined" ? SV.l : [], h = new Date().getHours();
  const carteSuivi = typeof svDue === "function" && svDue();
  // 1. Événement demain (ou aujourd'hui) dont elle a parlé.
  const bientot = l.filter(x => x.k === "event" && x.quand && !x.rep).find(x => x.quand > now - 6 * 36e5 && x.quand < now + 40 * 36e5);
  if (bientot) {
    if (amMemeJour(bientot.quand, now)) return ["C’est aujourd’hui, « {0} » ! Tu vas être magnifique 💛", bientot.quoi, ""];
    return ["Demain c’est « {0} » ! On prépare ta tenue ensemble ?", bientot.quoi, "tenues"];
  }
  // 2. Événement passé, pas encore de nouvelles (et pas déjà une question sur l'accueil).
  const passe = !carteSuivi && l.filter(x => x.k === "event" && x.quand && !x.rep && x.quand < now && now - x.quand < 3 * 864e5).slice(-1)[0];
  if (passe) return ["J’espère que « {0} » s’est bien passé. Raconte-moi quand tu veux 💛", passe.quoi, "chat"];
  // 3. Belle note récente.
  const belle = l.filter(x => x.k === "oc" && x.note >= 8 && now - x.t < 4 * 864e5 && !amMemeJour(x.t, now)).slice(-1)[0];
  if (belle) return ["Ta dernière tenue était superbe ({0}/10), j’y pense encore ✨", String(belle.note), ""];
  // 4. Série de tenues du jour.
  const s = amSerie();
  if (s >= 2) return ["{0} jours de suite avec mes idées, j’adore ta régularité 🌟", String(s), ""];
  // 5. Complicité selon l'ancienneté.
  const j = amJours();
  if (j >= 100 && j < 103) return ["Déjà 100 jours ensemble ! Merci de me faire confiance 💛", "", ""];
  if (j >= 30 && j < 33) return ["Ça fait un mois qu’on se connaît. J’adore t’accompagner 💛", "", ""];
  if (j >= 7 && j < 9) return ["Une semaine qu’on se connaît déjà ! Je commence à bien connaître ton style 💛", "", ""];
  // 6. Mot doux selon le moment (un parmi plusieurs, stable dans la journée).
  const g = h < 12 ? ["Prête pour une belle journée ? Je suis là si tu hésites ☀️", "Un café et une jolie tenue : la journée commence bien ☀️"]
    : h < 18 ? ["Comment se passe ta journée ? Je suis là si tu as besoin de moi 💛", "Une petite pause ? On peut parler style quand tu veux ✨"]
      : ["Belle soirée ! Tu veux préparer ta tenue de demain ensemble ? 🌙", "Fin de journée : prends soin de toi ce soir 🌙"];
  const k = [...amAuj()].reduce((a, c) => a + c.charCodeAt(0), 0) % g.length;
  return [g[k], "", h >= 18 ? "tenues" : ""];
}

if (typeof P.home === "function") {
  const homeAvantAm = P.home;
  P.home = (...a) => {
    const o = homeAvantAm(...a);
    if (!o || typeof o.html !== "string") return o;
    try {
      const [phrase, v, act] = amMot();
      const txt = esc(phrase.replace("{0}", v));
      const bouton = act === "tenues" ? `<button type="button" class="am-go" data-go="tenues">Préparer ma tenue ›</button>`
        : act === "chat" ? `<button type="button" class="am-go" data-go="chat">Écrire à Diva ›</button>` : "";
      const mot = `<div class="am-mot"><img src="aura-face.jpg?v=5" alt="" width="34" height="34"><p><span>${txt}</span>${bouton}</p></div>`;
      // Juste sous la salutation et la météo, avant toutes les cartes.
      const t = document.createElement("template"); t.innerHTML = o.html;
      const top = t.content.querySelector(".hz-top");
      if (top) { top.insertAdjacentHTML("afterend", mot); o.html = t.innerHTML; }
    } catch (e) {}
    return o;
  };
}

// La relation dans ce que Diva sait d'elle (chat écrit et appel vocal).
if (typeof PROFIL === "function") {
  const profilAvantAm = PROFIL;
  PROFIL = function () {
    const x = profilAvantAm.apply(this, arguments) || "", j = amJours();
    const rel = "TA RELATION AVEC ELLE : tu es sa styliste ET une amie bienveillante" + (j > 0 ? " (vous vous connaissez depuis " + j + " jour" + (j > 1 ? "s" : "") + ")" : " (vous venez de faire connaissance)") +
      ". Appelle-la par son prénom, parle avec chaleur et naturel comme une amie proche qui s'y connaît en mode, fais des compliments sincères et précis (jamais exagérés), souviens-toi de ce qu'elle t'a confié et demande des nouvelles, encourage-la, un peu d'humour léger si l'ambiance s'y prête. Jamais de jugement sur son corps ni son poids, jamais de reproche. Reste courte.";
    return x ? rel + " ; " + x : rel;
  };
}

(function () {
  const st = document.createElement("style");
  st.textContent = `
.hz .am-mot{display:flex;align-items:flex-start;gap:10px;margin:0 0 10px;padding:12px 14px;border-radius:18px;background:rgba(255,253,249,.82);border:1px solid var(--dd-champagne,#E9D6AE)}
.hz .am-mot img{flex:none;width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 20%}
.hz .am-mot p{margin:0;font-size:15px;line-height:1.45;color:var(--ink,#1C1714)}
.hz .am-mot p span{font-style:italic}
.hz .am-mot .am-go{display:inline-flex;align-items:center;min-height:44px;margin-top:2px;padding:0;border:0;background:none;color:var(--accent,#7A5B26);font:inherit;font-weight:600;font-style:normal;cursor:pointer}
[dir="rtl"] .hz .am-mot p span{font-style:normal}`;
  document.head.appendChild(st);
})();
