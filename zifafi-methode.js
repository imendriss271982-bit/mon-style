/* My Style × ZIFAFI — My Wedding : méthode de stylisme mariée (logique seule, aucun affichage).
   Ce fichier contient les choix du questionnaire mariée, le nettoyage des données et le moteur de
   recommandation à RÈGLES SIMPLES (ce n'est pas une IA entraînée) : chaque suggestion dit quelles réponses
   de la mariée l'ont influencée. Les préférences déclarées passent toujours en premier ; la catégorie de
   silhouette (étape facultative) ne sert qu'à départager, jamais seule, jamais pour interdire.
   Pas de marque, de prix ni de disponibilité inventés. Chargé AVANT zifafi.js. Testable dans Node. */

// ——— Choix du questionnaire (id → libellé français ; traduits par zifafi-i18n.js) ———
const ZF = {
  ceremony: [["civile","Civile"],["religieuse","Religieuse"],["traditionnelle","Traditionnelle"],["mixte","Mixte"],["autre","Autre"],["nsp","Je ne sais pas encore"]],
  traditions: [["golfe","Golfe / Khaleeji"],["maghreb","Maghrébine"],["levant","Levantine"],["egypte","Égyptienne"],["asie","Sud-asiatique"],["occident","Occidentale"],["autre","Autre"]],
  setting: [["salle","Salle ou hôtel"],["jardin","Jardin, plein air"],["plage","Plage"],["maison","Maison familiale"],["culte","Lieu de culte"],["nsp","Je ne sais pas encore"]],
  events: [["henne","Henné"],["ceremonie","Cérémonie"],["zaffa","Zaffa, entrée"],["reception","Réception"],["soiree","Soirée"],["mairie","Mairie"]],
  aesthetic: [["classique","Élégance classique"],["minimal","Minimalisme moderne"],["romantique","Romantique"],["royal","Royal et spectaculaire"],["traditionnel","Traditionnel"],["contemp","Traditionnel contemporain"],["boheme","Bohème"],["modeste","Élégance pudique"],["glamour","Glamour de soirée"]],
  imagine: [["volume","Une robe de princesse"],["fluide","Une robe fluide et légère"],["sculpte","Une robe sculptée, structurée"],["epure","Une robe épurée, sans détail"],["nsp","Je ne sais pas"]],
  silhouette: [["trapeze","Trapèze (A-line)"],["princesse","Princesse (robe de bal)"],["ajustee","Ajustée puis évasée (sirène)"],["droite","Droite, colonne"],["empire","Empire (taille haute)"],["nsp","Je ne sais pas"]],
  sleeves: [["longues","Manches longues"],["courtes","Manches courtes"],["sans","Sans manches"],["amovibles","Manches amovibles"],["nsp","Je ne sais pas"]],
  neckline: [["bateau","Bateau"],["v","En V"],["rond","Rond"],["carre","Carré"],["coeur","Décolleté cœur"],["montant","Montant"],["epaules","Épaules dénudées"],["nsp","Je ne sais pas"]],
  train: [["longue","Longue traîne"],["courte","Courte traîne"],["sans","Sans traîne"],["nsp","Je ne sais pas"]],
  fabric: [["dentelle","Dentelle"],["broderie","Broderie"],["satin","Satin"],["tulle","Tulle"],["crepe","Crêpe"],["mikado","Mikado"],["nsp","Je ne sais pas"]],
  deco: [["minimal","Minimaliste"],["equilibre","Équilibrée"],["riche","Richement ornée"],["nsp","Je ne sais pas"]],
  movement: [["essentiel","Essentielle"],["important","Importante"],["secondaire","Secondaire"]],
  highlight: [["epaules","Épaules"],["clavicules","Clavicules"],["taille","Taille"],["dos","Dos"],["bras","Bras"],["visage","Visage"],["ensemble","Silhouette d’ensemble"]],
  cover: [["bras","Bras"],["epaules","Épaules"],["decollete","Décolleté"],["dos","Dos"],["jambes","Jambes"],["aucune","Aucune préférence"]],
  sleeveCover: [["complete","Jusqu’au poignet"],["mi","Mi-longues"],["legere","Légère, sur l’épaule"],["aucune","Sans"]],
  neckCover: [["montant","Montant, couvrant"],["modere","Modéré"],["ouvert","Ouvert"]],
  waist: [["marquee","Bien marquée"],["legere","Légèrement marquée"],["libre","Non marquée"]],
  volume: [["pres","Près du corps"],["modere","Volume modéré"],["ample","Ample"]],
  structure: [["souple","Souple, fluide"],["equilibre","Équilibrée"],["structure","Structurée"]],
  balance: [["confort","Le confort d’abord"],["equilibre","Équilibre"],["formel","La formalité d’abord"]],
  shape: [["A","Silhouette en A"],["V","Épaules en V"],["H","Silhouette plus droite"],["X","Taille définie, courbes équilibrées"],["autre","Autre ou je ne sais pas"]],
  whites: [["blanc","Blanc pur"],["casse","Blanc cassé"],["ivoire","Ivoire"],["champagne","Champagne"],["nude","Nude"],["couleur","Une robe de couleur"],["nsp","Je ne sais pas"]],
  temp: [["chaud","Plutôt chaudes"],["froid","Plutôt froides"],["neutre","Neutres"],["nsp","Je ne sais pas"]],
  metal: [["or","Or"],["argent","Argent"],["orrose","Or rose"],["mix","Métaux mélangés"]],
  bouquet: [["blanc","Blanc"],["creme","Crème, ivoire"],["pastel","Pastels"],["poudre","Rose poudré"],["bordeaux","Bordeaux, rouge"],["vert","Feuillage vert"],["colore","Coloré"]],
  makeup: [["naturel","Naturel"],["softglam","Soft glam"],["classique","Classique mariée"],["soiree","Soirée, plus intense"]]
};
// Champs à choix unique (les autres sont à choix multiple) et champs texte libres.
const ZF_ONE = ["ceremony","setting","imagine","train","deco","movement","sleeveCover","neckCover","waist","volume","structure","balance","shape","temp","makeup"];
const ZF_TXT = { tradNote: 160, fitNote: 160, inclure: 120, eviter: 120 };
const zfLabel = (k, id) => { const o = (ZF[k] || []).find(x => x[0] === id); return o ? o[1] : ""; };

