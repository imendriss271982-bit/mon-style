/* My Style — Profil de style d'Aura.
   Ce fichier garde UNIQUEMENT ce que la cliente choisit elle-même (rien n'est deviné) :
   couleurs aimées / évitées, pièces portées / évitées, coupes, occasions habituelles,
   préférence de mode pudique, note libre, et ses avis sur les tenues.
   Tout reste sur son téléphone (localStorage « monstyle_pref »), modifiable et effaçable.
   pfCtx() résume ces préférences pour Aura (voix, chat, tenues), pfRules() donne les règles strictes aux prompts,
   pfFit() ajuste le classement de la boutique. Chargé APRÈS le script principal (utilise S, P, render, toast, esc…). */

const PF_KEY = "monstyle_pref";
const PF_COULEURS = [["Noir","#141414"],["Blanc","#F7F5F0"],["Beige","#D9C3A5"],["Camel","#C19A6B"],["Marron","#6B4226"],["Gris","#8C8C8C"],
  ["Marine","#1C2D5A"],["Bleu","#3D6FB6"],["Vert","#4F7A4F"],["Kaki","#7A7A45"],["Rouge","#C0262D"],["Bordeaux","#6E1230"],
  ["Rose","#E79AB0"],["Fuchsia","#E0218A"],["Violet","#6E3E8F"],["Lavande","#C7B8E0"],["Jaune","#E8C547"],["Orange","#E57A3A"],
  ["Doré","#C9A24A"],["Argenté","#B8BCC2"]];
const PF_PIECES = ["Robes","Pantalons","Jeans","Jupes","Abayas","Jumpsuits","Blazers","Kaftans","Talons","Baskets","Ballerines"];
const PF_PIECE_CAT = {Robes:"robe",Pantalons:"pantalon",Jupes:"jupe",Abayas:"abaya",Blazers:"veste"};
const PF_COUPES = ["Ajustée","Fluide","Oversize","Structurée"];
const PF_OCCASIONS = ["Travail","Réunions","Quotidien","Week-end","Soirées","Mariages","Ramadan","Aïd","Voyage","Sport"];
const PF_PUDEUR = [["","Pas de préférence"],["couvrant","Tenues couvrantes"],["hijab","Couvrantes, avec hijab"],["abaya","Abaya au quotidien"]];
const PF_PUDEUR_REGLE = {
  couvrant: "tenues couvrantes : manches longues ou trois-quarts, longueur midi ou maxi, pas de décolleté, pas de transparence, coupes non moulantes",
  hijab: "elle porte le hijab : tenues couvrantes (manches longues, longueur maxi, pas de décolleté ni de transparence, coupes fluides) et couleurs du hijab coordonnées à la tenue",
  abaya: "elle porte l’abaya au quotidien : proposer l’abaya comme pièce principale, avec ce qu’on porte dessous, chaussures, sac et accessoires coordonnés"
};
const PF_MAX_AVIS = 30;

// ——— Chargement validé : un enregistrement abîmé ne casse jamais l'app ———
function pfClean(raw) {
  const o = raw && typeof raw === "object" ? raw : {};
  const list = (v, allowed) => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === "string" && allowed.includes(x)))] : [];
  const cNames = PF_COULEURS.map(c => c[0]);
  const aime = list(o.aime, cNames), evite = list(o.evite, cNames).filter(c => !aime.includes(c));
  const porte = list(o.porte, PF_PIECES), evitePieces = list(o.evitePieces, PF_PIECES).filter(p => !porte.includes(p));
  const avis = Array.isArray(o.avis) ? o.avis.filter(a => a && typeof a.txt === "string" && a.txt.trim()).slice(0, PF_MAX_AVIS)
    .map(a => ({ id: String(a.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6)), ok: !!a.ok, txt: a.txt.trim().slice(0, 160), d: String(a.d || "").slice(0, 10) })) : [];
  return {
    aime, evite, porte, evitePieces,
    coupes: list(o.coupes, PF_COUPES),
    occasions: list(o.occasions, PF_OCCASIONS),
    pudeur: PF_PUDEUR.some(p => p[0] === o.pudeur) ? o.pudeur : "",
    note: typeof o.note === "string" ? o.note.slice(0, 200) : "",
    avis
  };
}
let PF = (() => { try { return pfClean(JSON.parse(localStorage.getItem(PF_KEY) || "null")); } catch (e) { return pfClean(null); } })();
function pfSave() { try { localStorage.setItem(PF_KEY, JSON.stringify(PF)); return true; } catch (e) { return false; } }
const pfEmpty = () => !PF.aime.length && !PF.evite.length && !PF.porte.length && !PF.evitePieces.length && !PF.coupes.length && !PF.occasions.length && !PF.pudeur && !PF.note && !PF.avis.length;

