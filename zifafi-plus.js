/* Zifafi Wedding (v112) — compléments de l'espace mariée, chargés APRÈS zifafi.js.
   Réutilise : le profil My Style (S.res : visage, silhouette, Kibbe, saison — via ok() et season()), Aura (zfAsk, send,
   S.cphoto + sendPhoto pour les photos, PROFIL() + zfCtx()), les formules existantes (GRATUIT, premium(), paywall()),
   l'inspiration privée (ZIDB) et les données « monstyle_zf » (ZD). Aucun nouveau profil, aucun nouvel assistant.
   Pages : zf_dress (3 façons de trouver sa robe), zf_expl (explorer les styles), zf_cat (accessoires, bouquet,
   coiffure et maquillage), zf_full (look complet), zf_chk (checklist), zf_tips (conseils et étiquette). */

// ——— Formules : couche de droits séparée. Elle s'appuie sur le système d'abonnement existant (index.html).
// Attention : ces droits sont vérifiés sur le téléphone ; ce n'est PAS une vérification de paiement sécurisée.
// Tant que GRATUIT = true (phase de test), tout est ouvert.
const ZF_FREE = { looks: 1 };
function zfPrem() { return (typeof GRATUIT !== "undefined" && GRATUIT) || (typeof premium === "function" && premium()); }
function zfCan(f) { if (zfPrem()) return true; if (f === "look+") return ZD.looks.length < ZF_FREE.looks; return true; }
const zfPremTag = () => typeof GRATUIT !== "undefined" && GRATUIT ? `<span class="zf-prem test">Premium · offert pendant le test</span>` : zfPrem() ? `<span class="zf-prem">Premium</span>` : `<span class="zf-prem">👑 Premium</span>`;

// ——— Profil My Style déjà fait (jamais recopié ni modifié par Zifafi) ———
function zfMS() {
  const g = k => typeof ok === "function" ? ok(k) : null, v = g("visage"), b = g("corps"), s = typeof season === "function" ? season() : null;
  return { visage: v && v.forme || "", corps: b && b.forme || "", kibbe: b && b.kibbe || "", saison: s || "", src: b && b.src || "" };
}
// Les silhouettes aimées comptent comme des choix de silhouette pour les propositions suivantes (sans toucher au profil enregistré).
function zfRecoProf(p) {
  if (!ZD.like.length) return p;
  const sil = [...new Set([...(p.silhouette || []).filter(x => x !== "nsp"), ...ZD.like])];
  return { ...p, silhouette: sil };
}
function zfProfileCard() {
  const m = zfMS(), p = ZD.prof, row = (l, v, todo) => `<div class="zf-rv-r"><span>${l}</span>${v ? `<em>${esc(v)}</em>` : `<i>${todo || "Pas encore"}</i>`}</div>`;
  const miss = ["visage", "corps", "saison"].filter(k => !m[k]);
  return `<section class="zf-card zf-ms"><div class="zf-card-h"><h2>Ton profil</h2></div>
   <div class="zf-ms-g"><div><p class="zf-kick2">My Style · déjà fait</p>
    ${row("Visage", m.visage)}${row("Silhouette", m.corps)}${m.kibbe ? row("Kibbe", m.kibbe) : ""}${row("Saison", m.saison)}
    ${miss.length ? `<p class="zf-hint"><span>${miss.includes("saison") ? "Fais ton analyse des couleurs pour des conseils de couleurs de mariée plus personnels." : "Complète tes analyses pour des conseils plus personnels."}</span> <span>Tu ne refais que ce qui manque.</span></p><button class="zf-lnk" data-zfms>Compléter mes analyses ›</button>` : `<p class="zf-hint">Aura s’en sert déjà : tu n’as rien à refaire.</p>`}</div>
   <div><p class="zf-kick2">Mon mariage</p>
    ${p ? row("Date", p.date) + row("Cérémonie", p.ceremony ? zfLabel("ceremony", p.ceremony) : "") + row("Lieu", p.setting ? zfLabel("setting", p.setting) : "") + row("Tenues", p.tenues ? zfLabel("tenues", p.tenues) : "") : `<p class="zf-hint">Pas encore rempli.</p>`}
    <button class="zf-lnk" data-zfprof="0">${p ? "Modifier mon mariage ›" : "Remplir ›"}</button></div></div>
   <p class="zf-priv">Tes préférences de mariée sont gardées à part : elles ne changent pas ton profil My Style.</p></section>`;
}
// Étape « silhouette » du profil mariée : proposer (sans l'imposer) la silhouette déjà trouvée par My Style.
function zfMSShape(d) {
  const m = zfMS(), sh = zfShapeFromMS(m.corps);
  if (!sh) return "";
  return `<div class="zf-card zf-mss"><p>Ta silhouette dans My Style : <b>${esc(m.corps)}</b>.</p><button type="button" class="zf-lnk" data-zfmsshape="${sh}" aria-pressed="${d.shape === sh}">${d.shape === sh ? "✓ Utilisée comme repère" : "L’utiliser comme repère"}</button></div>`;
}