// Petit glossaire pour les termes de mode (affiché sous les choix).
const ZF_GLOSS = {
  trapeze: "Trapèze (A-line) : le buste suit le corps, la jupe s’évase doucement dès la taille, comme la lettre A.",
  princesse: "Princesse : buste ajusté et grande jupe volumineuse, souvent portée avec un jupon.",
  ajustee: "Sirène : la robe suit le corps jusqu’aux hanches ou aux genoux puis s’évase.",
  droite: "Colonne : une ligne droite et fluide, du buste à l’ourlet.",
  empire: "Empire : la couture est placée juste sous la poitrine, la jupe tombe librement.",
  bateau: "Encolure bateau : une ligne horizontale d’une épaule à l’autre, près des clavicules.",
  coeur: "Encolure cœur : le haut du bustier dessine deux arrondis.",
  cathedrale: "Voile cathédrale : le plus long, il traîne derrière la robe sur plus d’un mètre.",
  chapelle: "Voile chapelle : il touche le sol et dépasse légèrement l’ourlet.",
  doigts: "Voile bout des doigts : il s’arrête au niveau des mains, bras le long du corps.",
  mikado: "Mikado : une soie épaisse et mate qui garde bien sa forme."
};

// ——— Nettoyage : un enregistrement abîmé ne bloque jamais l'app ———
function zfCleanProf(o) {
  o = o && typeof o === "object" ? o : {};
  const ids = k => ZF[k].map(x => x[0]), out = {};
  for (const k of Object.keys(ZF)) {
    if (ZF_ONE.includes(k)) out[k] = ids(k).includes(o[k]) ? o[k] : "";
    else out[k] = Array.isArray(o[k]) ? [...new Set(o[k].filter(v => ids(k).includes(v)))] : [];
  }
  for (const [k, n] of Object.entries(ZF_TXT)) out[k] = typeof o[k] === "string" ? o[k].slice(0, n) : "";
  out.date = typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : "";
  out.skipShape = !!o.skipShape;
  return out;
}
const zfHas = (p, k, id) => Array.isArray(p[k]) ? p[k].includes(id) : p[k] === id;
// « Je ne sais pas » ne compte pas comme une préférence.
const zfPicked = (p, k) => (Array.isArray(p[k]) ? p[k] : [p[k]]).filter(v => v && v !== "nsp" && v !== "autre");

