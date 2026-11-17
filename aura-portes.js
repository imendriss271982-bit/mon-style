/* Diva Divina — les 4 « portes » (v153) : Mon style · M'habiller · Acheter · Mon mariage (= Zifafi).
   v228 (nettoyage, Imen 17 novembre 2026) : l'accueil est construit par aura-accueil.js SEULEMENT. Ce fichier ne garde que
   la liste rangée de toutes les fonctions (ptPortes, ptPortesHTML) et la page d'une porte (P.porte, S.porte).
   Aucune voix sur la page d'une porte (en arabe, chaque phrase dite coûte : voir CLAUDE.md). */

const PT_IC = {
  style: '<path d="M12 3l1.8 4.6L18.5 9l-4.7 1.5L12 15l-1.8-4.5L5.5 9l4.7-1.4z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  habiller: '<path d="M12 6a2 2 0 1 1 2-2"/><path d="M12 6v1.5L3 15a1.5 1.5 0 0 0 1 2.6h16a1.5 1.5 0 0 0 1-2.6l-9-7.5"/>',
  acheter: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  mariage: '<circle cx="12" cy="15" r="5.5"/><path d="M9.5 4h5l1.5 3-4 3-4-3z"/>'
};

function ptMariageActif() {
  try {
    const p = (typeof ZD !== "undefined" && ZD && ZD.prof) || {};
    return Object.values(p).some(v => Array.isArray(v) ? v.length : (v !== "" && v != null && v !== false));
  } catch (e) { return false; }
}
function ptAnalyseRestante() { try { return typeof todoMods === "function" ? todoMods().length : 3; } catch (e) { return 3; } }
function ptPieces() { try { return typeof grCount === "function" ? grCount().tot : 0; } catch (e) { return 0; } }

// Les 4 portes : chaque fonction a une seule maison.
function ptPortes() {
  const reste = ptAnalyseRestante();
  return {
    style: { t: "Mon style", s: "Visage, silhouette, couleurs, beauté", items: [
      reste ? { t: reste === 3 ? "Découvre ton style" : "Termine ton analyse", s: reste === 3 ? "Visage, silhouette et couleurs, une seule fois" : "Encore " + reste + " étape(s)", a: 'data-onb=""' }
            : { t: "Ma fiche style", s: "Visage, silhouette, Kibbe et couleurs", a: 'data-view="fiche"' },
      { t: "Mon jumeau de style", s: "Ta copie de style : ce que Diva sait de toi", a: 'data-view="twin"' },
      { t: "Beauté et make-up", s: "Ton make-up et l’art de la tenue", a: 'data-go="beaute"' },
      { t: "Mes préférences", s: "Couleurs, pièces et occasions que tu aimes", a: 'data-go="prefs"' },
      { t: "Vérifié par une vraie styliste", s: "Une professionnelle relit ton analyse", a: 'data-go="verif"' }
    ] },
    habiller: { t: "M’habiller", s: "Outfit check, tenues, garde-robe", items: [
      { t: "Outfit check", s: "Une note et ce qu’il faut changer", a: 'data-go="o_photo"' },
      { t: "Que porter aujourd’hui ?", s: "Une tenue avec tes vêtements et la météo", a: 'data-go="jour"' },
      { t: "Ma garde-robe", s: ptPieces() ? ptPieces() + " pièce(s)" : "Ajoute tes vêtements", a: 'data-go="garde"' },
      { t: "Créer une tenue", s: "Avec tes vraies pièces", a: 'data-go="tenues"' },
      { t: "Abaya et occasions", s: "Les codes du Golfe pour toi", a: 'data-view="golfe"' }
    ] },
    acheter: { t: "Acheter", s: "Boutique et bons achats", items: [
      { t: "Boutique", s: "Les pièces choisies pour toi", a: 'data-go="boutique"' },
      { t: "Ça vaut le coup ?", s: "Photo d’une pièce : je te dis si elle te va", a: 'data-go="achat"' }
    ] },
    mariage: { t: "Mon mariage", s: "Ton style de mariée, guidé par Diva.", go: "zf" }
  };
}

function ptPortesHTML() {
  const P4 = ptPortes(), ordre = ptMariageActif() ? ["mariage", "style", "habiller", "acheter"] : ["style", "habiller", "acheter", "mariage"];
  return `<section class="pt-sec"><h2 class="hz-h">Tout Diva Divina</h2><div class="pt-grid">${ordre.map(k => {
    const p = P4[k], act = p.go ? `data-go="${p.go}"` : `data-porte="${k}"`;
    return `<button class="pt-door" ${act}><span class="pt-di"><svg viewBox="0 0 24 24" aria-hidden="true">${PT_IC[k]}</svg></span><b>${p.t}</b><small>${p.s}</small></button>`;
  }).join("")}</div></section>`;
}

{
  // Page d'une porte : la liste de ses fonctions. Pas de voix (coût).
  P.porte = () => {
    const P4 = ptPortes(), k = P4[S.porte] && !P4[S.porte].go ? S.porte : "style", p = P4[k];
    return { back: true, html: `<p class="step">Diva Divina</p><h1>${p.t}</h1><p class="sub">${p.s}</p>
<div class="pt-list">${p.items.map(x => `<button class="pt-row" ${x.a}><span class="pt-at"><b>${x.t}</b><small>${x.s}</small></span><i aria-hidden="true">›</i></button>`).join("")}</div>` };
  };
  if (typeof DOCK_OF === "object") DOCK_OF.porte = "home";

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-porte]");
    if (!b) return;
    e.stopPropagation();
    S.porte = b.getAttribute("data-porte");
    S.flow = null;
    go("porte");
  }, true);

  const st = document.createElement("style");
  st.textContent = `.pt-sec{margin:18px 0 0}
.pt-at{display:flex;flex-direction:column;min-width:0}.pt-at b{font-size:16px;color:var(--ink)}.pt-at small{color:var(--muted);font-size:13px;line-height:1.35;margin-top:2px}
.pt-row i{display:inline-block;margin-inline-start:auto;font-style:normal;color:var(--accent);font-size:22px;flex:none}
[dir=rtl] .pt-row i{transform:scaleX(-1)}
.pt-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
.pt-door{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-height:132px;padding:16px 14px;border-radius:20px;border:1px solid #E8D3A6;background:#FFFFFF;color:var(--ink);text-align:start;font:inherit;cursor:pointer;box-shadow:0 6px 18px rgba(140,109,53,.12)}
.pt-door b{font-size:16px;margin-top:6px}.pt-door small{color:var(--muted);font-size:12.5px;line-height:1.35}
.pt-di{width:42px;height:42px;border-radius:14px;display:grid;place-items:center;background:linear-gradient(135deg,#8C6D35,#7A5E2C 55%,#6E5428)}
.pt-di svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.pt-list{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.pt-row{display:flex;align-items:center;gap:12px;width:100%;padding:16px;border-radius:18px;border:1px solid #E8D3A6;background:#FFFFFF;color:var(--ink);text-align:start;font:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(140,109,53,.10)}
@media (max-width:340px){.pt-grid{grid-template-columns:1fr}.pt-door{min-height:0}}`;
  document.head.appendChild(st);
}
