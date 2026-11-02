/* My Style — « Avant d'acheter » : le shopping vérifié (v141, étape « 8/10 » face à ChatGPT/Gemini).
   Avant un achat, Aura répond à 3 questions avec le profil ET la vraie garde-robe de la cliente :
     1) Elle te va ?  2) Tu as déjà pareil ?  3) Avec quoi la porter (et combien de tenues) ?
   puis donne un verdict : Bon achat / À réfléchir / Pas pour l'instant, et le coût par port si elle donne le prix.
   Deux entrées :
   - Page `P.achat` : photo d'une pièce vue en magasin ou en ligne → Gemini (via le Worker) lit la pièce,
     note si elle lui va et choisit les pièces de SA garde-robe (ids vérifiés). « Je l'ai achetée » l'ajoute à la garde-robe.
   - Fiche d'un article de la vitrine (`P.art`) : même vérification, calculée sur le téléphone (pas d'IA, instantané).
   La photo n'est jamais gardée sauf si la cliente ajoute la pièce à sa garde-robe.
   Chargé APRÈS aura-jour.js (utilise S, P, GR, GR_TOP, GR_BOT, GR_FULL, grCat, grImg, grThumb, grKeep, grSave,
   artFit, ART, hexRGB, season, SEASONS, ok, PAYS, pays, getSample, REF, PROFIL, pfRules, FMT, isVip, paywall, say, toast, render, esc, cap, norm). */

// Familles de pièces : sert à trouver un doublon (même famille + couleur proche) et les pièces qui vont avec.
const AC_FAM = c => c === "top" ? "haut" : (c === "bas" ? "pantalon" : c);
const AC_AVEC = {
  haut: ["pantalon", "jupe", "veste", "chaussures", "sac"],
  pantalon: ["haut", "veste", "chaussures", "sac"],
  jupe: ["haut", "veste", "chaussures", "sac"],
  robe: ["veste", "chaussures", "sac", "accessoire"],
  abaya: ["robe", "haut", "pantalon", "chaussures", "sac"],
  veste: ["haut", "pantalon", "jupe", "robe"],
  chaussures: ["robe", "pantalon", "jupe", "abaya"],
  sac: ["robe", "pantalon", "jupe", "abaya"],
  accessoire: ["robe", "haut", "abaya"]
};
// Les pièces « principales » qui font une tenue avec elle (pour compter les tenues possibles).
const AC_PRINC = { haut: ["pantalon", "jupe"], pantalon: ["haut"], jupe: ["haut"], veste: ["haut", "robe"], robe: ["robe"], abaya: ["abaya"], chaussures: ["robe", "abaya", "haut"], sac: ["robe", "abaya", "haut"], accessoire: ["robe", "abaya", "haut"] };

const acRGB = h => /^#[0-9a-f]{6}$/i.test(h || "") ? hexRGB(h) : null;
const acDist = (a, b) => { const x = acRGB(a), y = acRGB(b); return x && y ? Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) : 999; };
// Neutres (noir, blanc, crème, beige, camel, gris, marine…) : vont avec tout.
function acNeutre(h, nom) {
  if (/noir|blanc|cr[eè]me|ivoire|beige|nude|camel|gris|marine|taupe|sable|black|white|cream|ivory|grey|gray|navy/i.test(nom || "")) return true;
  const c = acRGB(h); if (!c) return false;
  const mx = Math.max(...c), mn = Math.min(...c), sat = mx ? (mx - mn) / mx : 0;
  return sat < 0.28 || mx < 60;
}
// Deux couleurs vont ensemble si l'une est neutre, si elles sont proches, ou si les deux sont dans sa palette de saison.
function acAccord(a, b) {
  if (acNeutre(a.hex, a.couleur) || acNeutre(b.hex, b.couleur)) return true;
  if (acDist(a.hex, b.hex) < 90) return true;
  const s = typeof season === "function" ? season() : null;
  if (s && SEASONS[s]) { const inPal = h => SEASONS[s].c.some(x => acDist(x[0], h) < 60); return inPal(a.hex) && inPal(b.hex); }
  return false;
}
// Pièce de la garde-robe très proche (même famille et même couleur) = doublon probable.
function acDoublons(p) {
  const fam = AC_FAM(p.cat), nc = norm(p.couleur);
  return GR.items.filter(x => !x.wait && !x.todo && AC_FAM(x.cat) === fam &&
    (acDist(x.hex, p.hex) < 45 || (nc && norm(x.couleur) === nc)));
}
// Pièces de sa garde-robe qui vont avec, et nombre de tenues possibles.
function acAvec(p) {
  const fam = AC_FAM(p.cat), cats = AC_AVEC[fam] || [], princ = AC_PRINC[fam] || [];
  const ok2 = GR.items.filter(x => !x.wait && !x.todo && cats.includes(AC_FAM(x.cat)) && acAccord(p, x));
  ok2.sort((a, b) => cats.indexOf(AC_FAM(a.cat)) - cats.indexOf(AC_FAM(b.cat)));
  const nbPrinc = ok2.filter(x => princ.includes(AC_FAM(x.cat))).length;
  // Une robe ou une abaya fait une tenue à elle seule ; sinon une tenue par pièce principale qui va avec.
  const nb = fam === "robe" || fam === "abaya" ? 1 + Math.min(4, ok2.filter(x => ["veste", "chaussures"].includes(AC_FAM(x.cat))).length) : nbPrinc;
  return { pieces: ok2, nb };
}