// ——— Catalogue de silhouettes ———
const ZF_SIL = {
  trapeze: { nom: "Trapèze", jupe: "Jupe évasée en douceur dès la taille", desc: "Un buste ajusté et une jupe qui s’ouvre doucement, comme la lettre A." },
  princesse: { nom: "Princesse", jupe: "Grande jupe volumineuse, avec jupon", desc: "Un buste ajusté, une taille nette et une jupe ample et cérémonielle." },
  ajustee: { nom: "Sirène", jupe: "Jupe près du corps, évasée sous le genou", desc: "La robe suit la ligne du corps puis s’évase vers le bas." },
  droite: { nom: "Colonne", jupe: "Jupe droite et fluide", desc: "Une ligne verticale nette et fluide, de l’encolure à l’ourlet." },
  empire: { nom: "Empire", jupe: "Jupe fluide depuis la poitrine", desc: "Une taille haute placée sous la poitrine et une jupe qui tombe librement." }
};
const ZF_SILS = Object.keys(ZF_SIL);
const ZF_DIRS = {
  classique: { nom: "Classique et intemporelle", bonus: { trapeze: 2, princesse: 1.5, empire: 0.5 }, neck: ["bateau", "rond", "carre", "coeur"], fab: ["satin", "mikado", "dentelle"] },
  moderne: { nom: "Moderne et minimaliste", bonus: { droite: 2, ajustee: 1.5, trapeze: 0.5 }, neck: ["carre", "v", "bateau", "montant"], fab: ["crepe", "mikado", "satin"] },
  romantique: { nom: "Romantique", bonus: { empire: 2, trapeze: 1.5, princesse: 1 }, neck: ["coeur", "epaules", "v", "rond"], fab: ["tulle", "dentelle", "broderie"] },
  spectaculaire: { nom: "Spectaculaire", bonus: { princesse: 2, ajustee: 1.5 }, neck: ["coeur", "epaules", "bateau", "v"], fab: ["mikado", "broderie", "satin", "tulle"] }
};

// Une réponse compte pour la personnalisation si elle dit quelque chose sur la robe.
function zfSignals(p) {
  return ["silhouette", "imagine", "volume", "waist", "structure", "movement", "aesthetic", "neckline", "sleeves", "fabric", "deco", "train", "setting"]
    .reduce((n, k) => n + (zfPicked(p, k).length ? 1 : 0), 0);
}