// Un avis de la cliente sur une tenue (👍 / 👎). Le même texte n'est gardé qu'une fois, le plus récent en premier.
function pfAvis(ok, txt) {
  txt = String(txt || "").trim().slice(0, 160); if (!txt) return;
  PF.avis = [{ id: Date.now().toString(36), ok: !!ok, txt, d: new Date().toISOString().slice(0, 10) }, ...PF.avis.filter(a => a.txt !== txt)].slice(0, PF_MAX_AVIS);
  pfSave();
}

// ——— Ce qu'Aura sait des préférences (ajouté au profil envoyé à Aura) ———
function pfCtx() {
  const p = [], low = a => a.join(", ").toLowerCase();
  if (PF.aime.length) p.push("couleurs qu’elle aime : " + low(PF.aime));
  if (PF.evite.length) p.push("couleurs qu’elle évite : " + low(PF.evite));
  if (PF.porte.length) p.push("pièces qu’elle aime porter : " + low(PF.porte));
  if (PF.evitePieces.length) p.push("pièces qu’elle ne porte pas : " + low(PF.evitePieces));
  if (PF.coupes.length) p.push("coupes préférées : " + low(PF.coupes));
  if (PF.occasions.length) p.push("ses occasions habituelles : " + low(PF.occasions));
  if (PF.pudeur) p.push("mode pudique : " + PF_PUDEUR_REGLE[PF.pudeur]);
  if (PF.note) p.push("à savoir (écrit par elle) : " + PF.note);
  const ok = PF.avis.filter(a => a.ok).slice(0, 5).map(a => "« " + a.txt + " »"), ko = PF.avis.filter(a => !a.ok).slice(0, 5).map(a => "« " + a.txt + " »");
  if (ok.length) p.push("tenues qu’elle a aimées : " + ok.join(", "));
  if (ko.length) p.push("tenues qu’elle n’a pas aimées : " + ko.join(", "));
  return p.join(" ; ");
}
// Règles strictes pour les prompts de tenues.
function pfRules() {
  const r = [];
  if (PF.pudeur) r.push("Respecte strictement sa préférence de mode pudique (" + PF_PUDEUR_REGLE[PF.pudeur] + ").");
  if (PF.evite.length) r.push("N’utilise pas ces couleurs sauf si elle le demande : " + PF.evite.join(", ").toLowerCase() + ".");
  if (PF.evitePieces.length) r.push("Ne propose pas ces pièces : " + PF.evitePieces.join(", ").toLowerCase() + ".");
  if (PF.aime.length) r.push("Favorise ses couleurs préférées quand c’est possible : " + PF.aime.join(", ").toLowerCase() + ".");
  if (PF.avis.some(a => !a.ok)) r.push("Évite de reproduire les tenues qu’elle n’a pas aimées.");
  return r.join(" ");
}