// Verdict : fit = 2 (lui va très bien), 1 (lui va), 0 (pas la plus flatteuse), -1 (inconnu, pas d'analyse).
function acVerdict(fit, dup, nb, gardeOk) {
  if (dup) return { k: "reflechir", t: "À réfléchir", l: "Tu as déjà une pièce très proche : garde ton argent pour autre chose." };
  if (fit === 0) return { k: "non", t: "Pas pour l’instant", l: "Elle n’est pas la plus flatteuse pour toi." };
  if (gardeOk && nb === 0) return { k: "reflechir", t: "À réfléchir", l: "Elle n’irait avec rien de ta garde-robe : il faudrait acheter d’autres pièces." };
  if (fit === -1 || !gardeOk) return { k: "reflechir", t: "À réfléchir", l: "Complète ton profil pour un avis complet." };
  return { k: "oui", t: "Bon achat", l: "Elle te va et elle va avec ce que tu as déjà." };
}
const acGardeOk = () => GR.items.filter(x => !x.wait && !x.todo).length >= 3;
const acNbTxt = nb => nb === 0 ? "Elle ne va avec aucune pièce de ta garde-robe pour l’instant." : nb === 1 ? "Elle va avec une pièce de ta garde-robe." : `Elle va avec ${nb} pièces de ta garde-robe.`;

// Bloc commun du résultat (vitrine et photo).
function acBloc(r) {
  const v = r.verdict, mini = arr => `<div class="ac-ph">${arr.slice(0, 4).map(x => `<figure>${grImg(x)}<figcaption>${esc(x.nom || grCat(x.cat))}</figcaption></figure>`).join("")}</div>`;
  const prix = r.prix > 0 ? (() => { const fois = Math.max(3, Math.min(40, (r.nb || 1) * 3)), cur = PAYS[pays()].cur, pp = r.prix / fois;
    return `<div class="ac-q"><b>Coût par port</b><p>Si tu la portes ${fois} fois cette année : ${pp >= 10 ? Math.round(pp) : pp.toFixed(1)} ${cur} par port.</p></div>`; })() : "";
  return `<section class="ac-res ac-${v.k}"><span class="ac-v">${v.t}</span><p class="ac-vl">${v.l}</p>
   <div class="ac-q"><b>Elle te va ?</b><p>${r.fitTxt}</p></div>
   <div class="ac-q"><b>Tu as déjà pareil ?</b>${!r.gardeOk ? `<p>Ajoute tes vêtements pour savoir si tu as déjà pareil et avec quoi la porter.</p>` : r.dup.length ? `<p>Oui : ${esc(r.dup.map(x => x.nom || grCat(x.cat)).join(", "))}</p>${mini(r.dup)}` : `<p>Non, elle apporte du nouveau.</p>`}</div>
   ${r.gardeOk ? `<div class="ac-q"><b>Avec quoi la porter</b><p>${acNbTxt(r.avec.length)}</p>${r.avec.length ? mini(r.avec) : ""}${r.conseil ? `<p class="ac-c">${esc(r.conseil)}</p>` : ""}</div>` : ""}
   ${prix}</section>`;
}

