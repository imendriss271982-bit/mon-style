/* Diva Divina — Accueil en « 4 portes » (v153, choix d'Imen : garder toutes les fonctions sans qu'elles paraissent trop).
   Accueil : salutation + Diva, My Stylist, 1 à 3 actions selon le moment, 1 suggestion écrite de Diva, les 4 portes, Nouveautés en bas.
   Les 4 portes (page P.porte, S.porte) rangent toutes les fonctions existantes : Mon style · M'habiller · Acheter · Mon mariage (= Zifafi).
   Rien n'est supprimé : « Tout afficher » (FX.all de aura-focus.js) montre l'ancien accueil complet ; « Accueil simplifié » revient ici.
   Suggestions de Diva : écrites, calculées sur le téléphone, sans IA ni voix (coût 0). Une seule à la fois ; ✕ la cache pour aujourd'hui.
   Aucune voix sur la page d'une porte (en arabe, chaque phrase dite coûte : voir CLAUDE.md).
   Arrêter : PORTES = false. Chargé après aura-focus.js (enveloppe P.home en dernier). */
// (Les tests de l’ancien accueil, focus.js et wedding.js, posent monstyle_portes = "0".)
const PORTES = (() => { try { return localStorage.getItem("monstyle_portes") !== "0"; } catch (e) { return true; } })();

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
function ptGardeOk() { try { return typeof grReady === "function" && grReady(); } catch (e) { return false; } }