// ——— Parcours, look en cours, checklist ———
function zfCurLook() { return ZD.looks.find(l => l.id === ZD.cur) || ZD.looks[0] || null; }
function zfLookFilled(L) { return (L.dress ? 1 : 0) + ZF_LOOK_CATS.filter(([k]) => L.sel[k]).length; }
function zfEnsureLook() {
  let L = zfCurLook(); if (L) return L;
  L = { id: zfId(), nom: tr("Mon look de mariée"), dress: ZD.saved[0] || null, pal: ZD.pal[0] || "", sel: Object.fromEntries(ZF_LOOK_CATS.map(([k]) => [k, ""])), notes: "", fav: false, d: zfToday(), ref: {} };
  ZD.looks.unshift(L); ZD.cur = L.id; return L;
}
function zfTasks() { return ZD.tasks || zfDefaultTasks(ZD.prof); }
function zfTasksMut() { if (!ZD.tasks) ZD.tasks = zfDefaultTasks(ZD.prof); return ZD.tasks; }
function zfJourney() {
  const L = zfCurLook(), s = L ? L.sel : {};
  const steps = [
    { t: "Mon profil", go: "zf_prof", ok: !!ZD.prof },
    { t: "Ma robe", go: "zf_dress", ok: ZD.saved.length > 0 || !!(L && L.dress) },
    { t: "Accessoires", go: "zf_cat:acc", ok: !!(s.voile || s.bijoux || s.chaussures) },
    { t: "Bouquet", go: "zf_cat:bouquet", ok: !!s.bouquet },
    { t: "Coiffure et make-up", go: "zf_cat:beaute", ok: !!(s.coiffure || s.makeup) },
    { t: "Look complet", go: "zf_full", ok: !!(L && zfLookFilled(L) >= ZF_LOOK_CATS.length + 1) },
    { t: "Checklist", go: "zf_chk", ok: zfTasks().some(t => t.done) }
  ];
  return { steps, done: steps.filter(x => x.ok).length };
}
const ZF_NAV = [["zf", "Aperçu"], ["zf_dress", "Ma robe"], ["zf_cat:acc", "Accessoires"], ["zf_cat:bouquet", "Bouquet"], ["zf_cat:beaute", "Coiffure et make-up"], ["zf_full", "Mon look complet"], ["zf_chk", "Checklist"], ["zf_tips", "Conseils et étiquette"]];
function zfNav(cur) {
  return `<nav class="zf-nav" aria-label="Sections de Zifafi Wedding"><div class="zf-nav-in">${ZF_NAV.map(([g, n]) => `<button type="button" data-zfgo="${g}" ${g === cur ? 'aria-current="page"' : ""}>${n}</button>`).join("")}</div></nav>`;
}

// ——— Ma robe : trois façons de commencer ———
const ZF_PHQ = {
  robes: ["Cette robe correspond-elle à mon style ?", "Quels accessoires me conseilles-tu avec cette robe ?", "Quel voile irait avec cette robe ?", "Quel bouquet irait avec cette robe ?", "Peux-tu me proposer trois styles proches ?", "Comment adapter cette robe à mes préférences ?"],
  accessoires: ["Cet accessoire va-t-il avec ma robe ?", "Avec quoi l’associer ?"],
  bouquets: ["Ce bouquet va-t-il avec ma robe et mes couleurs ?", "Que changer pour qu’il me ressemble plus ?"],
  coiffures: ["Cette coiffure irait-elle avec mon visage et mon voile ?", "Quel maquillage avec cette coiffure ?"]
};
const zfPhotoBtn = (cat, lbl) => `<label class="btn ghost zf-up">${lbl}<input type="file" accept="image/jpeg,image/png,image/webp" data-zfphoto="${cat}" hidden></label>`;
const zfKeepBox = () => `<label class="zf-keep"><input type="checkbox" data-zfkeepph ${S.zfKeepPh === false ? "" : "checked"}> Garder aussi la photo dans mon inspiration (sur ce téléphone)</label>`;
P.zf_dress = () => {
  const m = zfMS(), hint = zfSeasonHint(m.saison);
  return { back: true, html: `<div class="zf"><p class="step">Zifafi Wedding</p><h1>Trouver la robe de mes rêves</h1>${zfNav("zf_dress")}
   <p class="sub">Choisis comment commencer. Tu peux passer de l’une à l’autre à tout moment.</p>
   <section class="zf-mode"><span class="zf-num">A</span><div><h2>Aura, recommande-moi ma robe</h2><p>${m.corps || m.saison ? "À partir de ton profil de mariée, de ton profil My Style et des robes que tu as aimées. Chaque proposition est expliquée." : "À partir de ton profil de mariée et des robes que tu as aimées. Chaque proposition est expliquée."}</p>
    <button class="btn" data-zfreco>Recommander ma robe de rêve</button></div></section>
   <section class="zf-mode"><span class="zf-num">B</span><div><h2>Je sais ce que j’aime</h2><p>Explore les silhouettes, encolures, manches, tissus et couleurs. Tes choix guident ensuite les propositions d’Aura.</p>
    <button class="btn ghost" data-go="zf_expl">Explorer les styles de mariée</button></div></section>
   <section class="zf-mode"><span class="zf-num">C</span><div><h2>Une robe en photo</h2><p>Envoie la photo d’une robe : Aura décrit ce qu’elle voit et te dit comment elle peut aller avec ton style. Elle ne peut pas reconnaître la marque ni le prix.</p>
    ${zfPhotoBtn("robes", "Demander à Aura à propos d’une robe")}${zfKeepBox()}</div></section>
   ${hint ? `<p class="zf-hint">Repère de ta saison My Style (${esc(m.saison)}) : ${hint.whites.map(w => zfLabel("whites", w).toLowerCase()).join(", ")}, bijoux ${zfLabel("metal", hint.metal).toLowerCase()}. Tu restes libre de choisir autre chose.</p>` : ""}
   ${ZD.like.length ? `<p class="zf-hint">Tu as aimé : ${ZD.like.map(k => esc(ZF_SIL[k].nom)).join(", ")}. J’en tiens compte dans les propositions.</p>` : ""}
   ${ZD.saved.length ? `<button class="zf-lnk" data-go="zf_robe">Mes robes enregistrées (${ZD.saved.length}) ›</button>` : ""}</div>` };
};
// Explorer : les choix sont enregistrés directement dans les préférences de mariée (pas dans My Style).
const ZF_EXPL = [["silhouette", "Silhouette"], ["neckline", "Encolure"], ["sleeves", "Manches"], ["fabric", "Tissu"], ["whites", "Couleur"], ["aesthetic", "Style"]];
P.zf_expl = () => {
  const p = ZD.prof || zfCleanProf({}), n = ZF_EXPL.reduce((a, [k]) => a + (p[k] || []).filter(v => v !== "nsp").length, 0);
  const chips = k => `<div class="pk zf-pk" data-zfpk="${k}" role="group">${ZF[k].filter(([id]) => id !== "nsp").map(([id, l]) => `<button type="button" data-zfpv="${id}" aria-pressed="${(p[k] || []).includes(id)}">${k === "silhouette" ? `<span class="zf-sil">${zfDressSVG({ sil: id, neck: "rond", sleeve: "sans", train: "sans", color: "blanc", deco: "minimal" })}</span>` : ""}${esc(l)}</button>`).join("")}</div>`;
  return { back: true, html: `<div class="zf zf-form zf-expl"><p class="step">Ma robe · B</p><h1>Explorer les styles de mariée</h1>${zfNav("zf_dress")}
   <p class="sub">Touche tout ce qui te plaît, plusieurs choix possibles. Tu restes libre : ces choix passent avant les repères de morphologie ou de couleurs.</p>
   ${ZF_EXPL.map(([k, n]) => `<fieldset class="zf-q"><legend>${n}</legend>${chips(k)}</fieldset>`).join("")}
   ${zfGloss(["trapeze", "princesse", "ajustee", "droite", "empire", "bateau", "coeur", "mikado"])}
   <p class="zf-hint">Budget : l’app n’a pas de catalogue de prix. Tu peux indiquer ton budget dans ton profil de mariée pour orienter les conseils.</p></div>`,
    foot: `<div class="zf-foot">${n ? `<button class="btn ghost" data-zfexclr>Tout effacer</button>` : ""}<button class="btn" data-zfreco>${n ? `Voir mes propositions (${n} choix)` : "Voir mes propositions"}</button></div>` };
};