// ——— Vitrine : vérification sur le téléphone, ajoutée à la fiche de l'article ———
function acArticle(a) {
  const f = artFit(a), p = { cat: a.cat, hex: a.hex, couleur: a.coul }, gardeOk = acGardeOk();
  const dup = gardeOk ? acDoublons(p) : [], av = gardeOk ? acAvec(p) : { pieces: [], nb: 0 };
  const fit = !f.known ? -1 : f.sc >= 2 ? 2 : f.sc >= 1 ? 1 : 0;
  return { verdict: acVerdict(fit, dup.length > 0, av.nb, gardeOk), dup, avec: av.pieces, nb: av.nb, gardeOk,
    fitTxt: f.why.length ? cap(f.why.join(" et ")) + "." : f.known ? "Elle n’est pas la plus flatteuse pour toi." : "Fais ton analyse pour savoir si elle te va." };
}
if (typeof P.art === "function") {
  const artAvant = P.art;
  P.art = () => {
    const o = artAvant(), a = ART(S.art) || CATALOGUE[0];
    o.html = o.html.replace(/<div class="card"><b>La trouver chez nos partenaires<\/b>/, `<h2 class="ac-h">Avant d’acheter</h2>${acBloc(acArticle(a))}$&`);
    return o;
  };
}

// ——— Boutique : carte d'entrée vers la vérification par photo ———
if (typeof P.boutique === "function") {
  const boutAvant = P.boutique;
  P.boutique = () => {
    const o = boutAvant();
    const carte = `<button class="ac-entree" data-view="achat"><span class="ac-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span>
     <span class="ac-et"><small>Avant d’acheter</small><b>Ça vaut le coup ?</b><em>Prends la pièce en photo : je te dis si elle te va, si tu as déjà pareil et avec quoi la porter.</em></span><span class="hx-chev" aria-hidden="true">›</span></button>`;
    o.html = o.html.replace(/(<p class="sub">[\s\S]*?<\/p>)/, `$1${carte}`);
    return o;
  };
}

// ——— Page photo « Ça vaut le coup ? » ———
let AC = { photo: null, url: "", prix: "", res: null, ajoute: 0 };
function acReset() { if (AC.url) try { URL.revokeObjectURL(AC.url); } catch (e) {} AC = { photo: null, url: "", prix: "", res: null, ajoute: 0 }; S.acErr = ""; }

