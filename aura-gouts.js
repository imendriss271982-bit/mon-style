/* My Style — Profil de goûts appris (v182). Chargé juste après aura-profile.js.
   Avant, les 👍/👎 n'étaient qu'une liste de titres de tenues recopiée dans les demandes à Aura.
   Maintenant chaque réaction compte pour les PIÈCES de la tenue : leur couleur, leur type précis (ex. « Blazer long »)
   et leur famille (Haut, Robe…). Poids : 👍 +1, 👎 −1, tenue enregistrée +0,5, tenue du jour portée +0,5.
   Score borné entre −10 et +10. Ce qui revient souvent (≥ 2) = « elle aime » ; (≤ −2) = « elle évite ».
   Aura le reçoit dans pfCtx() (contexte) et pfRules() (règles) ; la cliente le voit et peut le remettre à zéro dans
   Mes préférences. Données : localStorage `monstyle_gouts` (sauvegardé dans le compte, effacé avec « Effacer toutes mes données »). */
const GT_KEY = "monstyle_gouts";
let GT = (() => { try { const o = JSON.parse(localStorage.getItem(GT_KEY) || "{}"); const ok = v => v && typeof v === "object" && !Array.isArray(v) ? v : {}; return { c: ok(o.c), t: ok(o.t), k: ok(o.k), n: +o.n || 0 }; } catch (e) { return { c: {}, t: {}, k: {}, n: 0 }; } })();
const gtSave = () => { try { localStorage.setItem(GT_KEY, JSON.stringify(GT)); } catch (e) {} };
const gtNorm = v => String(v || "").trim().toLowerCase().slice(0, 40);
const gtFam = x => typeof grCat === "function" ? grCat(x.cat) : String(x.cat || "");
// Une réaction sur une tenue (liste d'identifiants de pièces de la garde-robe).
function gtNote(ids, poids) {
  if (!Array.isArray(ids) || !ids.length || typeof GR === "undefined") return;
  const add = (o, k) => { k = gtNorm(k); if (!k) return; o[k] = Math.max(-10, Math.min(10, Math.round(((o[k] || 0) + poids) * 10) / 10)); };
  let vu = 0;
  ids.forEach(id => { const x = (GR.items || []).find(i => i.id === id); if (!x) return; vu++; add(GT.c, x.couleur); add(GT.t, x.type || gtFam(x)); add(GT.k, gtFam(x)); });
  if (vu) { GT.n++; gtSave(); }
}
const gtTop = (o, sens) => Object.entries(o).filter(([, v]) => sens > 0 ? v >= 2 : v <= -2).sort((a, b) => sens > 0 ? b[1] - a[1] : a[1] - b[1]).slice(0, 4).map(([k]) => k);
function gtAppris() {
  return { aimeC: gtTop(GT.c, 1), aimeT: gtTop(GT.t, 1), eviteC: gtTop(GT.c, -1), eviteT: gtTop(GT.t, -1) };
}
const gtVide = () => { const a = gtAppris(); return !a.aimeC.length && !a.aimeT.length && !a.eviteC.length && !a.eviteT.length; };

// ——— Ce qu'Aura reçoit ———
if (typeof pfCtx === "function") {
  const pfCtxAvantGt = pfCtx;
  pfCtx = function () {
    const base = pfCtxAvantGt(), a = gtAppris(), p = [];
    if (a.aimeC.length || a.aimeT.length) p.push("elle choisit souvent " + [a.aimeC.length ? "ces couleurs : " + a.aimeC.join(", ") : "", a.aimeT.length ? "ces pièces : " + a.aimeT.join(", ") : ""].filter(Boolean).join(" ; "));
    if (a.eviteC.length || a.eviteT.length) p.push("elle rejette souvent " + [a.eviteC.length ? "ces couleurs : " + a.eviteC.join(", ") : "", a.eviteT.length ? "ces pièces : " + a.eviteT.join(", ") : ""].filter(Boolean).join(" ; "));
    if (!p.length) return base;
    return (base ? base + " ; " : "") + "ce que ses réactions montrent (appris de ses 👍/👎 et des tenues qu’elle garde ou porte) : " + p.join(" ; ");
  };
}
if (typeof pfRules === "function") {
  const pfRulesAvantGt = pfRules;
  pfRules = function () {
    const a = gtAppris(), r = [pfRulesAvantGt()];
    if (a.eviteC.length || a.eviteT.length) r.push("Évite autant que possible ce qu’elle rejette souvent : " + a.eviteC.concat(a.eviteT).join(", ") + ".");
    if (a.aimeC.length || a.aimeT.length) r.push("Quand c’est possible, appuie-toi sur ce qu’elle choisit souvent : " + a.aimeC.concat(a.aimeT).join(", ") + ".");
    return r.filter(Boolean).join(" ");
  };
}