// Score d'une silhouette et liste lisible des raisons (toujours issues des réponses).
function zfScore(p, sil) {
  let sc = 0; const why = [];
  const add = (v, txt) => { sc += v; if (v > 0 && txt && !why.includes(txt)) why.push(txt); };
  if (zfHas(p, "silhouette", sil)) add(4, "tu as choisi la silhouette " + ZF_SIL[sil].nom.toLowerCase());
  const im = { volume: { princesse: 2, trapeze: 1 }, fluide: { empire: 2, droite: 1.5, trapeze: 0.5 }, sculpte: { ajustee: 2, princesse: 1 }, epure: { droite: 2, trapeze: 1 } }[p.imagine] || {};
  if (im[sil]) add(im[sil], "tu imagines « " + zfLabel("imagine", p.imagine).toLowerCase() + " »");
  const vol = { pres: { ajustee: 2, droite: 2 }, modere: { trapeze: 2, empire: 1.5 }, ample: { princesse: 2.5, trapeze: 1 } }[p.volume] || {};
  if (vol[sil]) add(vol[sil], "tu préfères une jupe « " + zfLabel("volume", p.volume).toLowerCase() + " »");
  const ws = { marquee: { princesse: 1.5, ajustee: 1.5, trapeze: 1 }, legere: { trapeze: 1.5, empire: 0.5 }, libre: { droite: 1.5, empire: 1.5 } }[p.waist] || {};
  if (ws[sil]) add(ws[sil], "tu veux une taille « " + zfLabel("waist", p.waist).toLowerCase() + " »");
  const st = { souple: { empire: 1, droite: 1 }, equilibre: { trapeze: 1 }, structure: { princesse: 1, ajustee: 1 } }[p.structure] || {};
  if (st[sil]) add(st[sil], "tu aimes une tenue « " + zfLabel("structure", p.structure).toLowerCase() + " »");
  if (p.movement === "essentiel") { const m = { droite: 1.5, empire: 1.5, trapeze: 1.5, princesse: 0, ajustee: -1 }[sil]; add(m, "la liberté de mouvement est essentielle pour toi"); sc += Math.min(0, m); }
  if (p.movement === "important") { const m = { trapeze: 1, empire: 1, droite: 1 }[sil] || 0; add(m, "la liberté de mouvement compte pour toi"); }
  if (p.balance === "confort") add({ trapeze: 0.5, empire: 1, droite: 0.5 }[sil] || 0, "tu mets le confort en premier");
  if (p.balance === "formel") add({ princesse: 1, ajustee: 0.5 }[sil] || 0, "tu veux une allure très cérémonielle");
  const set = { plage: { droite: 1.5, empire: 1.5, trapeze: 0.5, princesse: -1 }, jardin: { empire: 1, trapeze: 1, droite: 0.5 }, salle: { princesse: 1, ajustee: 0.5, trapeze: 0.5 }, culte: { trapeze: 1, princesse: 0.5 } }[p.setting] || {};
  if (set[sil]) { add(set[sil], "ton mariage a lieu : " + zfLabel("setting", p.setting).toLowerCase()); if (set[sil] < 0) sc += set[sil]; }
  const AE = { classique: { trapeze: 1, princesse: 0.5 }, minimal: { droite: 1.5, ajustee: 0.5 }, romantique: { empire: 1, trapeze: 1 }, royal: { princesse: 1.5, ajustee: 0.5 }, traditionnel: { princesse: 0.5, trapeze: 0.5 }, contemp: { trapeze: 0.5, droite: 0.5 }, boheme: { empire: 1.5, droite: 0.5 }, modeste: { trapeze: 1, princesse: 0.5, empire: 0.5 }, glamour: { ajustee: 1.5, droite: 0.5 } };
  for (const a of p.aesthetic || []) { const v = (AE[a] || {})[sil]; if (v) add(v, "ton style « " + zfLabel("aesthetic", a).toLowerCase() + " »"); }
  // Étape facultative : seulement un léger départage, jamais une raison principale, jamais une interdiction.
  const SH = { A: { trapeze: 0.4, empire: 0.3 }, V: { trapeze: 0.4, princesse: 0.3 }, H: { droite: 0.4, empire: 0.3 }, X: { ajustee: 0.3, trapeze: 0.3, princesse: 0.3 } }[p.shape] || {};
  if (SH[sil]) { sc += SH[sil]; why.push("en complément, la catégorie de silhouette que tu as choisie"); }
  return { sc, why };
}