// ——— Accessoires, bouquet, coiffure et make-up ———
const ZF_CATS = {
  acc: { t: "Mes accessoires", slots: ["voile", "bijoux", "chaussures"], ins: "voiles", ph: "accessoires", intro: "Voile, bijoux, chaussures : les conseils s’adaptent à la robe de ton look. Pense aussi aux bracelets, tiares, sacs, ceintures et gants dans ton inspiration." },
  bouquet: { t: "Mon bouquet", slots: ["bouquet"], ins: "bouquets", ph: "bouquets", intro: "Choisis tes fleurs, tes couleurs et la forme du bouquet. Aura les accorde à ta robe et à ta palette." },
  beaute: { t: "Coiffure et make-up", slots: ["coiffure", "makeup"], ins: "coiffures", ph: "coiffures", intro: "Des idées, pas des règles : Aura tient compte de ta forme de visage, de tes couleurs et de ton voile." }
};
P.zf_cat = () => {
  const c = ZF_CATS[S.zfCat] || ZF_CATS.acc, key = ZF_CATS[S.zfCat] ? S.zfCat : "acc", L = zfCurLook(), o = zfLookOpts(ZD.prof, L && L.dress), m = zfMS(), p = ZD.prof || zfCleanProf({});
  const lookBar = ZD.looks.length > 1 ? `<div class="pk zf-pk" role="group" aria-label="Look">${ZD.looks.map(l => `<button type="button" data-zfcur="${l.id}" aria-pressed="${L && L.id === l.id}" data-noi18n>${esc(l.nom)}</button>`).join("")}</div>` : "";
  const slot = k => { const n = (ZF_LOOK_CATS.find(x => x[0] === k) || [])[1], cur = L ? L.sel[k] : "";
    return `<fieldset class="zf-q"><legend>${n}</legend><div class="zf-opts">${o[k].map(x => `<button type="button" class="zf-opt" data-zfpick="${k}" data-zfv="${x.id}" aria-pressed="${cur === x.id}"><b>${esc(x.t)}</b><small>${esc(x.w)}</small></button>`).join("")}</div></fieldset>`; };
  const prefs = key === "bouquet" ? ["fleurs", "bqstyle", "bouquet"].map(k => `<fieldset class="zf-q"><legend>${{ fleurs: "Mes fleurs préférées", bqstyle: "Style de bouquet", bouquet: "Couleurs du bouquet" }[k]}</legend><div class="pk zf-pk" data-zfpk="${k}" role="group">${ZF[k].map(([id, l]) => `<button type="button" data-zfpv="${id}" aria-pressed="${(p[k] || []).includes(id)}">${esc(l)}</button>`).join("")}</div></fieldset>`).join("") : "";
  const ctx = key === "beaute" ? `<div class="note">${m.visage ? `<p><span>Ta forme de visage (My Style) :</span> <b>${esc(m.visage)}</b></p>` : `<p>Ta forme de visage n’est pas encore analysée. <button class="zf-lnk" data-zfms>Faire l’analyse</button></p>`}${m.saison ? `<p><span>Ta saison :</span> <b>${esc(m.saison)}</b></p>` : ""}<button class="zf-lnk" data-go="beaute">Essai make-up My Style ›</button></div>` : "";
  const own = key === "acc" ? `<label class="lbl" for="zf_own">Ce que j’ai déjà <small>· facultatif</small></label><textarea class="field" id="zf_own" data-noi18n maxlength="300" rows="2" placeholder="Par exemple : boucles de ma mère, escarpins ivoire">${esc(ZD.own)}</textarea><p class="zf-hint">Aura s’en sert pour éviter les achats inutiles.</p>` : "";
  const ask = key === "acc" ? "Complète mon look de mariée : " : key === "bouquet" ? "Aide-moi à choisir mon bouquet de mariée pour ce look : " : "Aide-moi à choisir ma coiffure et mon maquillage de mariée pour ce look : ";
  return { back: true, html: `<div class="zf zf-form"><p class="step">Zifafi Wedding</p><h1>${c.t}</h1>${zfNav("zf_cat:" + key)}
   <p class="sub">${c.intro}</p>${ctx}
   ${L ? `<p class="zf-hint"><span>Pour le look :</span> <b data-noi18n>${esc(L.nom)}</b>${L.dress ? ` · <span>${esc(L.dress.nom)}</span>` : ` · <span>robe à décider</span>`}</p>${lookBar}` : `<p class="zf-hint">Ton choix crée ton premier look complet.</p>`}
   ${!L || !L.dress ? `<p class="zf-hint">Choisis une robe pour des conseils plus précis.</p><button class="zf-lnk" data-go="zf_dress">Trouver ma robe ›</button>` : ""}
   ${prefs}${c.slots.map(slot).join("")}${own}
   <h2 class="zf-h">Inspiration et photos</h2>
   <div class="zf-acts2">${zfPhotoBtn(c.ph, "Demander à Aura à propos d’une photo")}<button class="btn ghost" data-zfinsgo="${c.ins}">Mon inspiration</button></div>${zfKeepBox()}</div>`,
    foot: `<div class="zf-foot"><button class="btn" data-zfasklook="${esc(ask)}">${key === "acc" ? "Compléter mon look avec Aura" : "Demander à Aura"}</button></div>` };
};