async function acVerifier() {
  if (typeof isVip === "function" && !isVip()) return paywall("achat");
  if (!AC.photo || S.acBusy) return;
  const sm = await getSample();
  if (!sm || !sm.json) { toast("La vérification n’est pas disponible ici."); return; }
  const prixEl = document.getElementById("ac_prix"); if (prixEl) AC.prix = prixEl.value;
  S.acBusy = 1; S.acErr = ""; render(false); say("Je regarde la pièce et ta garde-robe, une seconde.");
  const gardeOk = acGardeOk(), it = GR.items.filter(x => !x.wait && !x.todo);
  const pr = REF + " Tu es styliste personnelle. La cliente envisage d’acheter la pièce sur la photo (en magasin ou en ligne). Identifie la pièce principale. Si ce n’est pas un vêtement, des chaussures, un sac ou un accessoire, réponds {\"erreur\":\"Je ne vois pas de vêtement sur cette photo.\"}. " +
    "Dis honnêtement si elle lui va selon son profil : " + (PROFIL() || "profil inconnu (dis-le, sans inventer)") + ". " + (typeof pfRules === "function" ? pfRules() : "") +
    (gardeOk ? " Puis, UNIQUEMENT avec les identifiants de sa garde-robe ci-dessous : « similaires » = les pièces qu’elle a déjà et qui font presque doublon (même type, couleur proche), sinon liste vide ; « avec » = jusqu’à 4 pièces qui vont avec pour faire des tenues. N’invente aucune pièce.\nGarde-robe :\n" + it.map(x => x.id + " : " + grCat(x.cat).toLowerCase() + ", " + (x.nom || "") + (x.couleur ? ", " + x.couleur : "")).join("\n") + "\n" : " Elle n’a pas encore de garde-robe enregistrée : laisse « similaires » et « avec » vides. ") +
    "Le pourquoi et le conseil tiennent chacun en UNE phrase courte. Pas de marque ni de prix inventés. " + FMT +
    'Format : {"categorie":"haut, pantalon, jupe, robe, veste, abaya, chaussures, sac ou accessoire","nom":"2 à 4 mots","couleur":"1 à 2 mots","hex":"#RRGGBB","note":"0 à 10 : à quel point elle lui va","pourquoi":"1 phrase","similaires":["id"],"avec":["id"],"conseil":"1 phrase : comment la porter avec ses pièces"}';
  try {
    const r = await sm.json(pr, { images: [AC.photo] });
    if (r && r.erreur) throw new Error(r.erreur);
    const cats = ["haut", "pantalon", "jupe", "robe", "veste", "abaya", "chaussures", "sac", "accessoire"];
    const p = { cat: cats.includes(r && r.categorie) ? r.categorie : "haut", nom: String((r && r.nom) || "Pièce").slice(0, 40), couleur: String((r && r.couleur) || "").slice(0, 24), hex: /^#[0-9a-f]{6}$/i.test((r && r.hex) || "") ? r.hex : "" };
    const by = id => it.find(x => x.id === String(id));
    // Doublons : ce que l'IA a vu + la vérification sur le téléphone (on ne garde que de vraies pièces).
    const dup = gardeOk ? [...new Map([...((r.similaires || []).map(by).filter(Boolean)), ...acDoublons(p)].map(x => [x.id, x])).values()] : [];
    const avIA = gardeOk ? (r.avec || []).map(by).filter(Boolean).filter(x => !dup.includes(x)) : [];
    const loc = gardeOk ? acAvec(p) : { pieces: [], nb: 0 };
    const avec = avIA.length ? avIA : loc.pieces, nb = Math.max(loc.nb, avIA.length ? Math.min(avIA.length, 6) : 0);
    const note = Math.max(0, Math.min(10, Math.round(+r.note || 0))), known = !!(ok("corps") || ok("visage") || season() || (typeof pfEmpty === "function" && !pfEmpty()));
    const fit = !known ? -1 : note >= 7 ? 2 : note >= 5 ? 1 : 0;
    AC.res = { p, verdict: acVerdict(fit, dup.length > 0, nb, gardeOk), dup, avec, nb, gardeOk, prix: parseFloat(String(AC.prix).replace(",", ".")) || 0,
      conseil: String(r.conseil || ""), fitTxt: (known ? `Elle te va : ${note}/10. ` : "") + String(r.pourquoi || "") };
    S.acBusy = 0;
    if (S.page === "achat") { render(false); say(AC.res.verdict.t + ". " + AC.res.verdict.l); }
  } catch (e) {
    S.acBusy = 0; S.acErr = errMsg(e);
    if (S.page === "achat") { render(false); say(S.acErr); }
  }
}

// « Je l'ai achetée » : la pièce entre dans la garde-robe, avec sa photo réduite (comme un ajout normal).
async function acAjouter() {
  if (!AC.res || AC.ajoute || !AC.photo) return;
  let img = ""; try { img = await grThumb(AC.photo); } catch (e) {}
  const p = AC.res.p, it = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), img, cat: p.cat, nom: p.nom, couleur: p.couleur, hex: p.hex, wait: 0 };
  if (img) await grKeep(it);
  GR.items.unshift(it); GR.looks = {};
  if (!grSave()) { GR.items.shift(); return; }
  AC.ajoute = 1; toast("Ajoutée à ta garde-robe");
  const y = window.scrollY; render(false); window.scrollTo(0, y);
}

P.achat = () => {
  const r = AC.res;
  const photo = AC.url ? `<div class="ac-prev"><img src="${AC.url}" alt="Pièce à vérifier"></div>` : "";
  let corps;
  if (S.acBusy) corps = photo + `<div class="note">Je vérifie la pièce…</div>`;
  else if (r) corps = photo + `<p class="ac-nom">${esc(r.p.nom)}${r.p.couleur ? " · " + esc(r.p.couleur) : ""}</p>` + acBloc(r) +
    (AC.ajoute ? `<p class="ac-ok">Ajoutée à ta garde-robe ✓</p>` : `<button class="btn ghost ac-add" data-aadd>Je l’ai achetée : ajouter à ma garde-robe</button>`);
  else corps = `${photo}<label class="ac-pick"><input type="file" accept="image/*" capture="environment" data-aphoto hidden><span class="ac-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></span><b>${AC.url ? "Changer de photo" : "Prendre la pièce en photo"}</b></label>
   <p class="hint">Prends une photo nette de la pièce, seule, à la lumière.</p>
   <label class="ac-lab" for="ac_prix">Prix (facultatif)</label><input class="field" id="ac_prix" inputmode="decimal" placeholder="${PAYS[pays()].cur}" value="${esc(AC.prix)}">
   ${S.acErr ? `<div class="note">${esc(S.acErr)}</div>` : ""}`;
  return { back: true,
    html: `<p class="step">Avant d’acheter</p><h1>Ça vaut le coup ?</h1>
   <p class="sub">Prends la pièce en photo : je te dis si elle te va, si tu as déjà pareil et avec quoi la porter.</p>${corps}`,
    say: r || S.acBusy ? "" : "Prends la pièce en photo, et je te dis si elle vaut le coup.",
    foot: S.acBusy ? "" : r ? `<button class="btn" data-anew>Vérifier une autre pièce</button>` : AC.photo ? `<button class="btn" data-ago>Vérifier</button>` : "" };
};
if (typeof DOCK_OF !== "undefined") DOCK_OF.achat = "boutique";