// Encolure, manches, tissu, traîne, couleur : d'abord ce qu'elle a dit, puis la couverture souhaitée, puis la direction.
function zfDetails(p, sil, dir) {
  const D = ZF_DIRS[dir], why = [];
  const coverNeck = p.neckCover === "montant" || zfHas(p, "cover", "decollete");
  const coverShoulders = zfHas(p, "cover", "epaules");
  const openNecks = ["v", "coeur", "epaules"], shoulderNecks = ["epaules"];
  const okNeck = n => !(coverNeck && openNecks.includes(n)) && !(coverShoulders && shoulderNecks.includes(n)) && !(p.neckCover === "modere" && n === "epaules");
  let neck = zfPicked(p, "neckline").find(okNeck);
  if (neck) why.push("encolure " + zfLabel("neckline", neck).toLowerCase() + " : un de tes choix");
  else { neck = (coverNeck ? ["montant", "bateau", "rond"] : D.neck).find(okNeck) || "bateau"; if (coverNeck) why.push("encolure couvrante, comme tu le souhaites"); }
  // Manches
  let sleeve, sleeveTxt;
  const wantCoverArms = p.sleeveCover === "complete" || zfHas(p, "cover", "bras");
  if (wantCoverArms) { sleeve = "longues"; sleeveTxt = dir === "moderne" ? "Manches longues nettes en crêpe" : dir === "classique" ? "Manches longues en dentelle fine" : "Manches longues en tulle brodé, plus légères"; why.push("bras couverts, comme tu le souhaites"); }
  else if (p.sleeveCover === "mi") { sleeve = "courtes"; sleeveTxt = "Manches mi-longues ou trois-quarts"; why.push("manches mi-longues, comme tu le souhaites"); }
  else { const s = zfPicked(p, "sleeves")[0]; sleeve = s || (p.sleeveCover === "legere" ? "courtes" : p.sleeveCover === "aucune" ? "sans" : coverShoulders ? "courtes" : dir === "romantique" ? "courtes" : "sans");
    sleeveTxt = { longues: "Manches longues", courtes: p.sleeveCover === "legere" ? "Manches courtes légères, sur l’épaule" : "Manches courtes", sans: "Sans manches", amovibles: "Manches amovibles, à retirer pour la soirée" }[sleeve];
    if (s) why.push(zfLabel("sleeves", s).toLowerCase() + " : un de tes choix"); }
  // Tissu : ses choix d'abord, en restant cohérent avec la silhouette.
  const heavy = sil === "princesse" || sil === "ajustee";
  let fab = zfPicked(p, "fabric").find(f => !(p.movement === "essentiel" && f === "mikado" && !heavy));
  if (fab) why.push(zfLabel("fabric", fab).toLowerCase() + " : un de tes tissus préférés");
  else { const light = ["crepe", "tulle", "dentelle"]; fab = p.movement === "essentiel" || p.setting === "plage" ? (D.fab.find(f => light.includes(f)) || "crepe") : D.fab[0]; }
  if (sil === "droite" && fab === "tulle" && !zfHas(p, "fabric", "tulle")) fab = "crepe";
  // Traîne
  let train = p.train && p.train !== "nsp" ? p.train : "";
  if (train) why.push(zfLabel("train", train).toLowerCase() + " : ton choix");
  else train = p.setting === "plage" || p.movement === "essentiel" ? "courte" : sil === "princesse" || dir === "spectaculaire" ? "longue" : "courte";
  // Couleur de robe
  const w = zfPicked(p, "whites");
  let color = w[0] || (p.temp === "chaud" ? "ivoire" : p.temp === "froid" ? "blanc" : "casse");
  if (w[0]) why.push("couleur " + zfLabel("whites", w[0]).toLowerCase() + " : ton choix");
  const deco = p.deco && p.deco !== "nsp" ? p.deco : dir === "moderne" ? "minimal" : dir === "spectaculaire" ? "riche" : "equilibre";
  return { neck, sleeve, sleeveTxt, fab, train, color, deco, why };
}

// Notes de confort selon la robe proposée.
function zfComfort(p, sil, d) {
  const n = [];
  if (sil === "ajustee") n.push("Une jupe ajustée jusqu’au genou raccourcit le pas : fais un essai de marche et d’assise avant les retouches.");
  if (sil === "princesse") n.push("Le volume se gère bien avec un jupon léger ; prévois de l’aide pour t’asseoir et monter en voiture.");
  if (sil === "droite" || sil === "empire") n.push("Une ligne fluide laisse le pas libre ; vérifie la longueur avec tes vraies chaussures.");
  if (sil === "trapeze") n.push("La jupe en A laisse marcher et s’asseoir facilement.");
  if (d.train === "longue") n.push("Une longue traîne peut se relever par une boucle ou des boutons pour la réception.");
  if (d.sleeve === "longues") n.push("Pour des manches longues, demande un tissu respirant et un peu d’aisance au coude.");
  if (p.movement === "essentiel" && d.train !== "sans") n.push("Comme tu veux bouger librement, une traîne amovible est une bonne option à demander.");
  if (p.fitNote) n.push("Pense à ta note : « " + p.fitNote + " ». Montre-la à ta couturière ou à la boutique.");
  return n;
}
const ZF_ACC = { classique: "Boucles d’oreilles délicates et voile coordonné", moderne: "Boucles d’oreilles graphiques, voile fin ou sans voile", romantique: "Bijoux de cheveux floraux et voile léger en tulle", spectaculaire: "Bijoux affirmés et voile long" };