// Les 4 portes : chaque fonction a une seule maison.
function ptPortes() {
  const reste = ptAnalyseRestante();
  return {
    style: { t: "Mon style", s: "Visage, silhouette, couleurs, beauté", items: [
      reste ? { t: reste === 3 ? "Découvre ton style" : "Termine ton analyse", s: reste === 3 ? "Visage, silhouette et couleurs, une seule fois" : "Encore " + reste + " étape(s)", a: 'data-onb=""' }
            : { t: "Ma fiche style", s: "Visage, silhouette, Kibbe et couleurs", a: 'data-view="fiche"' },
      { t: "Your Style Twin", s: "Ta copie de style : ce que Diva sait de toi", a: 'data-view="twin"' },
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
    mariage: { t: "Mon mariage", s: "Zifafi Wedding", go: "zf" }
  };
}

// 1 à 3 actions selon le moment de la cliente.
function ptActions() {
  const out = [], reste = ptAnalyseRestante();
  if (ptMariageActif()) out.push({ ic: "💍", t: "Zifafi Wedding", s: "Ton style de mariée", a: 'data-go="zf"' });
  {
    if (ptGardeOk()) out.push({ ic: "☀️", t: "Tenue du jour", s: "Avec tes vêtements", a: 'data-go="jour"' });
    out.push({ ic: "📸", t: "Outfit check", s: "Une note et quoi changer", a: 'data-go="o_photo"' });
    if (!ptGardeOk()) out.push({ ic: "👗", t: "Ma garde-robe", s: ptPieces() ? ptPieces() + " pièce(s)" : "Ajoute tes vêtements", a: 'data-go="garde"' });
  }
  return out.slice(0, 3);
}

// Suggestion écrite de Diva (une seule, sans IA). Cachée pour aujourd'hui avec ✕.
const PT_SUG_KEY = "monstyle_sug";
function ptAuj() { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function ptSugCachees() { try { const j = JSON.parse(localStorage.getItem(PT_SUG_KEY) || "null"); return j && j.d === ptAuj() && Array.isArray(j.x) ? j.x : []; } catch (e) { return []; } }
function ptSugCacher(id) { try { localStorage.setItem(PT_SUG_KEY, JSON.stringify({ d: ptAuj(), x: [...ptSugCachees(), id] })); } catch (e) {} }
function ptVeilleWeekend() {
  try { const v = typeof jrVille === "function" ? jrVille() : null; if (!v || !Array.isArray(v.we) || !v.we.length) return false; return v.we.includes((new Date().getDay() + 1) % 7) && !v.we.includes(new Date().getDay()); } catch (e) { return false; }
}
function ptSuggestion() {
  if (ptAnalyseRestante()) return null; // l'action principale suffit
  const n = ptPieces(), min = typeof GR_MIN !== "undefined" ? GR_MIN : 7;
  const pf = typeof PF !== "undefined" ? PF : null;
  const liste = [];
  if (n < min) liste.push({ id: "garde", t: n ? "Encore " + (min - n) + " pièce(s) et je crée tes tenues avec tes vrais vêtements." : "Photographie quelques pièces de ta garde-robe : je créerai tes tenues avec tes vrais vêtements.", b: "Ajouter mes vêtements", a: 'data-go="garde"' });
  if (pf && !(pf.aime || []).length && !(pf.coupes || []).length) liste.push({ id: "prefs", t: "Dis-moi les couleurs et les pièces que tu aimes : mes conseils seront encore plus justes.", b: "Mes préférences", a: 'data-go="prefs"' });
  if (ptGardeOk() && ptVeilleWeekend()) liste.push({ id: "we", t: "C’est bientôt le week-end : on prépare ta tenue ?", b: "Créer ma tenue", a: 'data-go="tenues"' });
  liste.push({ id: "abaya", t: "Tu sais quelle abaya va le mieux à ta silhouette ? Je te montre.", b: "Mon abaya", a: 'data-view="golfe"' });
  liste.push({ id: "achat", t: "Une pièce te fait envie ? Prends-la en photo, je te dis si elle vaut le coup.", b: "Ça vaut le coup ?", a: 'data-go="achat"' });
  const x = ptSugCachees();
  return liste.find(s => !x.includes(s.id)) || null;
}

const ptTile = o => `<button class="pt-act${o.big ? " big" : ""}" ${o.a}><span class="pt-ai" aria-hidden="true">${o.ic}</span><span class="pt-at"><b>${o.t}</b><small>${o.s}</small></span><i aria-hidden="true">›</i></button>`;
function ptPortesHTML() {
  const P4 = ptPortes(), ordre = ptMariageActif() ? ["mariage", "style", "habiller", "acheter"] : ["style", "habiller", "acheter", "mariage"];
  return `<section class="pt-sec"><h2 class="hz-h">Tout Diva Divina</h2><div class="pt-grid">${ordre.map(k => {
    const p = P4[k], act = p.go ? `data-go="${p.go}"` : `data-porte="${k}"`;
    return `<button class="pt-door" ${act}><span class="pt-di"><svg viewBox="0 0 24 24" aria-hidden="true">${PT_IC[k]}</svg></span><b>${p.t}</b><small>${p.s}</small></button>`;
  }).join("")}</div></section>`;
}

if (PORTES && typeof P.home === "function") {
  // v154 : une cliente qui avait choisi « Tout afficher » sur l'ancien accueil voit quand même les portes une première fois.
  try { if (!localStorage.getItem("monstyle_portes_vu") && typeof FX !== "undefined") { FX.all = false; if (typeof fxSave === "function") fxSave(); localStorage.setItem("monstyle_portes_vu", "1"); } } catch (e) {}
  const ptHomeAvant = P.home;
  P.home = (...a) => {
    const o = ptHomeAvant(...a);
    if (!o || !o.html) return o;
    const t = document.createElement("template");
    t.innerHTML = o.html;
    const hx = t.content.querySelector(".hx") || t.content;
    if (typeof FX !== "undefined" && FX.all) {
      // Ancien accueil complet : on propose de revenir à l'accueil simplifié.
      hx.querySelectorAll(".fx-pied").forEach(x => x.remove());
      const pied = document.createElement("div");
      pied.className = "fx-pied";
      pied.innerHTML = `<button type="button" class="link" data-fxall="0">Accueil simplifié</button>`;
      hx.append(pied);
      o.html = t.innerHTML;
      return o;
    }
    const garde = [".hz-top", ".hz-st", ".vf-home"].map(s => hx.querySelector(":scope > " + s) || hx.querySelector(s)).filter(Boolean);
    const insp = hx.querySelector(".hz-insp");
    const sug = ptSuggestion();
    const neuf = document.createElement("template");
    neuf.innerHTML = `<section class="pt-now"><h2 class="hz-h">Pour toi maintenant</h2>${ptActions().map(ptTile).join("")}</section>
${sug ? `<div class="pt-sug" role="note"><span class="pt-sa" aria-hidden="true">💬</span><div><small>Diva te propose</small><p>${sug.t}</p><button class="btn" ${sug.a}>${sug.b}</button></div><button class="pt-sx" type="button" data-sugx="${sug.id}" aria-label="Pas aujourd’hui">✕</button></div>` : ""}
${ptPortesHTML()}`;
    hx.replaceChildren(...garde, ...neuf.content.childNodes, ...(insp ? [insp] : []));
    const pied = document.createElement("div");
    pied.className = "fx-pied";
    pied.innerHTML = `<button type="button" class="link" data-fxall="1">Tout afficher</button>`;
    hx.append(pied);
    o.html = t.innerHTML;
    return o;
  };

  // Page d'une porte : la liste de ses fonctions. Pas de voix (coût).
  P.porte = () => {
    const P4 = ptPortes(), k = P4[S.porte] && !P4[S.porte].go ? S.porte : "style", p = P4[k];
    return { back: true, html: `<p class="step">Diva Divina</p><h1>${p.t}</h1><p class="sub">${p.s}</p>
<div class="pt-list">${p.items.map(x => `<button class="pt-row" ${x.a}><span class="pt-at"><b>${x.t}</b><small>${x.s}</small></span><i aria-hidden="true">›</i></button>`).join("")}</div>` };
  };
  if (typeof DOCK_OF === "object") DOCK_OF.porte = "home";

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-porte],[data-sugx]");
    if (!b) return;
    e.stopPropagation();
    if (b.hasAttribute("data-sugx")) { ptSugCacher(b.getAttribute("data-sugx")); if (typeof render === "function") render(false); return; }
    S.porte = b.getAttribute("data-porte");
    S.flow = null;
    go("porte");
  }, true);

  const st = document.createElement("style");
  st.textContent = `.pt-now,.pt-sec{margin:18px 0 0}
.pt-act{display:flex;align-items:center;gap:12px;width:100%;margin:10px 0 0;padding:14px;border-radius:18px;border:1px solid #E8D3A6;background:#FFFFFF;color:var(--ink);text-align:start;font:inherit;cursor:pointer;box-shadow:0 6px 18px rgba(140,109,53,.12)}
.pt-act.big{padding:18px 16px}.pt-act.big b{font-size:19px}
.pt-ai{font-size:24px;width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#F7F0E2;flex:none}
.pt-at{display:flex;flex-direction:column;min-width:0}.pt-at b{font-size:16px;color:var(--ink)}.pt-at small{color:var(--muted);font-size:13px;line-height:1.35;margin-top:2px}
.pt-act i,.pt-row i{display:inline-block;margin-inline-start:auto;font-style:normal;color:var(--accent);font-size:22px;flex:none}
[dir=rtl] .pt-act i,[dir=rtl] .pt-row i{transform:scaleX(-1)}
.pt-sug{position:relative;display:flex;gap:12px;margin:16px 0 0;padding:14px 40px 14px 14px;border-radius:18px;background:#FFFDF8;border:1px dashed #D9BE86}
[dir=rtl] .pt-sug{padding:14px 14px 14px 40px}
.pt-sa{font-size:22px;flex:none}.pt-sug small{display:block;color:var(--accent);font-weight:600;font-size:12px;letter-spacing:.04em;text-transform:uppercase}
.pt-sug p{margin:4px 0 10px;font-size:15px;line-height:1.45;color:var(--ink)}.pt-sug .btn{width:auto;padding:10px 16px;font-size:14px;min-height:0}
.pt-sx{position:absolute;top:8px;inset-inline-end:8px;width:30px;height:30px;border-radius:50%;border:0;background:transparent;color:var(--muted);font-size:15px;cursor:pointer}
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