// ——— Ce que la cliente voit (Mes préférences) ———
function gtHTML() {
  const a = gtAppris(), ch = (l, cls) => l.map(v => `<span class="gt-c ${cls}" data-noi18n>${esc(v)}</span>`).join("");
  if (gtVide()) return `<h2>Ce qu’Aura a appris de tes goûts</h2><p class="sub">Note les tenues d’Aura avec 👍 / 👎, enregistre celles que tu aimes : elle apprendra tes goûts toute seule.</p>`;
  return `<h2>Ce qu’Aura a appris de tes goûts</h2><p class="sub">D’après tes 👍 / 👎 et les tenues que tu gardes ou portes.</p>
  ${a.aimeC.length || a.aimeT.length ? `<p class="gt-l">Tu choisis souvent</p><div class="gt-w">${ch(a.aimeC.concat(a.aimeT), "on")}</div>` : ""}
  ${a.eviteC.length || a.eviteT.length ? `<p class="gt-l">Tu rejettes souvent</p><div class="gt-w">${ch(a.eviteC.concat(a.eviteT), "off")}</div>` : ""}
  <button class="link" data-gtwipe>Remettre à zéro ce qu’Aura a appris</button>`;
}
if (typeof P !== "undefined" && typeof P.prefs === "function") {
  const prefsAvantGt = P.prefs;
  P.prefs = (...x) => {
    const o = prefsAvantGt(...x);
    if (o && o.html) {
      o.html = o.html.replace("Ces choix restent sur ce téléphone (pas de synchronisation entre appareils).", "Ces choix sont gardés sur ce téléphone, et dans ton compte si tu en as créé un.");
      const i = o.html.indexOf("<h2>Ce qu’Aura a retenu de tes avis</h2>");
      o.html = i >= 0 ? o.html.slice(0, i) + gtHTML() + o.html.slice(i) : o.html.replace(/(<button class="link" data-pfwipe>|$)/, gtHTML() + "$1");
    }
    return o;
  };
}

// ——— Les réactions ———
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("[data-pfgood],[data-pfbad],[data-gsave],[data-jporte],[data-gtwipe]");
  if (!t) return;
  if (t.hasAttribute("data-gtwipe")) {
    e.preventDefault(); e.stopPropagation();
    if (!confirm(tr("Remettre à zéro ce qu’Aura a appris de tes goûts ?"))) return;
    GT = { c: {}, t: {}, k: {}, n: 0 }; gtSave(); toast("C’est remis à zéro"); render(false); return;
  }
  // 👍 / 👎 : une seule fois par tenue et par sens (le bouton déjà allumé ne compte pas deux fois)
  if (t.dataset.pfids && (t.hasAttribute("data-pfgood") || t.hasAttribute("data-pfbad"))) {
    const bon = t.hasAttribute("data-pfgood"), box = t.closest("[data-pfrate]"), deja = box && box.getAttribute("data-rated");
    if (deja === (bon ? "1" : "0")) return;
    const ids = t.dataset.pfids.split(",").filter(Boolean);
    if (deja === (bon ? "0" : "1")) gtNote(ids, bon ? 1 : -1); // changement d'avis : on annule l'ancien
    gtNote(ids, bon ? 1 : -1);
    return;
  }
  if (t.dataset.gsave && typeof GR !== "undefined") {
    const [occ, i] = t.dataset.gsave.split(":"), l = (GR.looks[occ] || [])[+i];
    if (l && t.getAttribute("aria-pressed") !== "true") gtNote(l.pieces, 0.5);
    return;
  }
  if (t.hasAttribute("data-jporte") && typeof JR !== "undefined" && JR.look && !JR.porte) gtNote(JR.look.pieces, 0.5);
}, true);

(function gtCSS() {
  const st = document.createElement("style");
  st.textContent = `.gt-l{margin:12px 0 6px;font-size:.86rem;font-weight:600;color:var(--muted,#6E6E6E)}
.gt-w{display:flex;flex-wrap:wrap;gap:6px}
.gt-c{padding:6px 12px;border-radius:999px;font-size:.88rem;background:#F5F5F5;color:#292421;border:1px solid #E6E6E6}
.gt-c.on{background:#F4EBDD;border-color:#E3CFA8}.gt-c.off{background:#F7E6E2;border-color:#EAC7BF;color:#7A2E22}`;
  document.head.appendChild(st);
})();