// ——— Recommandations : 3 directions distinctes, ou un état « découverte » si on manque d'informations ———
// opts.rej : clés « direction:silhouette » refusées ; opts.alt : {direction: n} pour « une autre option ».
function zfReco(prof, opts) {
  const p = zfCleanProf(prof); opts = opts || {}; const rej = opts.rej || [], alt = opts.alt || {};
  if (zfSignals(p) < 2) return { state: "decouverte", manque: ["silhouette", "volume", "waist", "movement", "aesthetic"].filter(k => !zfPicked(p, k).length) };
  const ae = p.aesthetic || [];
  const dirs = ["classique", "moderne", ae.some(a => a === "royal" || a === "glamour") && !ae.some(a => a === "romantique" || a === "boheme") ? "spectaculaire" : "romantique"];
  const base = Object.fromEntries(ZF_SILS.map(s => [s, zfScore(p, s)]));
  const out = [], used = [];
  for (const dir of dirs) {
    // Trois directions vraiment différentes : une silhouette déjà proposée passe après les autres.
    const ranked = ZF_SILS.map(s => ({ s, sc: base[s].sc + (ZF_DIRS[dir].bonus[s] || 0) - (used.includes(s) ? 100 : 0) })).filter(x => !rej.includes(dir + ":" + x.s)).sort((a, b) => b.sc - a.sc);
    if (!ranked.length) continue;
    const pick = ranked[(alt[dir] || 0) % ranked.length], sil = pick.s, d = zfDetails(p, sil, dir);
    used.push(sil);
    const why = [...base[sil].why.filter(w => !/^tu as choisi la silhouette/.test(w)), ...d.why];
    if (zfHas(p, "silhouette", sil)) why.unshift("tu as choisi la silhouette " + ZF_SIL[sil].nom.toLowerCase());
    else if (zfPicked(p, "silhouette").length) why.unshift("une autre piste à comparer avec la silhouette que tu as choisie");
    out.push({ key: dir + ":" + sil, dir, dirNom: ZF_DIRS[dir].nom, sil, nom: ZF_SIL[sil].nom, desc: ZF_SIL[sil].desc, jupe: ZF_SIL[sil].jupe,
      neck: d.neck, sleeve: d.sleeve, sleeveTxt: d.sleeveTxt, fab: d.fab, train: d.train, color: d.color, deco: d.deco,
      acc: ZF_ACC[dir], comfort: zfComfort(p, sil, d), why: why.length ? why : ["la direction « " + ZF_DIRS[dir].nom.toLowerCase() + " », à explorer"],
      more: ranked.length > 1 });
  }
  return { state: "ok", recos: out };
}