addEventListener("change", e => {
  const t = e.target.closest && e.target.closest("[data-aphoto]"); if (!t) return;
  const f = t.files && t.files[0]; if (!f) return;
  const prixEl = document.getElementById("ac_prix"); if (prixEl) AC.prix = prixEl.value;
  if (AC.url) try { URL.revokeObjectURL(AC.url); } catch (er) {}
  AC.photo = f; AC.url = URL.createObjectURL(f); AC.res = null; AC.ajoute = 0; S.acErr = "";
  render(false);
});
addEventListener("input", e => { if (e.target && e.target.id === "ac_prix") AC.prix = e.target.value; });
addEventListener("click", e => {
  const t = e.target.closest("[data-ago],[data-anew],[data-aadd]"); if (!t) return;
  if (t.hasAttribute("data-ago")) return acVerifier();
  if (t.hasAttribute("data-anew")) { acReset(); render(false); return; }
  if (t.hasAttribute("data-aadd")) return acAjouter();
});

(function acCSS() {
  const st = document.createElement("style");
  st.textContent = `
.ac-entree{display:flex;align-items:center;gap:14px;width:100%;margin:14px 0 4px;padding:14px 16px;border:0;border-radius:16px;background:var(--surface);color:var(--ink);text-align:start;font:inherit;cursor:pointer;box-shadow:0 2px 10px rgba(140,109,53,.12)}
.ac-ic{flex:none;display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--soft)}
.ac-ic svg{width:24px;height:24px;fill:none;stroke:var(--accent);stroke-width:1.7;stroke-linejoin:round}
.ac-et{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.ac-et small{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.ac-et b{font-size:1.05rem}.ac-et em{font-style:normal;font-size:.85rem;color:var(--muted);line-height:1.35}
.ac-h{margin:18px 0 8px}
.ac-pick{display:flex;align-items:center;gap:14px;padding:16px;border:1.5px dashed var(--accent);border-radius:16px;background:var(--surface);color:var(--ink);cursor:pointer;margin:12px 0 6px}
.ac-lab{display:block;margin:14px 0 6px;font-size:.9rem;color:var(--muted)}
.ac-prev img{display:block;width:100%;max-height:300px;object-fit:contain;border-radius:16px;background:var(--surface);margin:12px 0}
.ac-nom{font-weight:600;margin:4px 0 10px}
.ac-res{display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:16px;background:var(--surface);box-shadow:0 2px 10px rgba(140,109,53,.12);margin-bottom:12px}
.ac-v{align-self:flex-start;padding:6px 14px;border-radius:999px;font-weight:700;font-size:.95rem;background:var(--soft);color:var(--accent)}
.ac-oui .ac-v{background:#E6F2E1;color:#2F6B2A}.ac-non .ac-v{background:#F7E6E2;color:#9A3B2B}
.ac-vl{margin:0;font-size:.95rem;line-height:1.45}
.ac-q{border-top:1px solid var(--line);padding-top:10px}
.ac-q b{font-size:.95rem}.ac-q p{margin:4px 0 0;font-size:.9rem;line-height:1.45}
.ac-c{color:var(--muted)}
.ac-ph{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px;margin-top:8px}
.ac-ph figure{margin:0;display:flex;flex-direction:column;gap:3px}
.ac-ph img,.ac-ph .gr-ph{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:10px;background:var(--soft);display:block}
.ac-ph figcaption{font-size:.72rem;color:var(--muted);line-height:1.2}
.ac-add{width:100%}
.ac-ok{text-align:center;padding:12px;border-radius:999px;background:var(--soft);color:var(--accent);font-weight:600}
`;
  document.head.appendChild(st);
})();
