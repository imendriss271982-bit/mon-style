/* Diva Divina — Accueil « focus » (v146, essai voulu par Imen).
   Une nouvelle cliente ne voit d'abord que l'essentiel ; les autres rubriques apparaissent au fil de son parcours.
   Rien n'est supprimé : « Tout afficher » montre tout de suite l'accueil complet (et « Accueil simplifié » revient en arrière).
   Pour arrêter l'essai : FOCUS = false.
   Niveaux :
     0 · nouvelle cliente      → Diva, analyse de style, Outfit check, Diva Divina / Zifafi
     1 · analyse terminée      → + garde-robe, créer une tenue, rubriques (shopping, beauté), « Pour toi aujourd'hui »
     2 · 3 vêtements ajoutés   → + Your Style Twin, abaya et occasions du Golfe
     3 · + 7 jours d'usage     → + Inspirations du jour (Nouveautés)
   Données : localStorage `monstyle_focus` = { first: date ISO de la 1re ouverture, seen: dernier niveau annoncé, all: tout afficher }.
   Chargé après aura-verif.js (enveloppe P.home une dernière fois). */
const FOCUS = true;
let FX = (() => { try { const j = JSON.parse(localStorage.getItem("monstyle_focus") || "null"); if (j && typeof j === "object") return { first: typeof j.first === "string" ? j.first : "", seen: Number(j.seen) || 0, all: !!j.all }; } catch (e) {} return { first: "", seen: 0, all: false }; })();
if (!FX.first) FX.first = new Date().toISOString().slice(0, 10);
function fxSave() { try { localStorage.setItem("monstyle_focus", JSON.stringify(FX)); } catch (e) {} }
fxSave();

function fxAnalyseFaite() { try { return !!(ok("visage") && ok("corps") && season()); } catch (e) { return false; } }
function fxNbArticles() { try { return (GR && Array.isArray(GR.items)) ? GR.items.length : 0; } catch (e) { return 0; } }
function fxJours() { const d = Date.parse(FX.first); return isNaN(d) ? 0 : Math.floor((Date.now() - d) / 864e5); }
function fxNiveau() {
  let n = 0;
  if (fxAnalyseFaite()) n = 1;
  if (n >= 1 && fxNbArticles() >= 3) n = 2;
  if (n >= 2 && fxJours() >= 7) n = 3;
  return n;
}
const FX_NOUV = {
  1: "Ta garde-robe, la tenue du jour, le shopping et la beauté sont maintenant ouverts.",
  2: "Ton Style Twin et ton abaya selon ta silhouette sont maintenant ouverts.",
  3: "Les inspirations et les événements mode sont maintenant ouverts."
};

if (FOCUS && typeof P.home === "function") {
  const fxHomeAvant = P.home;
  P.home = (...a) => {
    const o = fxHomeAvant(...a);
    if (!o || !o.html) return o;
    const n = fxNiveau(), t = document.createElement("template");
    t.innerHTML = o.html;
    const hx = t.content.querySelector(".hx") || t.content;
    const sec = h => [...hx.querySelectorAll(":scope > section")].find(s => { const x = s.querySelector(":scope > h2.hz-h"); return x && x.textContent.trim().startsWith(h); });
    const blocs = {
      1: [hx.querySelector(".hz-acts"), sec("Tes rubriques préférées"), sec("Pour toi aujourd")],
      2: [hx.querySelector(".tw-card"), hx.querySelector(".go-entree")],
      3: [hx.querySelector(".hz-insp")]
    };
    let cache = 0;
    if (!FX.all) for (const k of [1, 2, 3]) if (n < k) blocs[k].forEach(b => { if (b) { b.remove(); cache++; } });
    // Annonce de ce qui vient de s'ouvrir (une seule fois par niveau).
    if (n > FX.seen && !FX.all) {
      const c = document.createElement("button");
      c.type = "button"; c.className = "fx-new"; c.setAttribute("data-fxok", "");
      c.innerHTML = `<span aria-hidden="true">✨</span><span><b>Nouveau pour toi</b><small>${FX_NOUV[n]}</small></span><i aria-hidden="true">✓</i>`;
      const apres = hx.querySelector(".hz-st");
      if (apres) apres.after(c); else hx.prepend(c);
    } else if (n > FX.seen) { FX.seen = n; fxSave(); }
    // Lien en bas : tout afficher, ou revenir à l'accueil simplifié.
    const pied = document.createElement("div");
    pied.className = "fx-pied";
    if (cache) pied.innerHTML = `<p>D'autres rubriques s'ouvriront au fil de ton parcours.</p><button type="button" class="link" data-fxall="1">Tout afficher</button>`;
    else if (FX.all && n < 3) pied.innerHTML = `<button type="button" class="link" data-fxall="0">Accueil simplifié</button>`;
    if (pied.innerHTML) hx.append(pied);
    o.html = t.innerHTML;
    return o;
  };
  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest("[data-fxok],[data-fxall]");
    if (!b) return;
    e.stopPropagation();
    if (b.hasAttribute("data-fxok")) FX.seen = fxNiveau();
    else FX.all = b.getAttribute("data-fxall") === "1";
    fxSave();
    if (typeof render === "function") render();
  }, true);
  const st = document.createElement("style");
  st.textContent = `.fx-new{display:flex;align-items:center;gap:12px;width:100%;margin:12px 0 4px;padding:12px 14px;border-radius:16px;border:1px solid #E8D3A6;background:#FFFFFF;color:var(--ink);text-align:start;font:inherit;cursor:pointer;box-shadow:0 4px 14px rgba(140,109,53,.14)}
.fx-new>span:first-child{font-size:22px}.fx-new b{display:block;color:var(--accent)}.fx-new small{display:block;color:var(--muted);font-size:13px;line-height:1.4}
.fx-new i{margin-inline-start:auto;font-style:normal;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#8C6D35;color:#fff;font-size:14px;flex:none}
.fx-pied{text-align:center;margin:18px 0 6px}.fx-pied p{margin:0;color:var(--muted);font-size:13px}.fx-pied .link{padding:6px}`;
  document.head.append(st);
}