// ——— Couleurs : harmonies proposées (exemples, jamais obligatoires) ———
const ZF_ROBES = [["blanc","Blanc pur","#FFFFFF","Lumineux et net ; très beau en lumière froide et avec l’argent."],["casse","Blanc cassé","#F8F5EE","Plus doux que le blanc pur, il va avec presque tout."],["ivoire","Ivoire","#F6EEDC","Une pointe de chaleur ; superbe avec l’or et la dentelle."],["champagne","Champagne","#EAD9BC","Doré et tendre ; magnifique en soirée et avec l’or."],["nude","Nude","#E3C7AE","Tout en douceur ; souvent recouvert de dentelle ou de tulle."]];
const ZF_METAUX = [["or","Or","#C9A24A"],["argent","Argent","#BFC3C8"],["orrose","Or rose","#C99B86"],["mix","Métaux mélangés","#B9A27A"]];
const ZF_PALS = [
  { id: "p1", nom: "Ivoire, or et beige doux", c: ["#F6EEDC", "#C9A24A", "#E6D8C3", "#FFFFFF"], robe: "ivoire", metal: "or" },
  { id: "p2", nom: "Ivoire, argent et perle", c: ["#F6EEDC", "#BFC3C8", "#EDE8E1", "#FFFFFF"], robe: "ivoire", metal: "argent" },
  { id: "p3", nom: "Champagne, or et rose atténué", c: ["#EAD9BC", "#C9A24A", "#C9A3A0", "#F8F5EE"], robe: "champagne", metal: "or" },
  { id: "p4", nom: "Blanc, argent et touches bordeaux", c: ["#FFFFFF", "#BFC3C8", "#702B3A", "#EDEDED"], robe: "blanc", metal: "argent" },
  { id: "p5", nom: "Blanc cassé, or rose et vert sauge", c: ["#F8F5EE", "#C99B86", "#A8B5A0", "#FFFFFF"], robe: "casse", metal: "orrose" },
  { id: "p6", nom: "Nude, or et terracotta douce", c: ["#E3C7AE", "#C9A24A", "#C4876A", "#F6EEDC"], robe: "nude", metal: "or" }
];
// Une palette est « proche de tes choix » si elle reprend une couleur de robe ou un métal choisis ; on dit lesquels.
function zfPalFit(prof, pal) {
  const p = zfCleanProf(prof), why = [];
  if (zfHas(p, "whites", pal.robe)) why.push("ta couleur de robe");
  if (zfHas(p, "metal", pal.metal)) why.push("ton métal");
  if (pal.id === "p4" && zfHas(p, "bouquet", "bordeaux")) why.push("ton bouquet bordeaux");
  if (pal.id === "p5" && zfHas(p, "bouquet", "vert")) why.push("ton feuillage vert");
  return why;
}