// ——— Influence sur la boutique : bonus / malus ajoutés au score artFit ———
const pfHexD = (a, b) => { const h = x => [1, 3, 5].map(i => parseInt(x.substr(i, 2), 16)); const p = h(a), q = h(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const pfNear = (hex, names) => names.some(n => { const c = PF_COULEURS.find(x => x[0] === n); return c && pfHexD(hex, c[1]) < 70; });
function pfFit(a) {
  let sc = 0; const why = [];
  if (PF.aime.length && pfNear(a.hex, PF.aime)) { sc += 1; why.push("c’est une couleur que tu aimes"); }
  if (PF.evite.length && pfNear(a.hex, PF.evite)) { sc -= 3; why.push("attention, c’est une couleur que tu évites"); }
  const avoidCats = PF.evitePieces.map(p => PF_PIECE_CAT[p]).filter(Boolean), likeCats = PF.porte.map(p => PF_PIECE_CAT[p]).filter(Boolean);
  if (avoidCats.includes(a.cat)) sc -= 3; else if (likeCats.includes(a.cat)) sc += 1;
  if ((PF.pudeur === "abaya" || PF.pudeur === "hijab") && a.cat === "abaya") sc += 1;
  return { sc, why };
}

// ——— Page « Mes préférences de style » ———
P.prefs = () => {
  const sw = (k, other) => `<div class="pf-sw" data-pfk="${k}">${PF_COULEURS.map(c => {
    const on = PF[k].includes(c[0]), off = PF[other].includes(c[0]);
    return `<button type="button" data-pfv="${esc(c[0])}" aria-pressed="${on}" ${off ? 'data-pfoff' : ''} aria-label="${esc(c[0])}"><i style="background:${c[1]}"></i><span>${esc(c[0])}</span></button>`;
  }).join("")}</div>`;
  const chips = (k, list) => `<div class="pk" data-pfk="${k}">${list.map(v => `<button type="button" data-pfv="${esc(v)}" aria-pressed="${PF[k].includes(v)}">${esc(v)}</button>`).join("")}</div>`;
  const avis = PF.avis.length ? `<h2>Ce qu’Aura a retenu de tes avis</h2><div class="pf-av">${PF.avis.map(a => `<div class="pf-a"><span aria-hidden="true">${a.ok ? "👍" : "👎"}</span><p>${esc(a.txt)}</p><button type="button" data-pfdel="${esc(a.id)}" aria-label="Supprimer cet avis">×</button></div>`).join("")}</div>` : "";
  return { back: true, html: `<p class="step">Mon profil</p><h1>Mes préférences de style</h1>
  <p class="sub">Dis à Aura ce que tu aimes. Elle s’en sert pour la boutique, tes tenues et ses conseils. Tout est enregistré tout de suite, et tu peux tout changer.</p>
  <h2>Couleurs que j’aime</h2>${sw("aime", "evite")}
  <h2>Couleurs que j’évite</h2>${sw("evite", "aime")}
  <h2>J’aime porter</h2>${chips("porte", PF_PIECES)}
  <h2>Je ne porte pas</h2>${chips("evitePieces", PF_PIECES)}
  <h2>Coupes préférées</h2>${chips("coupes", PF_COUPES)}
  <h2>Mes occasions habituelles</h2>${chips("occasions", PF_OCCASIONS)}
  <h2>Mode pudique</h2><div class="pk" data-pfone="pudeur">${PF_PUDEUR.map(p => `<button type="button" data-pfv="${esc(p[0])}" aria-pressed="${PF.pudeur === p[0]}">${esc(p[1])}</button>`).join("")}</div>
  <label class="lbl" for="pf_note">Autre chose à savoir <small>· facultatif</small></label>
  <textarea class="field pf-note" id="pf_note" maxlength="200" rows="2" placeholder="Par exemple : je préfère les talons bas">${esc(PF.note)}</textarea>
  ${avis}
  ${pfEmpty() ? "" : `<button class="link" data-pfwipe>Effacer toutes mes préférences</button>`}`,
    say: "Dis-moi ce que tu aimes, " + NOM + ". Tes couleurs, les pièces que tu portes, et tes occasions. Je m’en souviendrai pour te conseiller." };
};

document.addEventListener("click", e => {
  const t = e.target.closest("[data-pfv],[data-pfdel],[data-pfwipe],[data-pfgood],[data-pfbad]"); if (!t) return;
  if (t.dataset.pfdel !== undefined) { PF.avis = PF.avis.filter(a => a.id !== t.dataset.pfdel); pfSave(); toast("Avis supprimé"); pfRender(); return; }
  if (t.hasAttribute("data-pfwipe")) { if (!confirm(tr("Effacer toutes tes préférences de style ?"))) return; PF = pfClean(null); pfSave(); toast("Préférences effacées"); render(false); return; }
  if (t.dataset.pfgood !== undefined || t.dataset.pfbad !== undefined) { const ok = t.dataset.pfgood !== undefined; pfAvis(ok, ok ? t.dataset.pfgood : t.dataset.pfbad); toast(ok ? "Noté : tu aimes ce look" : "Noté : je t’en proposerai d’autres"); t.closest("[data-pfrate]")?.setAttribute("data-rated", ok ? "1" : "0"); return; }
  const one = t.closest("[data-pfone]"); if (one) { PF[one.dataset.pfone] = t.dataset.pfv; pfSave(); pfRefresh(); return; }
  const box = t.closest("[data-pfk]"); if (!box) return;
  const k = box.dataset.pfk, v = t.dataset.pfv, a = PF[k], i = a.indexOf(v);
  if (i < 0) a.push(v); else a.splice(i, 1);
  // Une couleur ou une pièce ne peut pas être à la fois aimée et évitée.
  const pair = { aime: "evite", evite: "aime", porte: "evitePieces", evitePieces: "porte" }[k];
  if (pair && i < 0) PF[pair] = PF[pair].filter(x => x !== v);
  pfSave(); pfRefresh();
});
// Met à jour les boutons sans recharger la page (la cliente garde sa place en faisant défiler).
function pfRefresh() {
  document.querySelectorAll("[data-pfk]").forEach(box => { const k = box.dataset.pfk, pair = { aime: "evite", evite: "aime" }[k];
    box.querySelectorAll("[data-pfv]").forEach(b => { b.setAttribute("aria-pressed", String(PF[k].includes(b.dataset.pfv))); if (pair) b.toggleAttribute("data-pfoff", PF[pair].includes(b.dataset.pfv)); }); });
  document.querySelectorAll("[data-pfone]").forEach(box => box.querySelectorAll("[data-pfv]").forEach(b => b.setAttribute("aria-pressed", String(PF[box.dataset.pfone] === b.dataset.pfv))));
}
// Re-rendu en gardant la position de défilement (suppression d'un avis).
function pfRender() { const y = window.scrollY; render(false); window.scrollTo(0, y); }
document.addEventListener("input", e => { if (e.target.id === "pf_note") { PF.note = e.target.value.slice(0, 200); pfSave(); } });