// ——— Mon look complet ———
const ZF_FULLROWS = [["robe", "Robe", "zf_dress"], ["voile", "Voile", "zf_cat:acc"], ["bijoux", "Bijoux", "zf_cat:acc"], ["chaussures", "Chaussures", "zf_cat:acc"], ["coiffure", "Coiffure", "zf_cat:beaute"], ["makeup", "Maquillage", "zf_cat:beaute"], ["bouquet", "Bouquet", "zf_cat:bouquet"]];
P.zf_full = () => {
  if (ZINS === null) zfLoadIns();
  const L = zfCurLook();
  if (!L) return { back: true, html: `<div class="zf"><p class="step">Zifafi Wedding</p><h1>Mon look complet</h1>${zfNav("zf_full")}
   <div class="zf-start"><h2>Ton look tient sur une seule page</h2><p>Robe, voile, bijoux, chaussures, coiffure, maquillage, bouquet et couleurs : choisis chaque élément, ajoute tes photos et demande à Aura de vérifier l’ensemble.</p><button class="btn" data-zffullnew>Créer mon look complet</button></div></div>` };
  const o = zfLookOpts(ZD.prof, L.dress), pal = ZF_PALS.find(p => p.id === L.pal), co = zfCoherence(L), img = id => (ZINS || []).find(x => x.id === id);
  const row = ([k, n, g]) => { const val = k === "robe" ? (L.dress ? L.dress.nom + " · " + L.dress.dirNom : "") : ((o[k] || []).find(x => x.id === L.sel[k]) || {}).t || "", r = img((L.ref || {})[k]);
    return `<div class="zf-fr"><div class="zf-fr-t"><span>${n}</span>${val ? `<b>${esc(val)}</b>` : `<i>À décider</i>`}</div>
     ${r ? `<img src="${r.img}" alt="${esc(n)}" class="zf-fr-img" loading="lazy">` : ""}
     <div class="zf-fr-a"><button type="button" data-zfgo="${g}">${val ? "Changer" : "Choisir"}</button><label class="zf-fr-ph">${r ? "Autre photo" : "Photo"}<input type="file" accept="image/jpeg,image/png,image/webp" data-zfref="${k}" hidden></label>${r ? `<button type="button" data-zfrefdel="${k}">Retirer la photo</button>` : ""}</div></div>`; };
  const more = ZD.looks.length >= ZF_FREE.looks && !zfPrem();
  return { back: true, html: `<div class="zf zf-full"><p class="step">Zifafi Wedding</p><h1>Mon look complet</h1>${zfNav("zf_full")}
   <div class="pk zf-pk" role="group" aria-label="Mes looks">${ZD.looks.map(l => `<button type="button" data-zfcur="${l.id}" aria-pressed="${l.id === L.id}" data-noi18n>${esc(l.nom)}</button>`).join("")}<button type="button" data-zffullnew>+ Nouveau look</button></div>
   <p class="zf-hint"><span>Plusieurs cérémonies ou changements de tenue ? Crée un look pour chacun.</span> ${zfPremTag()}</p>
   <div class="zf-frs">${ZF_FULLROWS.map(row).join("")}
    <div class="zf-fr"><div class="zf-fr-t"><span>Couleurs</span>${pal ? `<b>${esc(pal.nom)}</b><span class="zf-mini">${pal.c.map(c => `<i style="background:${c}"></i>`).join("")}</span>` : `<i>À décider</i>`}</div><div class="zf-fr-a"><button type="button" data-go="zf_col">${pal ? "Changer" : "Choisir"}</button>${!pal && ZD.pal.length ? ZD.pal.slice(0, 3).map(id => `<button type="button" data-zffullpal="${id}">${esc((ZF_PALS.find(p => p.id === id) || {}).nom || "")}</button>`).join("") : ""}</div></div></div>
   <label class="lbl" for="zf_fnotes">Notes et préférences</label><textarea class="field" id="zf_fnotes" maxlength="300" rows="3" data-noi18n>${esc(L.notes)}</textarea>
   ${co.length ? `<h2 class="zf-h">Petits repères</h2><ul class="zf-ul">${co.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="zf-hint">Ce sont des pistes : c’est toi qui décides.</p>` : ""}
   <div class="zf-acts"><button type="button" data-zflkedit="${L.id}">Modifier le nom et les détails</button><button type="button" data-zflkdup="${L.id}">Garder une alternative</button>${ZD.looks.length > 1 ? `<button type="button" data-go="zf_looks">Comparer mes looks</button>` : ""}</div>
   ${more ? `<p class="zf-hint">La version gratuite garde ${ZF_FREE.looks} look. Plusieurs looks font partie de Premium.</p>` : ""}</div>`,
    foot: `<div class="zf-foot"><button class="btn" data-zfreview>Demander à Aura de vérifier l’ensemble</button></div>` };
};

// ——— Ma checklist ———
P.zf_chk = () => {
  const T = zfTasks(), date = ZD.prof && ZD.prof.date, n = zfDays(), today = zfToday(), done = T.filter(t => t.done).length;
  const curPer = n === null ? "" : (ZF_PER.find(p => n >= p[3] && n <= p[2]) || ZF_PER[n > 365 ? 0 : ZF_PER.length - 1])[0];
  const item = t => { const due = t.due || zfTaskDue(date, t.per), late = due && due < today && !t.done, user = t.own || t.ed;
    if (S.zfEdit === t.id) return `<li class="zf-tk ed"><label class="lbl" for="zf_tkt">Titre</label><input class="field" id="zf_tkt" maxlength="100" value="${esc(user ? t.t : tr(t.t))}">
      <label class="lbl" for="zf_tkd">Date</label><input class="field" type="date" id="zf_tkd" value="${esc(t.due || due)}">
      <label class="lbl" for="zf_tkn">Note</label><input class="field" id="zf_tkn" maxlength="200" value="${esc(t.note)}">
      <label class="lbl" for="zf_tkp">Période</label><select class="field" id="zf_tkp">${ZF_PER.map(p => `<option value="${p[0]}" ${p[0] === t.per ? "selected" : ""}>${p[1]}</option>`).join("")}</select>
      <div class="zf-acts"><button type="button" data-zftksave="${t.id}">Enregistrer</button><button type="button" data-zftkcancel>Annuler</button><button type="button" data-zftkdel="${t.id}">Supprimer</button></div></li>`;
    return `<li class="zf-tk ${t.done ? "done" : ""}"><button type="button" role="checkbox" aria-checked="${t.done}" data-zftk="${t.id}"><i aria-hidden="true">${t.done ? "✓" : ""}</i><span ${user ? "data-noi18n" : ""}>${esc(t.t)}</span></button>
     <div class="zf-tk-m">${due ? `<small class="${late ? "late" : ""}">${late ? "<span>En retard</span> · " : ""}<span data-noi18n>${esc(due)}</span></small>` : ""}${t.note ? `<small data-noi18n>${esc(t.note)}</small>` : ""}<button type="button" class="zf-lnk" data-zftkedit="${t.id}" aria-label="Modifier la tâche">Modifier</button></div></li>`; };
  return { back: true, html: `<div class="zf zf-chk"><p class="step">Zifafi Wedding</p><h1>Ma checklist</h1>${zfNav("zf_chk")}
   <div class="zf-jour-h"><b>${done} tâches faites sur ${T.length}</b></div>
   <div class="zf-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${T.length}" aria-valuenow="${done}" aria-label="Progression de la checklist"><i style="width:${T.length ? done / T.length * 100 : 0}%"></i></div>
   ${date ? `<p class="zf-hint"><span>Dates conseillées d’après la date de ton mariage :</span> <b data-noi18n>${esc(date)}</b>. <span>Tu peux les changer.</span></p>` : `<p class="zf-hint">Ajoute la date de ton mariage dans ton profil pour voir des dates conseillées.</p><button class="zf-lnk" data-zfprof="0">Ajouter la date ›</button>`}
   ${ZF_PER.map(([id, nom]) => { const l = T.filter(t => t.per === id); if (!l.length) return ""; const d = l.filter(t => t.done).length;
     return `<details class="zf-per" ${!curPer || id === curPer || S.zfPerOpen === id ? "open" : ""}><summary><b>${nom}</b><span>${d} / ${l.length}</span>${id === curPer ? `<em>Maintenant</em>` : ""}</summary><ul>${l.map(item).join("")}</ul></details>`; }).join("")}
   <h2 class="zf-h">Ajouter une tâche</h2>
   <label class="lbl" for="zf_tknew">Ma tâche</label><input class="field" id="zf_tknew" maxlength="100" placeholder="Par exemple : choisir le parfum">
   <label class="lbl" for="zf_tknp">Période</label><select class="field" id="zf_tknp">${ZF_PER.map(p => `<option value="${p[0]}" ${p[0] === (curPer || "p3") ? "selected" : ""}>${p[1]}</option>`).join("")}</select>
   <button class="btn ghost" data-zftkadd>Ajouter</button>
   <p class="zf-priv">Pas de rappel automatique : l’app ne t’envoie pas de notification quand elle est fermée. Ta checklist reste sur ce téléphone.</p></div>` };
};

// ——— Conseils et étiquette ———
function zfTipList() {
  const q = (S.zfTipQ || "").trim().toLowerCase(), c = S.zfTipC || "", sav = !!S.zfTipSav;
  const l = ZF_TIPS.filter(t => (!c || t[1] === c) && (!sav || ZD.tipSav.includes(t[0])) && (!q || (tr(t[2]) + " " + tr(t[3]) + " " + t[2] + " " + t[3]).toLowerCase().includes(q)));
  if (!l.length) return `<p class="zf-empty">${tr(sav && !ZD.tipSav.length ? "Aucun conseil enregistré pour l’instant. Touche ☆ pour en garder un." : "Aucun conseil ne correspond à ta recherche.")}</p>`;
  return l.map(t => `<article class="zf-tipc"><div><small>${esc(tr((ZF_TIPCATS.find(x => x[0] === t[1]) || [])[1] || ""))}</small><h3>${esc(tr(t[2]))}</h3><p>${esc(tr(t[3]))}</p></div><button type="button" class="zf-fav" data-zftip="${t[0]}" aria-pressed="${ZD.tipSav.includes(t[0])}" aria-label="${esc(tr("Enregistrer ce conseil"))}">${ZD.tipSav.includes(t[0]) ? "★" : "☆"}</button></article>`).join("");
}
P.zf_tips = () => {
  const p = ZD.prof, trad = p && p.traditions && p.traditions.length ? p.traditions.map(t => zfLabel("traditions", t)).join(", ") : "";
  return { back: true, html: `<div class="zf zf-tipsp"><p class="step">Zifafi Wedding</p><h1>Conseils et étiquette</h1>${zfNav("zf_tips")}
   <button class="zf-mod" data-go="zf_acad"><span class="zf-mod-i">${zfIco.acad}</span><span class="zf-mod-t"><b>Académie de l’élégance</b><small>Marcher, s’asseoir, la traîne, le voile, les photos, accueillir tes invités</small></span><span class="zf-chev" aria-hidden="true">›</span></button>
   <div class="note">${trad ? `<p><span>Tes traditions :</span> <b>${esc(trad)}</b> · <span>Les coutumes changent d’une famille à l’autre : vérifie les détails avec tes proches.</span></p>` : `<p>Il n’existe pas d’étiquette unique : indique tes traditions dans ton profil pour des conseils plus adaptés.</p><button class="zf-lnk" data-zfprof="0">Mes traditions ›</button>`}</div>
   <label class="lbl" for="zf_tipq">Rechercher un conseil</label><input class="field" id="zf_tipq" type="search" value="${esc(S.zfTipQ || "")}" placeholder="Par exemple : retouches">
   <div class="fchips zf-filt" role="group" aria-label="Catégories"><button type="button" data-zftipc="" aria-pressed="${!S.zfTipC}">Tout</button>${ZF_TIPCATS.map(([id, n]) => `<button type="button" data-zftipc="${id}" aria-pressed="${S.zfTipC === id}">${n}</button>`).join("")}<button type="button" data-zftipsav aria-pressed="${!!S.zfTipSav}">★ Enregistrés</button></div>
   <div id="zf_tips" class="zf-tips" data-noi18n>${zfTipList()}</div>
   <p class="zf-hint">Version gratuite : les conseils essentiels. Des guides plus détaillés et des conseils personnalisés pourront venir avec Premium.</p></div>` };
};

// ——— Aura : questions sur une photo en mode mariée ———
{ const prev = zfChatSug; zfChatSug = function () {
  if (S.zfCtx === "mariee" && S.cphoto) { const q = ZF_PHQ[S.zfPhCat] || ZF_PHQ.robes;
    return `<div class="ch-sug" role="group" aria-label="Questions sur ta photo">${q.map(x => `<button type="button" data-chsay="${esc(x)}">${esc(x)}</button>`).join("")}</div>`; }
  return prev(); }; }
async function zfKeepPhoto(file, cat, titre) {
  const b64 = await shrink(file, 1024), it = { id: zfId(), cat, titre: tr(titre).slice(0, 60), note: "", fav: false, img: "data:image/jpeg;base64," + b64, d: new Date().toISOString() };
  await ZIDB.put(it); if (ZINS) ZINS.unshift(it); ZD.insN = (ZD.insN || 0) + 1; zfSave(); return it;
}
function zfPhotoOK(f) {
  if (!f) return false;
  if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { toast("Ce format n’est pas accepté : choisis une image JPEG, PNG ou WebP."); return false; }
  if (f.size > 15 * 1024 * 1024) { toast("Image trop lourde : 15 Mo maximum."); return false; }
  return true;
}

// ——— Clics ———
function zfGo(g) { const [pg, cat] = String(g).split(":"); if (cat) S.zfCat = cat; if (pg === S.page && (!cat || pg !== "zf_cat")) return; if (pg === S.page) { S.dir = "f"; render(false); window.scrollTo(0, 0); return; } go(pg); }
function zfPrefSet(k, v) {
  ZD.prof = ZD.prof || zfCleanProf({}); const a = ZD.prof[k], i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v);
  zfSave();
}
function zfLookAsk(prefix) {
  const L = zfCurLook(); zfAsk(tr(prefix) + (L ? zfLookTxt(L) : tr("pas encore de look")) + "." + (ZD.own ? " " + tr("J’ai déjà : ") + ZD.own + "." : "") + " " + tr("Explique comment les pièces vont ensemble et ne me propose d’acheter que ce qui manque vraiment."));
}
// Plusieurs looks : limite de la version gratuite (vérifiée avant les actions de zifafi.js, phase de capture).
document.addEventListener("click", e => {
  const t = e.target.closest("[data-zflkdup],[data-zffullnew],[data-zflksave]"); if (!t) return;
  const isNew = t.dataset.zflksave !== undefined ? !(S.zfLook && S.zfLook.id) : true;
  if (isNew && !zfCan("look+")) { e.stopImmediatePropagation(); e.preventDefault(); toast("Plusieurs looks font partie de Premium."); if (typeof paywall === "function") paywall("zf"); }
}, true);
document.addEventListener("click", e => {
  const t = e.target.closest("button,label,input[type=checkbox]"); if (!t) return; const ds = t.dataset;
  if (ds.zfgo) { zfGo(ds.zfgo); return; }
  if (ds.zfms !== undefined) { if (typeof startOnb === "function") startOnb(); return; }
  if (ds.zfmsshape) { if (S.zfDraft) { S.zfDraft.shape = S.zfDraft.shape === ds.zfmsshape ? "" : ds.zfmsshape; S.zfDraft.skipShape = false; } zfKeep(); return; }
  if (ds.zfreco !== undefined) { if (!ZD.prof) { S.zfDraft = zfCleanProf({}); S.zfStep = 0; go("zf_prof"); toast("Commence par quelques questions : je ne devine rien."); return; } S.zfShow = true; go("zf_robe"); return; }
  if (ds.zfpv !== undefined) { const box = t.closest("[data-zfpk]"); if (!box) return; zfPrefSet(box.dataset.zfpk, ds.zfpv); t.setAttribute("aria-pressed", String(ZD.prof[box.dataset.zfpk].includes(ds.zfpv))); if (S.page === "zf_expl") zfKeep(); return; }
  if (ds.zfexclr !== undefined) { if (ZD.prof) { ZF_EXPL.forEach(([k]) => { ZD.prof[k] = []; }); zfSave(); } zfKeep(); return; }
  if (ds.zflike) { const i = ZD.like.indexOf(ds.zflike); if (i >= 0) { ZD.like.splice(i, 1); toast("Retiré de ce que tu aimes"); } else { ZD.like.push(ds.zflike); while (ZD.like.length > 5) ZD.like.shift(); toast("C’est noté : j’en tiens compte"); } zfSave(); zfKeep(); return; }
  if (ds.zfpick) { const L = zfEnsureLook(); L.sel[ds.zfpick] = L.sel[ds.zfpick] === ds.zfv ? "" : ds.zfv; zfSave(); toast(L.sel[ds.zfpick] ? "Ajouté à ton look" : "Retiré de ton look"); zfKeep(); return; }
  if (ds.zfcur) { ZD.cur = ds.zfcur; zfSave(); zfKeep(); return; }
  if (ds.zffullnew !== undefined) { const L = { id: zfId(), nom: tr("Mon look") + " " + (ZD.looks.length + 1), dress: ZD.saved[0] || null, pal: "", sel: Object.fromEntries(ZF_LOOK_CATS.map(([k]) => [k, ""])), notes: "", fav: false, d: zfToday(), ref: {} }; ZD.looks.unshift(L); ZD.cur = L.id; if (zfSave()) toast("Look créé"); zfKeep(); return; }
  if (ds.zffullpal) { const L = zfCurLook(); if (!L) return; L.pal = ds.zffullpal; zfSave(); zfKeep(); return; }
  if (ds.zfrefdel) { const L = zfCurLook(); if (!L || !L.ref) return; delete L.ref[ds.zfrefdel]; zfSave(); zfKeep(); return; }
  if (ds.zfreview !== undefined) { const n = document.getElementById("zf_fnotes"), L = zfCurLook(); if (L && n) { L.notes = n.value.slice(0, 300); zfSave(); } zfLookAsk("Vérifie mon look de mariée complet et dis-moi s’il est cohérent : "); return; }
  if (ds.zfasklook) { const o = document.getElementById("zf_own"); if (o) { ZD.own = o.value.slice(0, 300).trim(); zfSave(); } zfLookAsk(ds.zfasklook); return; }
  if (ds.zfinsgo) { S.zfInsF = ds.zfinsgo; S.zfInsD = { cat: ds.zfinsgo, titre: "", note: "" }; go("zf_insp"); return; }
  if (ds.zfkeepph !== undefined) { S.zfKeepPh = t.checked; return; }
  if (ds.zftk) { const T = zfTasksMut(), x = T.find(y => y.id === ds.zftk); if (!x) return; x.done = !x.done; S.zfPerOpen = x.per; zfSave(); zfKeep(); return; }
  if (ds.zftkedit) { S.zfEdit = ds.zftkedit; S.zfPerOpen = (zfTasks().find(y => y.id === ds.zftkedit) || {}).per; zfKeep(); const f = document.getElementById("zf_tkt"); if (f) f.focus(); return; }
  if (ds.zftkcancel !== undefined) { S.zfEdit = null; zfKeep(); return; }
  if (ds.zftksave) { const T = zfTasksMut(), x = T.find(y => y.id === ds.zftksave); if (!x) return; const v = id => (document.getElementById(id) || {}).value || "";
    const nt = v("zf_tkt").trim().slice(0, 100); if (nt && nt !== tr(x.t) && nt !== x.t) { x.t = nt; x.ed = true; }
    x.due = /^\d{4}-\d{2}-\d{2}$/.test(v("zf_tkd")) ? v("zf_tkd") : ""; x.note = v("zf_tkn").slice(0, 200); if (ZF_PER.some(p => p[0] === v("zf_tkp"))) x.per = v("zf_tkp");
    S.zfEdit = null; S.zfPerOpen = x.per; if (zfSave()) toast("Tâche enregistrée"); zfKeep(); return; }
  if (ds.zftkdel) { if (!confirm(tr("Supprimer cette tâche ?"))) return; ZD.tasks = zfTasksMut().filter(y => y.id !== ds.zftkdel); S.zfEdit = null; zfSave(); toast("Tâche supprimée"); zfKeep(); return; }
  if (ds.zftkadd !== undefined) { const i = document.getElementById("zf_tknew"), pr = document.getElementById("zf_tknp"), v = i ? i.value.trim().slice(0, 100) : ""; if (!v) { toast("Écris d’abord ta tâche."); if (i) i.focus(); return; }
    const T = zfTasksMut(); if (T.length >= 80) { toast("Ta checklist est pleine (80 tâches)."); return; } const per = pr && ZF_PER.some(p => p[0] === pr.value) ? pr.value : "p3";
    T.push({ id: "u" + zfId(), per, t: v, due: "", note: "", done: false, own: true }); S.zfPerOpen = per; if (zfSave()) toast("Tâche ajoutée"); zfKeep(); return; }
  if (ds.zftipc !== undefined) { S.zfTipC = ds.zftipc; zfKeep(); return; }
  if (ds.zftipsav !== undefined) { S.zfTipSav = !S.zfTipSav; zfKeep(); return; }
  if (ds.zftip) { const i = ZD.tipSav.indexOf(ds.zftip); if (i >= 0) ZD.tipSav.splice(i, 1); else ZD.tipSav.push(ds.zftip); zfSave(); toast(i >= 0 ? "Conseil retiré" : "Conseil enregistré"); const l = document.getElementById("zf_tips"); if (l) l.innerHTML = zfTipList(); return; }
});
document.addEventListener("input", e => {
  if (e.target.id === "zf_tipq") { S.zfTipQ = e.target.value.slice(0, 60); const l = document.getElementById("zf_tips"); if (l) l.innerHTML = zfTipList(); }
});
document.addEventListener("change", async e => {
  const el = e.target; if (!el || !el.matches) return;
  if (el.id === "zf_fnotes") { const L = zfCurLook(); if (L) { L.notes = el.value.slice(0, 300); zfSave(); } return; }
  if (el.id === "zf_own") { ZD.own = el.value.slice(0, 300).trim(); zfSave(); return; }
  if (el.matches("[data-zfphoto]")) {
    const f = el.files && el.files[0], cat = el.dataset.zfphoto; el.value = ""; if (!zfPhotoOK(f)) return;
    if (S.zfKeepPh !== false) { try { await zfKeepPhoto(f, cat, "Photo montrée à Aura"); } catch (er) { toast("La photo n’a pas pu être gardée dans ton inspiration."); } }
    S.zfPhCat = cat; S.cphoto = { file: f, url: URL.createObjectURL(f) }; zfSetCtx("mariee"); S.draft = tr((ZF_PHQ[cat] || ZF_PHQ.robes)[0]); go("chat");
    toast("Choisis une question ou écris la tienne, puis touche Envoyer."); return;
  }
  if (el.matches("[data-zfref]")) {
    const f = el.files && el.files[0], k = el.dataset.zfref; el.value = ""; if (!zfPhotoOK(f)) return; const L = zfCurLook(); if (!L) return;
    const cat = { robe: "robes", voile: "voiles", bijoux: "bijoux", chaussures: "chaussures", coiffure: "coiffures", makeup: "makeup", bouquet: "bouquets" }[k] || "looks";
    try { const it = await zfKeepPhoto(f, cat, (ZF_FULLROWS.find(r => r[0] === k) || [])[1] || "Photo"); L.ref = L.ref || {}; L.ref[k] = it.id; zfSave(); toast("Photo ajoutée à ton look"); zfKeep(); }
    catch (er) { toast("L’image n’a pas pu être ajoutée. Essaie une autre image."); }
  }
});