// ——— Compléter le look : options par catégorie, expliquées à partir de la robe choisie ———
function zfLookOpts(prof, dress) {
  const p = zfCleanProf(prof), d = dress || {}, neck = d.neck || "", sil = d.sil || "", train = d.train || "", riche = d.deco === "riche";
  const O = {};
  const metal = zfPicked(p, "metal")[0];
  const m = metal ? zfLabel("metal", metal).toLowerCase() : "";
  O.bijoux = [
    { id: "boucles", t: "Boucles d’oreilles seules, sans collier", w: neck === "bateau" || neck === "montant" ? "Avec une encolure " + zfLabel("neckline", neck).toLowerCase() + ", le cou est déjà encadré : des boucles suffisent." : riche ? "Ta robe est très ornée : des boucles seules laissent les détails parler." : "Une option sobre qui met le visage en valeur." },
    { id: "collier", t: "Collier fin et boucles discrètes", w: neck === "v" || neck === "coeur" || neck === "epaules" ? "Une encolure " + zfLabel("neckline", neck).toLowerCase() + " laisse de la place pour un collier fin qui suit sa ligne." : "À essayer si ton encolure laisse le cou dégagé." },
    { id: "parure", t: "Parure affirmée", w: riche ? "Selon ton goût : avec une robe déjà ornée, garde une seule pièce forte." : "Pour un effet cérémoniel, surtout avec une robe sobre." },
    { id: "cheveux", t: "Bijou de cheveux", w: "Un peigne ou une tiare se coordonne au voile et à la coiffure." }
  ].map(o => ({ ...o, w: o.w + (m ? " En " + m + ", comme tu le préfères." : "") }));
  O.voile = [
    { id: "cathedrale", t: "Voile cathédrale", w: train === "longue" ? "Il prolonge ta longue traîne : très cérémoniel." : "Spectaculaire ; pense qu’il ajoute du poids et de la longueur derrière toi." },
    { id: "chapelle", t: "Voile chapelle", w: "Il touche le sol et accompagne la plupart des traînes." },
    { id: "doigts", t: "Voile bout des doigts", w: sil === "ajustee" ? "Il s’arrête là où la robe s’évase : il souligne la ligne." : "Facile à porter toute la journée." },
    { id: "court", t: "Voile court", w: "Léger, il laisse voir le dos et le décolleté de la robe." },
    { id: "minimal", t: "Voile minimal ou foulard fin", w: p.aesthetic.includes("modeste") || p.traditions.includes("golfe") ? "S’accorde avec une allure pudique : à coordonner avec ta coiffure ou ton hijab." : "Une touche discrète." },
    { id: "sans", t: "Sans voile", w: "Tout à fait possible : un bijou de cheveux peut le remplacer." }
  ];
  const conf = p.balance === "confort" || p.movement === "essentiel";
  O.chaussures = [
    { id: "plates", t: "Ballerines ou sandales plates", w: conf ? "Tu mets le confort en avant : idéal pour une longue journée debout." : p.setting === "plage" || p.setting === "jardin" ? "Parfaites sur l’herbe ou le sable." : "Le plus confortable ; personne ne les voit sous une robe longue." },
    { id: "bas", t: "Petits talons (3 à 5 cm)", w: "Un bon compromis entre allure et confort." },
    { id: "moyens", t: "Talons moyens (6 à 8 cm)", w: "Plus d’allure ; fais faire l’ourlet avec ces chaussures-là." },
    { id: "hauts", t: "Talons hauts", w: conf ? "Possible pour les photos, avec une paire plate de secours." : "Pour la silhouette ; prévois une paire de secours." }
  ];
  O.coiffure = [
    { id: "chignon", t: "Chignon élégant", w: neck === "montant" || neck === "bateau" ? "Dégage le cou au-dessus d’une encolure haute." : "Tient toute la journée et va avec tous les voiles." },
    { id: "bas", t: "Chignon bas", w: "Idéal pour accrocher un voile long." },
    { id: "ondes", t: "Ondulations souples", w: neck === "epaules" || neck === "v" ? "Elles encadrent une encolure ouverte." : "Une allure romantique et naturelle." },
    { id: "mi", t: "Mi-attachés", w: "Le visage dégagé et du mouvement derrière." },
    { id: "hijab", t: "Hijab drapé de mariée", w: "Coordonné au voile et aux bijoux ; à essayer avec la robe." }
  ];
  O.makeup = [
    { id: "naturel", t: "Naturel", w: "Un teint frais et lumineux, qui tient sur les photos de jour." },
    { id: "softglam", t: "Soft glam", w: "Un peu plus de définition sur les yeux, tout en douceur." },
    { id: "classique", t: "Classique mariée", w: "Teint parfait, yeux définis, lèvres harmonisées avec le bouquet." },
    { id: "soiree", t: "Soirée, plus intense", w: "Pour une réception du soir ou un look spectaculaire." }
  ].map(o => o.id === p.makeup ? { ...o, w: "Ton choix. " + o.w } : o);
  const bq = zfPicked(p, "bouquet").map(b => zfLabel("bouquet", b).toLowerCase());
  O.bouquet = [
    { id: "rond", t: "Bouquet rond", w: "Classique et facile à tenir." },
    { id: "cascade", t: "Bouquet cascade", w: sil === "princesse" || sil === "ajustee" ? "Il descend le long de la robe : il équilibre une silhouette cérémonielle." : "Spectaculaire en photo." },
    { id: "champetre", t: "Bouquet champêtre", w: p.setting === "jardin" || p.aesthetic.includes("boheme") ? "Naturel, en accord avec ton lieu ou ton style." : "Naturel et léger." },
    { id: "mini", t: "Petit bouquet", w: "Léger à porter, il laisse voir les détails de la robe." }
  ].map(o => ({ ...o, w: o.w + (bq.length ? " Couleurs : " + bq.join(", ") + "." : "") }));
  return O;
}
const ZF_LOOK_CATS = [["bijoux","Bijoux"],["voile","Voile"],["chaussures","Chaussures"],["coiffure","Coiffure"],["makeup","Maquillage"],["bouquet","Bouquet"]];

if (typeof module !== "undefined") module.exports = { ZF, ZF_ONE, zfCleanProf, zfReco, zfScore, zfSignals, zfLookOpts, zfPalFit, ZF_PALS, ZF_SIL, ZF_DIRS };
