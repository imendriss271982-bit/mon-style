/* My Style × ZIFAFI — My Wedding : l'espace mariée (pages, enregistrement, illustrations).
   Utilise S, P, render, go, back, home, toast, esc, tr, shrink, send, DOCK_OF (index.html) et le moteur
   zifafi-methode.js. Chargé APRÈS le script principal.
   Données : localStorage « monstyle_zf » (profil mariée, robes, palettes, looks, leçons) et IndexedDB
   « monstyle_zf_img » (photos d'inspiration). Tout reste sur ce téléphone : rien n'est envoyé ni synchronisé. */

const ZF_KEY = "monstyle_zf";
function zfCleanAll(o) {
  o = o && typeof o === "object" ? o : {};
  const arr = v => Array.isArray(v) ? v : [], str = (v, n) => typeof v === "string" ? v.slice(0, n) : "";
  const dress = r => r && typeof r === "object" && typeof r.sil === "string" && ZF_SIL[r.sil] ? { key: str(r.key, 40), dir: str(r.dir, 20), dirNom: str(r.dirNom, 60), sil: r.sil, nom: str(r.nom, 40), neck: str(r.neck, 20), sleeve: str(r.sleeve, 20), sleeveTxt: str(r.sleeveTxt, 80), fab: str(r.fab, 20), train: str(r.train, 20), color: str(r.color, 20), deco: str(r.deco, 20) } : null;
  const ids = (v, list) => [...new Set(arr(v).filter(x => list.includes(x)))];
  return {
    prof: o.prof && typeof o.prof === "object" ? zfCleanProf(o.prof) : null,
    saved: arr(o.saved).map(r => { const d = dress(r); return d ? { ...d, id: str(r.id, 20) || d.key, d: str(r.d, 10) } : null; }).filter(Boolean).slice(0, 20),
    rej: arr(o.rej).filter(x => typeof x === "string").slice(0, 40),
    pal: ids(o.pal, ZF_PALS.map(p => p.id)),
    looks: arr(o.looks).filter(l => l && typeof l === "object").slice(0, 30).map(l => ({
      id: str(l.id, 20) || Date.now().toString(36), nom: str(l.nom, 60) || "Mon look", dress: dress(l.dress), pal: ZF_PALS.some(p => p.id === l.pal) ? l.pal : "",
      sel: Object.fromEntries(ZF_LOOK_CATS.map(([k]) => [k, typeof (l.sel || {})[k] === "string" ? l.sel[k].slice(0, 20) : ""])),
      notes: str(l.notes, 300), fav: !!l.fav, d: str(l.d, 10) })),
    les: Object.fromEntries(Object.entries(o.les && typeof o.les === "object" ? o.les : {}).filter(([k, v]) => typeof k === "string" && v).slice(0, 20).map(([k]) => [k, 1])),
    prac: Object.fromEntries(Object.entries(o.prac && typeof o.prac === "object" ? o.prac : {}).filter(([k, v]) => typeof k === "string" && v).slice(0, 20).map(([k]) => [k, 1])),
    insN: Number.isInteger(o.insN) && o.insN >= 0 ? o.insN : 0
  };
}
let ZD = (() => { try { return zfCleanAll(JSON.parse(localStorage.getItem(ZF_KEY) || "null")); } catch (e) { return zfCleanAll(null); } })();
function zfSave() { try { localStorage.setItem(ZF_KEY, JSON.stringify(ZD)); return true; } catch (e) { toast("Enregistrement impossible : la mémoire du téléphone est pleine."); return false; } }
const zfToday = () => new Date().toISOString().slice(0, 10);
const zfId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// ——— Photos d'inspiration (IndexedDB) ———
const ZIDB = { p: null,
  open() { if (!this.p) this.p = new Promise((ok, ko) => { try { const r = indexedDB.open("monstyle_zf_img", 1); r.onupgradeneeded = () => r.result.createObjectStore("insp", { keyPath: "id" }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); } catch (e) { ko(e); } }); return this.p; },
  async tx(mode, fn) { const d = await this.open(); return new Promise((ok, ko) => { const t = d.transaction("insp", mode), st = t.objectStore("insp"); const rq = fn(st); t.oncomplete = () => ok(rq && rq.result); t.onerror = t.onabort = () => ko(t.error); }); },
  all() { return this.tx("readonly", st => st.getAll()); }, put(v) { return this.tx("readwrite", st => st.put(v)); }, del(id) { return this.tx("readwrite", st => st.delete(id)); }, clear() { return this.tx("readwrite", st => st.clear()).catch(() => {}); } };
const ZF_ICATS = [["robes","Robes de mariée"],["encolures","Encolures et manches"],["voiles","Voiles"],["bijoux","Bijoux"],["chaussures","Chaussures"],["coiffures","Coiffures"],["makeup","Maquillage"],["bouquets","Bouquets"],["palettes","Palettes de couleurs"],["looks","Looks complets"]];
let ZINS = null, ZINS_ERR = "";
function zfLoadIns() { ZIDB.all().then(a => { ZINS = (a || []).filter(x => x && x.id && x.img).map(x => ({ id: String(x.id), cat: ZF_ICATS.some(c => c[0] === x.cat) ? x.cat : "robes", titre: String(x.titre || "").slice(0, 60), note: String(x.note || "").slice(0, 200), fav: !!x.fav, img: String(x.img), d: String(x.d || "") })).sort((a, b) => b.d < a.d ? -1 : 1); if (ZD.insN !== ZINS.length) { ZD.insN = ZINS.length; zfSave(); } if (S.page === "zf_insp" || S.page === "zf") zfKeep(); })
  .catch(() => { ZINS = []; ZINS_ERR = "Les photos ne peuvent pas être enregistrées sur ce navigateur (mode privé ?)."; if (S.page === "zf_insp") zfKeep(); }); }

// ——— Illustrations originales (schémas SVG dessinés par l'app, pas des photos de modèles réels) ———
const ZF_HEX = { blanc: "#FFFFFF", casse: "#F8F5EE", ivoire: "#F6EEDC", champagne: "#EAD9BC", nude: "#E3C7AE", couleur: "#E9DDE0" };
function zfDressSVG(r, big) {
  const fill = ZF_HEX[r.color] || "#F6EEDC", line = "#77716B", skin = "#E8D3C2", sh = 26, ny = 40;
  const waist = r.sil === "empire" ? 64 : 82;
  const SK = { trapeze: `M45 ${waist} L75 ${waist} L102 190 L18 190 Z`, princesse: `M46 ${waist} L74 ${waist} C96 110 112 160 116 190 L4 190 C8 160 24 110 46 ${waist} Z`, ajustee: `M45 ${waist} L75 ${waist} L80 140 C88 160 102 178 108 190 L12 190 C18 178 32 160 40 140 Z`, droite: `M45 ${waist} L75 ${waist} L84 190 L36 190 Z`, empire: `M46 ${waist} L74 ${waist} L94 190 L26 190 Z` };
  const train = r.train === "longue" ? `<path d="M14 186 C30 200 90 200 106 186 L118 196 C80 206 40 206 2 196 Z" fill="${fill}" stroke="${line}" stroke-width="1" opacity=".7"/>` : r.train === "courte" ? `<path d="M20 188 C40 196 80 196 100 188 L106 194 C80 200 40 200 14 194 Z" fill="${fill}" stroke="${line}" stroke-width="1" opacity=".7"/>` : "";
  const off = r.neck === "epaules";
  const NK = { bateau: `M38 ${ny} L82 ${ny}`, v: `M38 ${ny} L60 ${ny + 18} L82 ${ny}`, rond: `M38 ${ny} Q60 ${ny + 12} 82 ${ny}`, carre: `M38 ${ny} L46 ${ny} L46 ${ny + 10} L74 ${ny + 10} L74 ${ny} L82 ${ny}`, coeur: `M40 ${ny + 4} Q50 ${ny - 2} 60 ${ny + 10} Q70 ${ny - 2} 80 ${ny + 4}`, montant: `M52 ${ny - 8} L68 ${ny - 8}`, epaules: `M34 ${ny + 6} Q60 ${ny + 12} 86 ${ny + 6}` };
  const bodTop = r.neck === "montant" ? `M52 ${ny - 8} L68 ${ny - 8} L82 ${ny}` : off ? `M34 ${ny + 6} Q60 ${ny + 12} 86 ${ny + 6}` : `M38 ${ny} L82 ${ny}`;
  const bodice = r.neck === "montant" ? `M38 ${ny} L52 ${ny - 8} L68 ${ny - 8} L82 ${ny} L75 ${waist} L45 ${waist} Z` : off ? `M34 ${ny + 6} Q60 ${ny + 12} 86 ${ny + 6} L75 ${waist} L45 ${waist} Z` : `M38 ${ny} L82 ${ny} L75 ${waist} L45 ${waist} Z`;
  const arms = `<path d="M38 ${ny + 2} L30 ${ny + 40} L28 ${ny + 66}M82 ${ny + 2} L90 ${ny + 40} L92 ${ny + 66}" stroke="${skin}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  const SL = { longues: `<path d="M38 ${ny + 2} L30 ${ny + 40} L28 ${ny + 64}M82 ${ny + 2} L90 ${ny + 40} L92 ${ny + 64}" stroke="${fill}" stroke-width="9" stroke-linecap="round" fill="none"/><path d="M38 ${ny + 2} L30 ${ny + 40} L28 ${ny + 64}M82 ${ny + 2} L90 ${ny + 40} L92 ${ny + 64}" stroke="${line}" stroke-width="10" stroke-linecap="round" fill="none" opacity=".18"/>`, courtes: `<path d="M38 ${ny + 1} L33 ${ny + 18}M82 ${ny + 1} L87 ${ny + 18}" stroke="${fill}" stroke-width="10" stroke-linecap="round"/>`, amovibles: `<path d="M38 ${ny + 2} L30 ${ny + 40} L28 ${ny + 64}M82 ${ny + 2} L90 ${ny + 40} L92 ${ny + 64}" stroke="${line}" stroke-width="9" stroke-dasharray="3 3" stroke-linecap="round" fill="none" opacity=".45"/>` };
  const lace = r.fab === "dentelle" || r.fab === "broderie" || r.deco === "riche" ? `<g fill="none" stroke="${line}" stroke-width=".8" opacity=".55">${[0, 1, 2, 3, 4].map(i => `<circle cx="${40 + i * 10}" cy="${waist + 30 + (i % 2) * 14}" r="3"/><circle cx="${35 + i * 12}" cy="${waist + 70 + (i % 2) * 10}" r="3"/>`).join("")}</g>` : "";
  const tulle = r.fab === "tulle" ? `<path d="${SK[r.sil]}" fill="none" stroke="${line}" stroke-width=".6" stroke-dasharray="2 3" opacity=".6" transform="translate(0 2)"/>` : "";
  return `<svg class="zf-dress" viewBox="0 -2 120 210" role="img" aria-label="${esc(tr("Illustration schématique de la robe proposée"))}" ${big ? "" : 'width="96" height="168"'}>
   ${train}<circle cx="60" cy="16" r="10" fill="${skin}"/><path d="M56 25 L56 ${ny} L64 ${ny} L64 25" fill="${skin}"/>
   ${r.sleeve === "longues" ? "" : arms}${SL[r.sleeve] || ""}
   <path d="${SK[r.sil] || SK.trapeze}" fill="${fill}" stroke="${line}" stroke-width="1.2"/>${tulle}${lace}
   <path d="${bodice}" fill="${fill}" stroke="${line}" stroke-width="1.2"/><path d="${NK[r.neck] || NK.bateau}" stroke="${line}" stroke-width="1.4" fill="none"/>
   <path d="M45 ${waist} L75 ${waist}" stroke="${line}" stroke-width="1" opacity=".6"/>${bodTop ? "" : ""}</svg>`;
}
// Petite silhouette de mariée pour les leçons : chaque étape est un schéma (pose, pas, mains, traîne, chaise, marches).
function zfFig(o) {
  o = o || {}; const line = "#702B3A", dress = "#F6EEDC", skin = "#E8D3C2", dy = o.stairs ? -16 : 0, hand = o.hand || "down";
  let g = "";
  if (o.stairs) g += `<path d="M10 150 H40 V134 H70 V118 H110" fill="none" stroke="#B9A99A" stroke-width="2"/><path d="M14 92 L104 60" stroke="#B9A99A" stroke-width="2"/>`;
  if (o.chair) g += `<path d="M70 98 h28 v-38 M70 98 v34 M98 98 v34 M66 98 h36" stroke="#B9A99A" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  if (o.train) g += `<path d="M66 ${128 + dy} C80 132 98 136 112 146 L62 146 Z" fill="${dress}" stroke="${line}" stroke-width="1" opacity=".75"/>`;
  const sit = !!o.sit, x = sit ? 74 : 50;
  if (sit) {
    g += `<circle cx="${x}" cy="54" r="7" fill="${skin}"/><path d="M${x - 7} 64 h14 l-1 28 h-12 z" fill="${dress}" stroke="${line}" stroke-width="1.2"/>`;
    g += `<path d="M${x - 8} 92 h-22 l-8 48 h34 z" fill="${dress}" stroke="${line}" stroke-width="1.2"/><path d="M${x - 6} 66 L${x - 18} 86" stroke="${skin}" stroke-width="4" stroke-linecap="round"/>`;
  } else {
    const lift = hand === "skirt", hemL = lift ? 32 : 28, hemR = lift ? 68 : 72, hemY = (lift ? 122 : 128) + dy;
    g += `<circle cx="50" cy="${16 + dy}" r="7" fill="${skin}"/><path d="M42 ${26 + dy} h16 l-2 ${26} h-12 z" fill="${dress}" stroke="${line}" stroke-width="1.2"/>`;
    g += `<path d="M44 ${52 + dy} h12 L${hemR} ${hemY} ${lift ? `Q50 ${hemY - 8} ${hemL} ${hemY}` : `L${hemL} ${hemY}`} z" fill="${dress}" stroke="${line}" stroke-width="1.2"/>`;
    const fy = 132 + dy, step = o.step ? 8 : 0;
    g += `<ellipse cx="${44 - step}" cy="${fy}" rx="5" ry="2.5" fill="${line}"/><ellipse cx="${56 + step}" cy="${fy - (o.step ? 2 : 0)}" rx="5" ry="2.5" fill="${line}"/>`;
    const A = { down: [[36, 64], [64, 64]], skirt: [[36, 92], [64, 92]], bouquet: [[48, 66], [52, 66]], low: [[48, 74], [52, 74]], rail: [[36, 64], [74, 44]], greet: [[48, 66], [74, 50]], waist: [[46, 54], [54, 54]] }[hand] || [[36, 64], [64, 64]];
    g += `<path d="M43 ${28 + dy} L${A[0][0]} ${A[0][1] + dy}M57 ${28 + dy} L${A[1][0]} ${A[1][1] + dy}" stroke="${skin}" stroke-width="4" stroke-linecap="round"/>`;
    if (hand === "bouquet" || hand === "low" || hand === "greet") g += `<circle cx="${hand === "greet" ? 46 : 50}" cy="${(hand === "low" ? 77 : 69) + dy}" r="7" fill="#C9A3A0" stroke="${line}" stroke-width=".8"/><path d="M${hand === "greet" ? 46 : 50} ${(hand === "low" ? 84 : 76) + dy} v8" stroke="#6E8B74" stroke-width="2"/>`;
  }
  if (o.arrow === "turn") g += `<path d="M18 140 A34 10 0 1 0 82 140" fill="none" stroke="${line}" stroke-width="1.4" stroke-dasharray="4 3"/><path d="M82 140 l-6 -3 M82 140 l-5 4" stroke="${line}" stroke-width="1.4"/>`;
  if (o.arrow === "fwd") g += `<path d="M78 120 h20 M92 114 l6 6 -6 6" stroke="${line}" stroke-width="1.4" fill="none"/>`;
  if (o.arrow === "down") g += `<path d="M28 40 v24 M22 58 l6 6 6 -6" stroke="${line}" stroke-width="1.4" fill="none"/>`;
  if (o.cam) g += `<rect x="86" y="18" width="18" height="12" rx="2" fill="none" stroke="${line}" stroke-width="1.4"/><circle cx="95" cy="24" r="3.5" fill="none" stroke="${line}" stroke-width="1.4"/>`;
  return `<svg class="zf-fig" viewBox="0 0 120 152" aria-hidden="true">${g}</svg>`;
}

// ——— Académie : 9 leçons (schémas originaux, conseils pratiques) ———
const ZF_LES = [
  { id: "marcher", t: "Marcher en robe de mariée", i: "Une démarche calme et sûre, adaptée à ta robe et à tes chaussures.",
    st: [["Fais des pas plus courts que d’habitude, en posant le talon puis la pointe.", { step: 1, arrow: "fwd" }], ["Pour une jupe longue, pince légèrement le tissu devant, sur les côtés, et soulève-le de quelques centimètres.", { hand: "skirt", step: 1 }], ["Avec une traîne, avance toujours : ne recule jamais, la traîne suit derrière toi.", { train: 1, step: 1, arrow: "fwd" }], ["Pour tourner, fais plusieurs petits pas en arc de cercle au lieu de pivoter sur place.", { train: 1, arrow: "turn" }], ["Avec le bouquet, garde-le à hauteur du nombril et laisse les épaules relâchées.", { hand: "bouquet", step: 1 }]],
    tips: ["Entraîne-toi avec tes vraies chaussures, sur un sol semblable à celui du lieu.", "Une robe fluide demande moins d’aide qu’une robe très volumineuse : adapte le geste à ta robe."],
    diff: ["Marcher sur l’ourlet : vérifie la longueur avec tes chaussures lors des retouches.", "Les escaliers et l’herbe : voir la leçon sur les marches."] },
  { id: "asseoir", t: "S’asseoir avec élégance", i: "Préparer la jupe, descendre doucement, se relever en sécurité.",
    st: [["Approche-toi de la chaise jusqu’à la sentir derrière tes mollets.", { chair: 1 }], ["Rassemble doucement la jupe et la traîne sur le côté ou devant toi.", { hand: "skirt", chair: 1 }], ["Descends lentement, le dos droit, sans tirer sur les détails délicats.", { sit: 1, chair: 1, arrow: "down" }], ["Pour te relever, avance au bord de la chaise et pousse sur tes jambes.", { sit: 1, chair: 1 }]],
    tips: ["Une jupe volumineuse : demande à quelqu’un de placer la jupe autour de toi.", "Une robe ajustée : assieds-toi tout au bord pour ne pas tendre le tissu."],
    diff: ["La traîne coincée sous toi : déplace-la sur le côté avant de t’asseoir.", "Une boucle de traîne qui se défait : teste-la plusieurs fois avant le jour J."] },
  { id: "bouquet", t: "Tenir son bouquet", i: "Des mains détendues et un bouquet à la bonne hauteur.",
    st: [["Tiens la tige à deux mains, sans serrer, coudes légèrement écartés du corps.", { hand: "bouquet" }], ["Place le bouquet à hauteur du nombril : il ne cache ni la taille ni les détails de la robe.", { hand: "bouquet" }], ["En marchant, garde-le à la même hauteur, sans le balancer.", { hand: "bouquet", step: 1, arrow: "fwd" }], ["Pour saluer, passe-le dans une main et garde l’autre libre.", { hand: "greet" }]],
    tips: ["Sur les photos, baisse-le un peu plus bas pour montrer la taille.", "Un petit bouquet est plus léger pour une longue journée."],
    diff: ["Les bras fatigués : repose le bouquet entre deux moments.", "Les mains crispées : respire et relâche les épaules."] },
  { id: "debout", t: "Se tenir avec confiance", i: "Une posture naturelle, jamais raide.",
    st: [["Répartis ton poids sur les deux pieds, genoux souples.", {}], ["Épaules basses et relâchées, le cou long.", {}], ["Mains posées ensemble à la taille, ou le long du corps.", { hand: "waist" }]],
    tips: ["Pense à respirer lentement : la posture se détend avec la respiration.", "En robe longue, un pied légèrement devant l’autre donne de l’équilibre."],
    diff: ["Rester debout longtemps : alterne le poids d’un pied sur l’autre.", "Se sentir raide : bouge légèrement, c’est plus naturel."] },
  { id: "photos", t: "Poser pour les photos", i: "Des repères simples pour les photos en pied, assise, en marchant, en famille.",
    st: [["En pied : un pied devant, le poids sur le pied arrière, le bouquet un peu bas.", { hand: "low", cam: 1 }], ["Pour montrer la traîne et le voile : tourne-toi de trois quarts et regarde par-dessus l’épaule.", { train: 1, cam: 1 }], ["En marchant : marche lentement et naturellement, la photographe s’occupe du reste.", { step: 1, hand: "bouquet", cam: 1, arrow: "fwd" }], ["Assise : au bord de la chaise, le dos droit, la jupe étalée.", { sit: 1, chair: 1, cam: 1 }]],
    tips: ["Pour les détails de la robe, demande des photos de dos et de profil.", "En famille, place-toi au centre et garde le bouquet bas pour ne cacher personne."],
    diff: ["Le sourire figé : pense à quelqu’un que tu aimes, ou parle avec la photographe.", "Le voile qui vole : demande à quelqu’un de le placer entre deux photos."] },
  { id: "marches", t: "Monter et descendre des marches", i: "La sécurité d’abord, l’élégance ensuite.",
    st: [["Avant de bouger, vérifie la robe et tes chaussures.", { stairs: 1 }], ["Soulève l’avant de la jupe avec une main, l’autre tient la rampe.", { stairs: 1, hand: "rail" }], ["Pose tout le pied sur chaque marche et avance lentement.", { stairs: 1, hand: "rail", step: 1 }], ["Une longue traîne : quelqu’un la porte derrière toi.", { stairs: 1, hand: "rail", train: 1 }]],
    tips: ["Demande de l’aide sans hésiter : c’est normal le jour du mariage.", "Pour descendre, regarde les marches, pas le photographe."],
    diff: ["Ne pas voir ses pieds : soulève un peu plus la jupe devant.", "Des talons fins sur des marches en pierre : avance encore plus doucement."] },
  { id: "invites", t: "Accueillir ses invités", i: "Saluer, circuler, s’asseoir et se lever avec aisance, selon tes traditions.",
    st: [["Passe le bouquet dans une main ou confie-le à quelqu’un pour saluer.", { hand: "greet" }], ["Avance vers les invités par petits pas, la traîne relevée si besoin.", { step: 1, train: 1, arrow: "fwd" }], ["Pendant la cérémonie, assieds-toi et lève-toi en préparant la jupe comme dans la leçon 2.", { sit: 1, chair: 1 }]],
    tips: ["Adapte les salutations à tes traditions et à celles de ta famille : il n’y a pas une seule bonne façon.", "Garde une personne de confiance près de toi pour la robe et le bouquet."],
    diff: ["Beaucoup d’invités : des salutations courtes et souriantes suffisent.", "Une tradition que tu connais mal : demande conseil à ta famille avant le jour J."] },
  { id: "confort", t: "Rester à l’aise toute la journée", i: "La préparation qui évite les mauvaises surprises.",
    st: [["Porte tes chaussures plusieurs fois à la maison avant le mariage.", { step: 1 }], ["Teste la robe : marche, assieds-toi, lève les bras, tourne.", { arrow: "turn" }], ["Prévois une paire de chaussures confortables de secours.", {}]],
    tips: ["Vérifie la longueur de la robe avec les chaussures du jour J.", "Vérifie que les fermetures et les boutons tiennent bien.", "Prévois une personne pour aider avec une traîne lourde.", "Fais faire les retouches nécessaires bien avant le mariage."],
    diff: ["Des chaussures neuves qui blessent : porte-les avant, avec des pansements prêts.", "Une robe trop serrée pour manger ou s’asseoir : signale-le à la retouche."] },
  { id: "pratique", t: "S’entraîner avant le mariage", i: "Une liste simple : coche chaque exercice quand tu l’as vraiment fait.", st: [], tips: [], diff: [], check: true }
];
const ZF_PRAC = [["marcher","M’entraîner à marcher"],["asseoir","M’asseoir et me relever"],["bouquet","Tenir le bouquet"],["tourner","Tourner sur moi-même"],["voile","Essayer le voile"],["chaussures","Bouger avec mes chaussures"],["poses","Répéter les poses"]];

// ——— Contexte d'Aura : quotidien ou mariée ———
S.zfCtx = S.zfCtx || "quotidien";
function zfSetCtx(c) { if (S.zfCtx === c) return; S.zfCtx = c; if (typeof TCONV !== "undefined" && TCONV) { try { TCONV.endSession(); } catch (e) {} TCONV = null; } }
const ZF_PAGES = ["zf", "zf_prof", "zf_robe", "zf_cmp", "zf_col", "zf_look", "zf_insp", "zf_acad", "zf_les", "zf_looks"];
ZF_PAGES.forEach(p => { DOCK_OF[p] = "home"; });
{ const prev = window.onPage; window.onPage = pg => { if (ZF_PAGES.includes(pg)) zfSetCtx("mariee"); else if (pg !== "chat") zfSetCtx("quotidien"); if (prev) prev(pg); }; }
// Résumé pour Aura en mode mariée (ajouté à PROFIL()) : seulement ce qu'elle a choisi, et les règles d'honnêteté.
function zfCtx() {
  if (S.zfCtx !== "mariee") return "";
  const p = ZD.prof, L = (k, a) => (Array.isArray(a) ? a : [a]).filter(Boolean).map(v => zfLabel(k, v)).filter(Boolean).join(", ").toLowerCase();
  const x = ["MODE AURA — STYLISME MARIÉE (espace ZIFAFI). Elle prépare sa tenue de mariée : aide-la sur la robe, les coupes, la couverture, les couleurs, les bijoux, le voile, les chaussures, la coiffure, le maquillage, le bouquet, l’étiquette, les photos, le confort et la façon de bouger. Ses goûts de tous les jours ne remplacent pas ses choix de mariée. Ne dis jamais qu’un modèle lui est interdit à cause de sa morphologie, ne critique jamais son corps, ne présente jamais une coutume comme obligatoire, ne promets jamais qu’une robe lui ira à coup sûr, n’invente ni marque, ni prix, ni disponibilité, ni préférence. Si tu ne vois pas de photo, ne prétends pas l’avoir vue. S’il manque une information, pose une question courte."];
  if (!p) x.push("Son profil de mariée n’est pas encore rempli : propose-lui de le compléter dans ZIFAFI.");
  else {
    const f = [];
    if (p.date) f.push("date du mariage " + p.date);
    [["ceremony", "cérémonie"], ["traditions", "traditions"], ["setting", "lieu"], ["events", "moments"], ["aesthetic", "styles"], ["imagine", "robe imaginée"], ["silhouette", "silhouettes"], ["sleeves", "manches"], ["neckline", "encolures"], ["train", "traîne"], ["fabric", "tissus"], ["deco", "décor"], ["movement", "liberté de mouvement"], ["highlight", "à mettre en valeur"], ["cover", "zones à couvrir davantage"], ["sleeveCover", "couverture des bras"], ["neckCover", "encolure"], ["waist", "taille"], ["volume", "volume de jupe"], ["structure", "structure"], ["balance", "confort et formalité"], ["whites", "couleur de robe"], ["temp", "couleurs"], ["metal", "métaux"], ["bouquet", "bouquet"], ["makeup", "maquillage"]]
      .forEach(([k, n]) => { const v = L(k, p[k]); if (v && !/je ne sais pas/.test(v)) f.push(n + " : " + v); });
    if (p.shape && p.shape !== "autre") f.push("catégorie de silhouette choisie par elle (simple repère de style) : " + L("shape", p.shape));
    if (p.tradNote) f.push("à respecter (écrit par elle) : " + p.tradNote);
    if (p.fitNote) f.push("besoin de coupe ou de mouvement (écrit par elle) : " + p.fitNote);
    if (p.inclure) f.push("couleurs à inclure : " + p.inclure); if (p.eviter) f.push("couleurs à éviter : " + p.eviter);
    x.push("Profil de mariée : " + f.join(" ; ") + ".");
  }
  if (ZD.saved.length) x.push("Robes enregistrées : " + ZD.saved.map(r => zfDressTxt(r)).join(" | ") + ".");
  if (ZD.looks.length) x.push("Looks de mariée enregistrés : " + ZD.looks.map(l => "« " + l.nom + " » (" + zfLookTxt(l) + ")").join(" | ") + ".");
  return x.join(" ");
}
const zfDressTxt = r => [r.nom + " (" + (r.dirNom || "").toLowerCase() + ")", "encolure " + zfLabel("neckline", r.neck).toLowerCase(), (r.sleeveTxt || "").toLowerCase(), zfLabel("fabric", r.fab).toLowerCase(), zfLabel("train", r.train).toLowerCase(), zfLabel("whites", r.color).toLowerCase()].filter(Boolean).join(", ");
function zfLookTxt(l) { const o = zfLookOpts(ZD.prof, l.dress); return [l.dress ? "robe " + l.dress.nom.toLowerCase() : "robe à décider", ...ZF_LOOK_CATS.map(([k, n]) => { const s = (o[k] || []).find(x => x.id === l.sel[k]); return n.toLowerCase() + " : " + (s ? s.t.toLowerCase() : "à décider"); })].join(", "); }

// ——— Utilitaires d'affichage ———
const zfIco = {
  ring: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="15" r="6"/><path d="M9 6l3-3 3 3-3 3z"/></svg>',
  hanger: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a2 2 0 1 1 2 2c-1 0-2 .7-2 1.6v.4l8.5 6.2c.8.6.4 1.8-.6 1.8H4.1c-1 0-1.4-1.2-.6-1.8L12 11"/></svg>',
  prof: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  dress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l-1 5 2 3-1 2 4 8H5l4-8-1-2 2-3z"/></svg>',
  col: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="9" r="4"/><circle cx="16" cy="9" r="4"/><circle cx="12" cy="16" r="4"/></svg>',
  look: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8l5.5-.8z"/></svg>',
  insp: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/></svg>',
  acad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/></svg>',
  saved: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>'
};
function zfKeep() { const y = window.scrollY; render(false); window.scrollTo(0, y); }
const zfStatus = (done, txt) => `<span class="zf-st ${done ? "ok" : ""}"><i aria-hidden="true">${done ? "✓" : "○"}</i>${txt}</span>`;
function zfDays() { const d = ZD.prof && ZD.prof.date; if (!d) return null; const n = Math.ceil((new Date(d + "T12:00:00") - new Date()) / 864e5); return n >= 0 ? n : null; }

// ——— Accueil de My Style : les deux univers ———
function zfHomeCards() {
  return `<section class="zf-uni" aria-label="Mes deux univers">
  <article class="zf-u ms"><span class="zf-u-i">${zfIco.hanger}</span><h3>MY STYLE</h3><p class="zf-u-s">Découvre ton style. Exprime-toi.</p>
   <p class="zf-u-d">Ton espace de style au quotidien : tenues, garde-robe et conseils personnalisés d’Aura.</p>
   <button type="button" class="zf-u-b" data-zfmystyle>Explorer My Style</button></article>
  <article class="zf-u zw"><span class="zf-u-i">${zfIco.ring}</span><h3>ZIFAFI <span>— MY WEDDING</span></h3><p class="zf-u-s">Ton mariage. Ton style. Ta confiance.</p>
   <p class="zf-u-d">Découvre ton style de mariée, explore les robes, coordonne tes accessoires et prépare ton grand jour avec Aura.</p>
   <button type="button" class="zf-u-b" data-go="zf">Découvrir Zifafi</button></article></section>`;
}

// ——— Tableau de bord ZIFAFI ———
P.zf = () => {
  const p = ZD.prof, n = zfDays(), reco = p ? zfReco(p, { rej: ZD.rej }) : null, top = reco && reco.state === "ok" ? reco.recos[0] : null;
  if (ZINS === null) zfLoadIns();
  const lesN = ZF_LES.filter(l => ZD.les[l.id]).length;
  const mod = (pg, ic, t, d, st) => `<button class="zf-mod" data-go="${pg}"><span class="zf-mod-i">${zfIco[ic]}</span><span class="zf-mod-t"><b>${t}</b><small>${d}</small>${st}</span><span class="zf-chev" aria-hidden="true">›</span></button>`;
  const nb = (n, one, many) => n === 0 ? "Rien pour l’instant" : n === 1 ? one : many.replace("{0}", n);
  return { dock: 1, html: `<div class="zf">
  <button class="zf-backms" data-zfhome>‹ My Style</button>
  <div class="zf-hero"><p class="zf-kick">ZIFAFI</p><h1>My Wedding</h1><p class="zf-tag">Ton mariage. Ton style. Ta confiance.</p>
   ${n !== null ? `<p class="zf-count">${n === 0 ? "C’est aujourd’hui" : n === 1 ? "Plus qu’un jour" : `Plus que ${n} jours`}</p>` : ""}</div>
  ${!p ? `<section class="zf-start"><h2>Commençons par toi</h2><p>Quelques questions sur ton mariage et tes goûts. Ensuite, chaque conseil sera fait pour toi. Tu peux répondre « je ne sais pas ».</p><button class="btn" data-zfprof="0">Créer mon profil de mariée</button></section>`
    : top ? `<section class="zf-next"><p class="zf-kick2">Pour toi</p><div class="zf-next-in">${zfDressSVG(top)}<div><h2>${esc(top.dirNom)} · ${esc(top.nom)}</h2><p>${esc(top.desc)}</p><button class="zf-lnk" data-go="zf_robe">Voir mes 3 directions ›</button></div></div></section>`
    : `<section class="zf-start"><h2>Encore quelques préférences</h2><p>Dis-m’en un peu plus sur la robe que tu imagines pour que je te propose des directions.</p><button class="btn" data-zfprof="1">Compléter mon profil</button></section>`}
  <h2 class="zf-h">Ton parcours</h2>
  <div class="zf-mods">
   ${mod("zf_prof", "prof", "Mon profil de mariée", "Ton mariage, tes goûts, tes couleurs", zfStatus(!!p, p ? "Rempli" : "À faire"))}
   ${mod("zf_robe", "dress", "Trouver ma robe", "Des directions expliquées, à comparer", zfStatus(ZD.saved.length > 0, nb(ZD.saved.length, "1 robe enregistrée", "{0} robes enregistrées")))}
   ${mod("zf_col", "col", "Mes couleurs", "Robe, métaux, bouquet, harmonies", zfStatus(ZD.pal.length > 0, nb(ZD.pal.length, "1 palette enregistrée", "{0} palettes enregistrées")))}
   ${mod("zf_look", "look", "Compléter mon look", "Bijoux, voile, chaussures, coiffure, maquillage, bouquet", zfStatus(ZD.looks.length > 0, nb(ZD.looks.length, "1 look créé", "{0} looks créés")))}
   ${mod("zf_insp", "insp", "Mon inspiration", "Tes idées en images, classées", zfStatus(ZD.insN > 0, nb(ZD.insN, "1 idée", "{0} idées")))}
   ${mod("zf_acad", "acad", "Académie de l’élégance", "Marcher, s’asseoir, poser, en confiance", zfStatus(lesN === ZF_LES.length, `${lesN} / ${ZF_LES.length} leçons terminées`))}
   ${mod("zf_looks", "saved", "Mes looks de mariée", "Comparer, modifier, choisir", zfStatus(ZD.looks.length > 0, nb(ZD.looks.length, "1 look", "{0} looks")))}
  </div>
  <button class="zf-aura" data-zfaura><b>Demander à Aura</b><small>Aura — Stylisme mariée</small></button>
  <p class="zf-priv">Tes réponses, tes looks et tes photos d’inspiration restent sur ce téléphone. Ils ne sont pas synchronisés avec tes autres appareils.</p>
  ${p || ZD.saved.length || ZD.looks.length || ZD.pal.length || ZD.insN ? `<button class="link" data-zfwipe>Effacer toutes mes données ZIFAFI</button>` : ""}
  </div>`, say: "Bienvenue dans ZIFAFI, ton espace mariée." };
};

// ——— Profil de mariée : 5 étapes + relecture ———
const ZF_STEPS = ["Ton mariage", "Ta robe", "Tes préférences", "Ta silhouette", "Tes couleurs", "Relecture"];
function zfChips(k, d) {
  const one = ZF_ONE.includes(k), v = d[k];
  return `<div class="pk zf-pk" data-zfk="${k}" ${one ? 'data-zfone="1"' : ""} role="group">${ZF[k].map(([id, l]) => `<button type="button" data-zfv="${id}" aria-pressed="${one ? v === id : (v || []).includes(id)}">${esc(l)}</button>`).join("")}</div>`;
}
const zfQ = (k, q, d, hint) => `<fieldset class="zf-q"><legend>${q}</legend>${hint ? `<p class="zf-hint">${hint}</p>` : ""}${zfChips(k, d)}</fieldset>`;
const zfGloss = ids => `<details class="zf-gl"><summary>Que veulent dire ces mots ?</summary>${ids.map(i => `<p>${esc(ZF_GLOSS[i])}</p>`).join("")}</details>`;
const zfTxt = (k, lbl, ph, d) => `<label class="lbl" for="zt_${k}">${lbl} <small>· facultatif</small></label><input class="field" id="zt_${k}" data-zft="${k}" maxlength="${ZF_TXT[k]}" value="${esc(d[k] || "")}" placeholder="${ph}">`;
P.zf_prof = () => {
  if (!S.zfDraft) S.zfDraft = zfCleanProf(ZD.prof || {});
  const d = S.zfDraft, st = S.zfStep || 0, N = ZF_STEPS.length;
  let body = "";
  if (st === 0) body = `<label class="lbl" for="zf_date">Date du mariage <small>· si tu la connais</small></label><input class="field" type="date" id="zf_date" value="${esc(d.date)}">
   ${zfQ("ceremony", "Type de cérémonie", d)}${zfQ("traditions", "Traditions ou culture à respecter", d, "Plusieurs choix possibles.")}
   ${zfTxt("tradNote", "Une tradition ou une règle à respecter pour la tenue", "Par exemple : robe couvrante pour la cérémonie", d)}
   ${zfQ("setting", "Où aura lieu le mariage ?", d)}${zfQ("events", "Les grands moments de ton mariage", d)}
   <fieldset class="zf-q"><legend>Langue de l’application</legend><div class="pk zf-pk">${[["fr", "Français"], ["en", "English"], ["ar", "العربية"]].map(([l, n]) => `<button type="button" data-setlang="${l}" aria-pressed="${(S.lang || "fr") === l}" data-noi18n>${n}</button>`).join("")}</div></fieldset>
   ${zfQ("aesthetic", "Ton style de mariée", d, "Choisis tout ce qui te plaît : ce sont des pistes, pas des cases.")}`;
  if (st === 1) body = `${zfQ("imagine", "Quelle robe imagines-tu ?", d)}${zfQ("silhouette", "Quelle silhouette te plaît ?", d)}${zfGloss(["trapeze", "princesse", "ajustee", "droite", "empire"])}
   ${zfQ("sleeves", "Les manches", d)}${zfQ("neckline", "Les encolures que tu aimes", d)}${zfGloss(["bateau", "coeur"])}
   ${zfQ("train", "La traîne", d)}${zfQ("fabric", "Les tissus", d)}${zfGloss(["mikado"])}${zfQ("deco", "Décor de la robe", d)}${zfQ("movement", "La liberté de mouvement, c’est…", d)}`;
  if (st === 2) body = `<p class="zf-hint">Il n’y a pas de bonne ou de mauvaise réponse : c’est toi qui décides de ce que tu veux montrer ou couvrir.</p>
   ${zfQ("highlight", "Ce que tu aimerais mettre en valeur", d)}${zfQ("cover", "Là où tu préfères plus de couverture", d)}
   ${zfQ("sleeveCover", "Couverture des bras", d)}${zfQ("neckCover", "Couverture de l’encolure", d)}${zfQ("waist", "La taille", d)}
   ${zfQ("volume", "Le volume de la jupe", d)}${zfQ("structure", "La tenue du tissu", d)}${zfQ("balance", "Entre confort et formalité", d)}
   ${zfTxt("fitNote", "Un besoin de coupe ou de mouvement", "Par exemple : je dois pouvoir danser", d)}`;
  if (st === 3) body = `<div class="note zf-note">Étape facultative. Ce sont des catégories de style simplifiées, pas une mesure médicale ni scientifique. Aucune photo ni mesure n’est demandée, et je ne déduis rien de ta taille ou de ton poids. Elles servent seulement à départager des idées, jamais à t’interdire une robe.</div>
   ${zfQ("shape", "La catégorie qui te ressemble le plus", d)}<button class="link" data-zfskip>Passer cette étape</button>`;
  if (st === 4) { const sea = typeof season === "function" && season();
    body = `${zfQ("whites", "Les blancs et ivoires que tu aimes", d)}${zfQ("temp", "Tes couleurs, plutôt…", d)}
   ${sea ? `<p class="zf-hint">Ta saison enregistrée dans My Style : ${esc(sea)}. C’est un repère : tes couleurs de mariée peuvent être différentes.</p>` : ""}
   ${zfQ("metal", "Bijoux", d)}${zfQ("bouquet", "Couleurs du bouquet", d)}${zfQ("makeup", "Maquillage", d)}
   ${zfTxt("inclure", "Des couleurs à inclure", "Par exemple : vert sauge", d)}${zfTxt("eviter", "Des couleurs à éviter", "Par exemple : orange", d)}`; }
  if (st === 5) {
    const sec = (i, rows) => `<section class="zf-rv"><div class="zf-rv-h"><h2>${ZF_STEPS[i]}</h2><button class="zf-lnk" data-zfstep="${i}">Modifier</button></div>${rows.map(([lab, k]) => { const v = k === "date" ? d.date : ZF_TXT[k] !== undefined ? d[k] : (Array.isArray(d[k]) ? d[k] : [d[k]]).filter(Boolean).map(x => zfLabel(k, x)); const has = Array.isArray(v) ? v.length : !!v;
      return `<div class="zf-rv-r"><span>${lab}</span>${has ? (Array.isArray(v) ? v.map(x => `<em>${esc(x)}</em>`).join("") : `<em data-noi18n>${esc(v)}</em>`) : `<i>Pas de réponse</i>`}</div>`; }).join("")}</section>`;
    body = `<p class="zf-hint">Relis tes réponses. Touche « Modifier » pour changer une étape.</p>
     ${sec(0, [["Date", "date"], ["Cérémonie", "ceremony"], ["Traditions", "traditions"], ["À respecter", "tradNote"], ["Lieu", "setting"], ["Moments", "events"], ["Style", "aesthetic"]])}
     ${sec(1, [["Robe imaginée", "imagine"], ["Silhouette", "silhouette"], ["Manches", "sleeves"], ["Encolures", "neckline"], ["Traîne", "train"], ["Tissus", "fabric"], ["Décor", "deco"], ["Mouvement", "movement"]])}
     ${sec(2, [["Mettre en valeur", "highlight"], ["Plus couvert", "cover"], ["Bras", "sleeveCover"], ["Encolure", "neckCover"], ["Marquage de la taille", "waist"], ["Volume", "volume"], ["Tenue du tissu", "structure"], ["Confort et formalité", "balance"], ["Besoin", "fitNote"]])}
     ${sec(3, [["Catégorie", "shape"]])}
     ${sec(4, [["Blancs", "whites"], ["Couleurs", "temp"], ["Bijoux", "metal"], ["Bouquet", "bouquet"], ["Maquillage", "makeup"], ["À inclure", "inclure"], ["À éviter", "eviter"]])}
     <p class="zf-priv">Ton profil est enregistré sur ce téléphone seulement (pas de compte en ligne, pas de synchronisation). Quand tu parles à Aura en mode mariée, ce résumé lui est envoyé pour qu’elle te conseille.</p>
     ${ZD.prof ? `<button class="link" data-zfdelprof>Supprimer mon profil de mariée</button>` : ""}`;
  }
  return { back: true, html: `<div class="zf zf-form"><p class="step">Mon profil de mariée · Étape ${st + 1} sur ${N}</p>
   <div class="zf-prog" role="progressbar" aria-valuemin="1" aria-valuemax="${N}" aria-valuenow="${st + 1}" aria-label="Progression du profil"><i style="width:${(st + 1) / N * 100}%"></i></div>
   <h1>${ZF_STEPS[st]}</h1>${body}</div>`,
    foot: `<div class="zf-foot">${st > 0 ? `<button class="btn ghost" data-zfstep="${st - 1}">Précédent</button>` : ""}${st < 5 ? `<button class="btn" data-zfstep="${st + 1}">Suivant</button>` : `<button class="btn" data-zfsaveprof>Enregistrer mon profil</button>`}</div>` };
};

// ——— Trouver ma robe ———
const zfRow = (l, v) => v ? `<div class="zf-dr"><span>${l}</span><b>${esc(v)}</b></div>` : "";
function zfRecoCard(r, saved) {
  const isSaved = ZD.saved.some(x => x.key === r.key), sel = (S.zfCmp || []).includes(r.key);
  return `<article class="zf-reco" data-key="${esc(r.key)}"><p class="zf-kick2">${esc(r.dirNom)}</p>
   <div class="zf-reco-top"><figure>${zfDressSVG(r)}<figcaption>Illustration schématique, pas un modèle réel</figcaption></figure>
   <div><h2>Ta robe ${esc(r.nom)}</h2><p>${esc(r.desc)}</p></div></div>
   ${saved ? "" : `<div class="zf-why"><b>Pourquoi elle peut te plaire</b><ul>${r.why.slice(0, 6).map(w => `<li>${esc(cap(w))}</li>`).join("")}</ul></div>`}
   <div class="zf-drs">${zfRow("Encolure", zfLabel("neckline", r.neck))}${zfRow("Manches", r.sleeveTxt)}${zfRow("Tissu", zfLabel("fabric", r.fab))}${zfRow("Jupe", ZF_SIL[r.sil].jupe)}${zfRow("Traîne", zfLabel("train", r.train))}${zfRow("Couleur", zfLabel("whites", r.color))}${zfRow("Décor", zfLabel("deco", r.deco))}${r.acc ? zfRow("Accessoires", r.acc) : ""}</div>
   ${r.comfort && r.comfort.length ? `<div class="zf-cf"><b>Confort et mouvement</b><ul>${r.comfort.map(c => `<li>${esc(c)}</li>`).join("")}</ul></div>` : ""}
   <div class="zf-acts">
    <button type="button" data-zfsave="${esc(r.key)}" aria-pressed="${isSaved}">${isSaved ? "✓ Enregistrée" : "Enregistrer"}</button>
    <button type="button" data-zfcmp="${esc(r.key)}" aria-pressed="${sel}">${sel ? "✓ À comparer" : "Comparer"}</button>
    ${saved ? `<button type="button" data-zfunsave="${esc(r.key)}">Retirer</button>` : `<button type="button" data-zfrej="${esc(r.key)}">Pas pour moi</button>${r.more ? `<button type="button" data-zfalt="${esc(r.dir)}">Une autre option</button>` : ""}`}
    <button type="button" data-zfask="${esc("J’hésite sur cette robe : " + zfDressTxt(r) + ". Qu’en penses-tu pour moi ?")}">Demander à Aura</button>
   </div></article>`;
}
P.zf_robe = () => {
  const p = ZD.prof;
  let main = "";
  if (!p) main = `<div class="zf-start"><h2>Commence par ton profil</h2><p>Je base mes propositions sur tes réponses, je ne devine rien.</p><button class="btn" data-zfprof="0">Créer mon profil de mariée</button></div>`;
  else if (!S.zfShow) main = `<div class="zf-start"><h2>Prête ?</h2><p>Je croise tes réponses pour te proposer trois directions, chacune expliquée.</p><button class="btn" data-zfshow>Découvrir mon style de mariée</button></div>`;
  else {
    const r = zfReco(p, { rej: ZD.rej, alt: S.zfAlt || {} });
    if (r.state === "decouverte") main = `<div class="zf-start"><h2>J’ai besoin d’en savoir un peu plus</h2><p>Pour te proposer des robes vraiment pour toi, réponds à au moins deux de ces questions :</p><ul class="zf-ul">${r.manque.map(k => `<li>${{ silhouette: "La silhouette qui te plaît", volume: "Le volume de la jupe", waist: "La taille", movement: "La liberté de mouvement", aesthetic: "Ton style de mariée" }[k]}</li>`).join("")}</ul><button class="btn" data-zfprof="1">Répondre</button></div>`;
    else { S.zfLast = r.recos; main = `<p class="zf-hint">Ces propositions viennent de règles simples appliquées à tes réponses. Ce sont des pistes à essayer en boutique, pas une garantie : seul l’essayage dit si une robe te va.</p>${r.recos.map(x => zfRecoCard(x)).join("")}${ZD.rej.length ? `<button class="link" data-zfunrej>Revoir les propositions écartées (${ZD.rej.length})</button>` : ""}`; }
  }
  const cmp = (S.zfCmp || []).length;
  return { back: true, html: `<div class="zf"><p class="step">ZIFAFI</p><h1>Trouver ma robe</h1>
   ${p ? `<div class="zf-tools"><button class="zf-lnk" data-zfprof="1">Ajuster mes préférences</button><button class="zf-lnk" data-zfprof="5">Retour à mon profil</button></div>` : ""}
   ${main}
   ${ZD.saved.length ? `<h2 class="zf-h">Mes robes enregistrées</h2>${ZD.saved.map(x => zfRecoCard(x, true)).join("")}` : ""}</div>`,
    foot: cmp ? `<div class="zf-foot"><button class="btn" data-zfgocmp ${cmp < 2 ? "disabled" : ""}>${cmp < 2 ? "Choisis une 2e robe à comparer" : "Comparer les 2 robes"}</button></div>` : "" };
};
const zfFindDress = key => ZD.saved.find(x => x.key === key) || (S.zfLast || []).find(x => x.key === key);
P.zf_cmp = () => {
  const [a, b] = (S.zfCmp || []).map(zfFindDress);
  if (!a || !b) return { back: true, html: `<div class="zf"><h1>Comparer</h1><p class="sub">Choisis deux robes dans « Trouver ma robe ».</p><button class="btn" data-go="zf_robe">Trouver ma robe</button></div>` };
  const rows = [["Direction", r => r.dirNom], ["Silhouette", r => r.nom], ["Encolure", r => zfLabel("neckline", r.neck)], ["Manches", r => r.sleeveTxt], ["Tissu", r => zfLabel("fabric", r.fab)], ["Jupe", r => ZF_SIL[r.sil].jupe], ["Traîne", r => zfLabel("train", r.train)], ["Couleur", r => zfLabel("whites", r.color)], ["Décor", r => zfLabel("deco", r.deco)]];
  return { back: true, html: `<div class="zf"><p class="step">Trouver ma robe</p><h1>Comparer deux robes</h1>
   <div class="zf-cmp"><div>${zfDressSVG(a)}<b>${esc(a.nom)}</b></div><div>${zfDressSVG(b)}<b>${esc(b.nom)}</b></div></div>
   <table class="zf-tbl"><tbody>${rows.map(([l, f]) => `<tr><th scope="row" colspan="2">${l}</th></tr><tr><td>${esc(f(a) || "—")}</td><td>${esc(f(b) || "—")}</td></tr>`).join("")}</tbody></table>
   <p class="zf-priv">Illustrations schématiques, pas des modèles réels.</p>
   <button class="btn" data-zfask="${esc("Aide-moi à choisir entre ces deux robes : 1) " + zfDressTxt(a) + " ; 2) " + zfDressTxt(b) + ".")}">Demander à Aura de m’aider à choisir</button>
   <button class="btn ghost" data-zfcmpclear>Effacer la comparaison</button></div>` };
};

// ——— Mes couleurs ———
P.zf_col = () => {
  const p = ZD.prof || zfCleanProf({}), sea = typeof season === "function" && season();
  return { back: true, html: `<div class="zf"><p class="step">ZIFAFI</p><h1>Mes couleurs</h1>
  <p class="sub">Robe, voile, bijoux, chaussures, bouquet, coiffure et maquillage : tout se coordonne. Le choix final dépend de tes goûts, du tissu et de la lumière du lieu.</p>
  <h2 class="zf-h">La couleur de la robe</h2><div class="zf-sw">${ZF_ROBES.map(([id, n, hex, t]) => `<div class="zf-swi ${zfHas(p, "whites", id) ? "me" : ""}"><i style="background:${hex}"></i><b>${n}</b><small>${t}</small>${zfHas(p, "whites", id) ? `<em>Ton choix</em>` : ""}</div>`).join("")}</div>
  <h2 class="zf-h">La couleur des bijoux</h2><div class="zf-sw met">${ZF_METAUX.map(([id, n, hex]) => `<div class="zf-swi ${zfHas(p, "metal", id) ? "me" : ""}"><i style="background:${hex}"></i><b>${n}</b>${zfHas(p, "metal", id) ? `<em>Ton choix</em>` : ""}</div>`).join("")}</div>
  <p class="zf-hint">Il n’y a pas de règle absolue : l’or, l’argent ou l’or rose se choisissent selon les détails de la robe, ton style et ce que tu aimes porter.${sea ? " Ta saison My Style (" + esc(sea) + ") peut servir de repère, sans t’obliger." : ""}</p>
  <h2 class="zf-h">Des harmonies à explorer</h2><p class="zf-hint">Des exemples, pas des obligations. Enregistre celles que tu aimes.</p>
  <div class="zf-pals">${ZF_PALS.map(pl => { const fit = ZD.prof ? zfPalFit(ZD.prof, pl) : [], on = ZD.pal.includes(pl.id);
    return `<div class="zf-pal"><div class="zf-pal-c">${pl.c.map(c => `<i style="background:${c}"></i>`).join("")}</div><b>${pl.nom}</b>${fit.length ? `<small>Proche de tes choix : ${fit.join(", ")}</small>` : ""}<button type="button" data-zfpal="${pl.id}" aria-pressed="${on}">${on ? "✓ Enregistrée" : "Enregistrer"}</button></div>`; }).join("")}</div>
  ${ZD.prof && (ZD.prof.inclure || ZD.prof.eviter) ? `<div class="note">${ZD.prof.inclure ? `<p><span>À inclure :</span> <span data-noi18n>${esc(ZD.prof.inclure)}</span></p>` : ""}${ZD.prof.eviter ? `<p><span>À éviter :</span> <span data-noi18n>${esc(ZD.prof.eviter)}</span></p>` : ""}</div>` : ""}
  <button class="btn ghost" data-zfask="Aide-moi à coordonner les couleurs de ma robe, de mes bijoux et de mon bouquet.">Demander à Aura</button></div>` };
};

// ——— Compléter mon look ———
function zfNewLook() { const d = ZD.saved[0] || null; return { id: "", nom: "", dress: d, pal: ZD.pal[0] || "", sel: Object.fromEntries(ZF_LOOK_CATS.map(([k]) => [k, ""])), notes: "", fav: false, d: "" }; }
P.zf_look = () => {
  if (!S.zfLook) S.zfLook = zfNewLook();
  const L = S.zfLook, o = zfLookOpts(ZD.prof, L.dress);
  const dressPick = ZD.saved.length ? `<div class="pk zf-pk">${ZD.saved.map(r => `<button type="button" data-zflkdress="${esc(r.key)}" aria-pressed="${!!L.dress && L.dress.key === r.key}">${esc(r.nom)} · ${esc(r.dirNom)}</button>`).join("")}<button type="button" data-zflkdress="" aria-pressed="${!L.dress}">À décider</button></div>`
    : `<p class="zf-hint">Enregistre d’abord une robe dans « Trouver ma robe » : les conseils s’adapteront à son encolure et à sa traîne.</p><button class="zf-lnk" data-go="zf_robe">Trouver ma robe ›</button>`;
  const cat = ([k, n]) => { const cur = o[k].find(x => x.id === L.sel[k]);
    return `<fieldset class="zf-q"><legend>${n}</legend><div class="pk zf-pk">${o[k].map(x => `<button type="button" data-zflk="${k}" data-zfv="${x.id}" aria-pressed="${L.sel[k] === x.id}">${esc(x.t)}</button>`).join("")}</div>
     <p class="zf-why2">${cur ? esc(cur.w) : "À décider. Touche une option pour voir pourquoi elle peut aller avec ta robe."}</p></fieldset>`; };
  return { back: true, html: `<div class="zf zf-form"><p class="step">ZIFAFI</p><h1>${L.id ? "Modifier mon look" : "Compléter mon look"}</h1>
   <fieldset class="zf-q"><legend>Ma robe</legend>${dressPick}${L.dress ? `<div class="zf-lkd">${zfDressSVG(L.dress)}<p>${[L.dress.nom, zfLabel("neckline", L.dress.neck), L.dress.sleeveTxt, zfLabel("fabric", L.dress.fab), zfLabel("train", L.dress.train), zfLabel("whites", L.dress.color)].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join(" · ")}</p></div>` : ""}</fieldset>
   <fieldset class="zf-q"><legend>Ma palette</legend><div class="pk zf-pk">${ZF_PALS.filter(p => ZD.pal.includes(p.id) || L.pal === p.id).map(p => `<button type="button" data-zflkpal="${p.id}" aria-pressed="${L.pal === p.id}"><span class="zf-mini">${p.c.map(c => `<i style="background:${c}"></i>`).join("")}</span>${esc(p.nom)}</button>`).join("") || `<span class="zf-hint">Aucune palette enregistrée.</span>`}</div><button class="zf-lnk" data-go="zf_col">Voir les harmonies ›</button></fieldset>
   ${ZF_LOOK_CATS.map(cat).join("")}
   <label class="lbl" for="zf_lkname">Nom du look</label><input class="field" id="zf_lkname" maxlength="60" value="${esc(L.nom)}" placeholder="Par exemple : Look cérémonie">
   <label class="lbl" for="zf_lknotes">Notes <small>· facultatif</small></label><textarea class="field" id="zf_lknotes" maxlength="300" rows="2">${esc(L.notes)}</textarea>
   <h2 class="zf-h">Résumé</h2><div class="zf-sum">${zfLookSum(L)}</div></div>`,
    foot: `<div class="zf-foot">${L.id ? `<button class="btn ghost" data-zflknew>Nouveau look</button>` : ""}<button class="btn" data-zflksave>${L.id ? "Enregistrer les changements" : "Enregistrer ce look"}</button></div>` };
};
function zfLookSum(L) {
  const o = zfLookOpts(ZD.prof, L.dress), pal = ZF_PALS.find(p => p.id === L.pal), und = `<i>À décider</i>`;
  return [["Robe", L.dress ? esc(L.dress.nom + " · " + L.dress.dirNom) : und], ["Couleur de la robe", L.dress ? esc(zfLabel("whites", L.dress.color)) : und], ["Palette", pal ? esc(pal.nom) : und],
    ...ZF_LOOK_CATS.map(([k, n]) => { const s = o[k].find(x => x.id === L.sel[k]); return [n, s ? esc(s.t) : und]; })]
    .map(([l, v]) => `<div class="zf-rv-r"><span>${l}</span><em>${v}</em></div>`).join("");
}

// ——— Mes looks de mariée ———
P.zf_looks = () => {
  const sel = S.zfLkSel || [], cmp = sel.map(id => ZD.looks.find(l => l.id === id)).filter(Boolean);
  const list = ZD.looks.slice().sort((a, b) => (b.fav - a.fav) || (b.d > a.d ? 1 : -1));
  return { back: true, html: `<div class="zf"><p class="step">ZIFAFI</p><h1>Mes looks de mariée</h1>
   ${!list.length ? `<div class="zf-start"><h2>Aucun look pour l’instant</h2><p>Crée ton premier look complet : robe, bijoux, voile, chaussures, coiffure, maquillage et bouquet.</p><button class="btn" data-zflknew>Créer un look</button></div>`
    : `<button class="btn" data-zflknew>Créer un nouveau look</button>
   ${list.map(l => `<article class="zf-lk"><div class="zf-lk-h"><h2 data-noi18n>${esc(l.nom)}</h2><button type="button" class="zf-fav" data-zflkfav="${l.id}" aria-pressed="${l.fav}" aria-label="Favori">${l.fav ? "★" : "☆"}</button></div>
    <p class="zf-date"><span>Créé le</span> <span data-noi18n>${esc(l.d)}</span></p><div class="zf-sum">${zfLookSum(l)}</div>${l.notes ? `<p class="zf-notes" data-noi18n>${esc(l.notes)}</p>` : ""}
    <div class="zf-acts"><button type="button" data-zflkedit="${l.id}">Modifier</button><button type="button" data-zflkdup="${l.id}">Dupliquer</button><button type="button" data-zflksel="${l.id}" aria-pressed="${sel.includes(l.id)}">${sel.includes(l.id) ? "✓ À comparer" : "Comparer"}</button><button type="button" data-zflkdel="${l.id}">Supprimer</button></div></article>`).join("")}`}
   ${cmp.length === 2 ? `<h2 class="zf-h">Comparaison</h2><div class="zf-cmp2"><div><b data-noi18n>${esc(cmp[0].nom)}</b>${zfLookSum(cmp[0])}</div><div><b data-noi18n>${esc(cmp[1].nom)}</b>${zfLookSum(cmp[1])}</div></div>
    <button class="btn ghost" data-zfask="${esc("Aide-moi à choisir entre mes deux looks : 1) « " + cmp[0].nom + " » : " + zfLookTxt(cmp[0]) + " ; 2) « " + cmp[1].nom + " » : " + zfLookTxt(cmp[1]) + ".")}">Demander à Aura de m’aider à choisir</button>` : sel.length === 1 ? `<p class="zf-hint">Choisis un deuxième look à comparer.</p>` : ""}</div>` };
};

// ——— Mon inspiration ———
P.zf_insp = () => {
  if (ZINS === null) { zfLoadIns(); return { back: true, html: `<div class="zf"><h1>Mon inspiration</h1><p class="sub">Chargement…</p></div>` }; }
  const f = S.zfInsF || "", only = !!S.zfInsFav, sel = S.zfInsSel || [], draft = S.zfInsD || { cat: "robes", titre: "", note: "" };
  const list = ZINS.filter(x => (!f || x.cat === f) && (!only || x.fav)), cmp = sel.map(id => ZINS.find(x => x.id === id)).filter(Boolean);
  return { back: true, html: `<div class="zf"><p class="step">ZIFAFI</p><h1>Mon inspiration</h1>
   <p class="sub">Garde tes idées en images et classe-les.</p>
   ${ZINS_ERR ? `<div class="note">${ZINS_ERR}</div>` : `<details class="zf-add" ${S.zfInsOpen ? "open" : ""}><summary>+ Ajouter une inspiration</summary>
    <fieldset class="zf-q"><legend>Catégorie</legend><div class="pk zf-pk">${ZF_ICATS.map(([id, n]) => `<button type="button" data-zfinscat="${id}" aria-pressed="${draft.cat === id}">${n}</button>`).join("")}</div></fieldset>
    <label class="lbl" for="zf_it">Titre</label><input class="field" id="zf_it" maxlength="60" value="${esc(draft.titre)}" placeholder="Par exemple : manches en dentelle">
    <label class="lbl" for="zf_in">Note personnelle <small>· facultatif</small></label><input class="field" id="zf_in" maxlength="200" value="${esc(draft.note)}">
    <label class="lb pri zf-up">Choisir une image<input type="file" accept="image/jpeg,image/png,image/webp" data-zfinsfile hidden></label>
    <p class="zf-priv">JPEG, PNG ou WebP, 15 Mo maximum. L’image est réduite et enregistrée sur ce téléphone seulement : elle n’est envoyée à personne et ne se synchronise pas.</p></details>`}
   <div class="fchips zf-filt" role="group" aria-label="Filtrer"><button type="button" data-zfinsf="" aria-pressed="${!f}">Tout</button>${ZF_ICATS.map(([id, n]) => `<button type="button" data-zfinsf="${id}" aria-pressed="${f === id}">${n}</button>`).join("")}<button type="button" data-zfinsfav aria-pressed="${only}">★ Favoris</button></div>
   ${!list.length ? `<p class="zf-empty">${ZINS.length ? "Aucune inspiration dans ce filtre." : "Aucune inspiration pour l’instant. Ajoute ta première image."}</p>`
     : `<div class="zf-gal">${list.map(x => `<figure class="zf-ins"><img src="${x.img}" alt="${esc(x.titre || "Inspiration")}" loading="lazy"><figcaption><b data-noi18n>${esc(x.titre || "Sans titre")}</b><small>${esc((ZF_ICATS.find(c => c[0] === x.cat) || [])[1] || "")}</small>${x.note ? `<span data-noi18n>${esc(x.note)}</span>` : ""}</figcaption>
       <div class="zf-insa"><button type="button" data-zfinsfv="${x.id}" aria-pressed="${x.fav}" aria-label="Favori">${x.fav ? "★" : "☆"}</button><button type="button" data-zfinssel="${x.id}" aria-pressed="${sel.includes(x.id)}" aria-label="Comparer">⇄</button><button type="button" data-zfinsdel="${x.id}" aria-label="Supprimer">×</button></div></figure>`).join("")}</div>`}
   ${cmp.length === 2 ? `<h2 class="zf-h">Comparer</h2><div class="zf-cmp">${cmp.map(x => `<div><img src="${x.img}" alt="${esc(x.titre)}"><b data-noi18n>${esc(x.titre || "Sans titre")}</b></div>`).join("")}</div><button class="btn ghost" data-zfinsclr>Effacer la comparaison</button>` : sel.length === 1 ? `<p class="zf-hint">Choisis une deuxième image à comparer (⇄).</p>` : ""}</div>` };
};
async function zfAddIns(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast("Ce format n’est pas accepté : choisis une image JPEG, PNG ou WebP."); return; }
  if (file.size > 15 * 1024 * 1024) { toast("Image trop lourde : 15 Mo maximum."); return; }
  const dr = S.zfInsD || { cat: "robes", titre: "", note: "" };
  try {
    const b64 = await shrink(file, 1024);
    const it = { id: zfId(), cat: dr.cat, titre: dr.titre.trim().slice(0, 60), note: dr.note.trim().slice(0, 200), fav: false, img: "data:image/jpeg;base64," + b64, d: new Date().toISOString() };
    await ZIDB.put(it); ZINS.unshift(it); ZD.insN = ZINS.length; zfSave(); S.zfInsD = { cat: dr.cat, titre: "", note: "" }; S.zfInsOpen = false; toast("Inspiration ajoutée"); zfKeep();
  } catch (e) { toast("L’image n’a pas pu être ajoutée. Essaie une autre image."); }
}

// ——— Académie ———
P.zf_acad = () => ({ back: true, html: `<div class="zf"><p class="step">ZIFAFI</p><h1>Académie de l’élégance</h1><p class="zf-tag2">Bouge avec confiance. Sois à l’aise. Profite de ton moment.</p>
  <div class="zf-mods">${ZF_LES.map((l, i) => `<button class="zf-mod" data-zfles="${l.id}"><span class="zf-num">${i + 1}</span><span class="zf-mod-t"><b>${l.t}</b><small>${l.i}</small>${zfStatus(!!ZD.les[l.id], ZD.les[l.id] ? "Terminée" : "Pas encore faite")}</span><span class="zf-chev" aria-hidden="true">›</span></button>`).join("")}</div>
  <p class="zf-priv">Les schémas sont des illustrations simplifiées dessinées pour l’app ; des illustrations détaillées ou des vidéos viendront compléter les leçons.</p></div>` });
P.zf_les = () => {
  const ix = ZF_LES.findIndex(l => l.id === S.zfLes), l = ZF_LES[ix] || ZF_LES[0], done = !!ZD.les[l.id], nx = ZF_LES[ix + 1];
  const trad = l.id === "invites" && ZD.prof && ZD.prof.traditions.length ? `<div class="note">Tu as indiqué : ${ZD.prof.traditions.map(t => esc(zfLabel("traditions", t))).join(", ")}. Garde ces repères et adapte-les avec ta famille.</div>` : l.id === "invites" ? `<p class="zf-hint">Tu peux indiquer tes traditions dans ton profil de mariée.</p>` : "";
  return { back: true, html: `<div class="zf zf-les"><p class="step">Leçon ${ix + 1} sur ${ZF_LES.length}</p><h1>${l.t}</h1><p class="sub">${l.i}</p>${trad}
   ${l.check ? `<div class="zf-chk">${ZF_PRAC.map(([id, n]) => `<button type="button" role="checkbox" aria-checked="${!!ZD.prac[id]}" data-zfprac="${id}"><i aria-hidden="true">${ZD.prac[id] ? "✓" : ""}</i>${n}</button>`).join("")}</div>
     <p class="zf-hint">${Object.keys(ZD.prac).filter(k => ZF_PRAC.some(p => p[0] === k)).length} / ${ZF_PRAC.length} exercices faits</p>`
     : `<ol class="zf-steps">${l.st.map(([t, f], i) => `<li><figure>${zfFig(f)}<figcaption>Schéma ${i + 1}</figcaption></figure><p>${t}</p></li>`).join("")}</ol>
   <h2 class="zf-h">Conseils pratiques</h2><ul class="zf-ul">${l.tips.map(t => `<li>${t}</li>`).join("")}</ul>
   <h2 class="zf-h">Les difficultés fréquentes</h2><ul class="zf-ul">${l.diff.map(t => `<li>${t}</li>`).join("")}</ul>
   <button class="btn ghost" data-zfask="${esc("J’ai une question sur la leçon « " + l.t + " » pour ma robe.")}">Poser une question à Aura</button>`}
   </div>`,
    foot: `<div class="zf-foot"><button class="btn ${done ? "ghost" : ""}" data-zflesdone="${l.id}" aria-pressed="${done}">${done ? "✓ Leçon terminée" : "Marquer comme terminée"}</button>${nx ? `<button class="btn ghost" data-zfles="${nx.id}">Leçon suivante</button>` : `<button class="btn ghost" data-go="zf_acad">Toutes les leçons</button>`}</div>` };
};

// ——— Aura : choix du contexte sur la page de discussion ———
function zfChatCtx() {
  return `<div class="zf-ctx" role="group" aria-label="Contexte d’Aura"><button type="button" data-zfctx="quotidien" aria-pressed="${S.zfCtx !== "mariee"}">Aura — Style au quotidien</button><button type="button" data-zfctx="mariee" aria-pressed="${S.zfCtx === "mariee"}">Aura — Stylisme mariée</button></div>`;
}
function zfChatSug() {
  if (S.zfCtx !== "mariee") return "";
  const q = ["Aide-moi à comparer les silhouettes de robe de mariée.", "Je veux les bras couverts : quelles manches me conseilles-tu ?", "Quels bijoux avec ma robe ?", "Comment m’asseoir dans ma robe de mariée ?", "Aide-moi à choisir entre mes looks."];
  return `<div class="ch-sug" role="group" aria-label="Idées pour commencer">${["Silhouettes", "Manches couvrantes", "Bijoux", "S’asseoir", "Choisir un look"].map((n, i) => `<button type="button" data-chsay="${esc(q[i])}">${n}</button>`).join("")}<button type="button" data-go="zf">Espace ZIFAFI</button></div>`;
}

// ——— Clics ———
function zfReadTxt() { document.querySelectorAll("[data-zft]").forEach(i => { if (S.zfDraft) S.zfDraft[i.dataset.zft] = i.value.slice(0, ZF_TXT[i.dataset.zft]); }); const d = document.getElementById("zf_date"); if (d && S.zfDraft) S.zfDraft.date = /^\d{4}-\d{2}-\d{2}$/.test(d.value) ? d.value : ""; }
function zfReadLook() { const n = document.getElementById("zf_lkname"), t = document.getElementById("zf_lknotes"); if (S.zfLook) { if (n) S.zfLook.nom = n.value.slice(0, 60); if (t) S.zfLook.notes = t.value.slice(0, 300); } }
function zfAsk(text) { zfSetCtx("mariee"); go("chat"); setTimeout(() => { if (typeof send === "function") send(tr(text)); }, 60); }
document.addEventListener("click", e => {
  const t = e.target.closest("button,[data-zfinsfile]"); if (!t) return; const ds = t.dataset;
  if (ds.zfk === undefined && t.closest("[data-zfk]") && ds.zfv !== undefined) {
    const box = t.closest("[data-zfk]"), k = box.dataset.zfk, v = ds.zfv, d = S.zfDraft; if (!d) return;
    if (ZF_ONE.includes(k)) d[k] = d[k] === v ? "" : v;
    else { const a = d[k], i = a.indexOf(v), excl = ["nsp", "aucune"]; if (i >= 0) a.splice(i, 1); else { if (excl.includes(v)) a.length = 0; else d[k] = a.filter(x => !excl.includes(x)); d[k].push(v); } }
    box.querySelectorAll("[data-zfv]").forEach(b => b.setAttribute("aria-pressed", String(ZF_ONE.includes(k) ? d[k] === b.dataset.zfv : d[k].includes(b.dataset.zfv))));
    return;
  }
  if (ds.zfmystyle !== undefined) { const s = document.querySelector(".hz-more"); if (s) s.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); else home(); return; }
  if (ds.zfhome !== undefined) { home(); return; }
  if (ds.zfaura !== undefined) { zfSetCtx("mariee"); go("chat"); return; }
  if (ds.zfctx) { zfSetCtx(ds.zfctx); if (window.endCall && window.liveConv && window.liveConv()) window.endCall(); toast(ds.zfctx === "mariee" ? "Aura passe en stylisme mariée" : "Aura revient au style du quotidien"); zfKeep(); return; }
  if (ds.zfask) { zfAsk(ds.zfask); return; }
  if (ds.zfprof !== undefined) { S.zfDraft = zfCleanProf(ZD.prof || {}); S.zfStep = Math.max(0, Math.min(5, +ds.zfprof || 0)); if (S.page === "zf_prof") zfKeep(); else go("zf_prof"); return; }
  if (ds.zfstep !== undefined) { zfReadTxt(); S.zfStep = Math.max(0, Math.min(5, +ds.zfstep)); render(false); return; }
  if (ds.zfskip !== undefined) { if (S.zfDraft) { S.zfDraft.shape = ""; S.zfDraft.skipShape = true; } S.zfStep = 4; render(false); return; }
  if (ds.zfsaveprof !== undefined) { zfReadTxt(); ZD.prof = zfCleanProf(S.zfDraft); S.zfShow = false; S.zfAlt = {}; if (zfSave()) { toast("Profil de mariée enregistré"); S.zfDraft = null; S.zfStep = 0; S.hist = S.hist.filter(h => h !== "zf_prof"); if (S.hist[S.hist.length - 1] !== "zf") S.hist.push("zf"); S.page = "zf_robe"; S.zfShow = true; S.dir = "f"; render(false); } return; }
  if (ds.zfdelprof !== undefined) { if (!confirm(tr("Supprimer ton profil de mariée ? Tes looks et tes photos restent enregistrés."))) return; ZD.prof = null; zfSave(); S.zfDraft = null; S.zfStep = 0; toast("Profil de mariée supprimé"); S.hist = []; S.page = "zf"; render(false); return; }
  if (ds.zfshow !== undefined) { S.zfShow = true; zfKeep(); return; }
  if (ds.zfsave) { const r = zfFindDress(ds.zfsave); if (!r) return; const i = ZD.saved.findIndex(x => x.key === r.key); if (i >= 0) { ZD.saved.splice(i, 1); toast("Robe retirée"); } else { ZD.saved.unshift({ ...r, id: r.key, d: zfToday() }); toast("Robe enregistrée"); } zfSave(); zfKeep(); return; }
  if (ds.zfunsave) { ZD.saved = ZD.saved.filter(x => x.key !== ds.zfunsave); S.zfCmp = (S.zfCmp || []).filter(k => k !== ds.zfunsave); zfSave(); toast("Robe retirée"); zfKeep(); return; }
  if (ds.zfcmp) { const c = S.zfCmp || [], i = c.indexOf(ds.zfcmp); if (i >= 0) c.splice(i, 1); else { c.push(ds.zfcmp); while (c.length > 2) c.shift(); } S.zfCmp = c; zfKeep(); return; }
  if (ds.zfgocmp !== undefined) { if ((S.zfCmp || []).length === 2) go("zf_cmp"); return; }
  if (ds.zfcmpclear !== undefined) { S.zfCmp = []; back(); return; }
  if (ds.zfrej) { if (!ZD.rej.includes(ds.zfrej)) ZD.rej.push(ds.zfrej); S.zfCmp = (S.zfCmp || []).filter(k => k !== ds.zfrej); zfSave(); toast("C’est noté : je te propose autre chose"); zfKeep(); return; }
  if (ds.zfunrej !== undefined) { ZD.rej = []; S.zfAlt = {}; zfSave(); zfKeep(); return; }
  if (ds.zfalt) { S.zfAlt = S.zfAlt || {}; S.zfAlt[ds.zfalt] = (S.zfAlt[ds.zfalt] || 0) + 1; zfKeep(); return; }
  if (ds.zfpal) { const i = ZD.pal.indexOf(ds.zfpal); if (i >= 0) { ZD.pal.splice(i, 1); toast("Palette retirée"); } else { ZD.pal.push(ds.zfpal); toast("Palette enregistrée"); } zfSave(); zfKeep(); return; }
  if (ds.zflkdress !== undefined) { zfReadLook(); S.zfLook.dress = ds.zflkdress ? ZD.saved.find(x => x.key === ds.zflkdress) || null : null; zfKeep(); return; }
  if (ds.zflkpal) { zfReadLook(); S.zfLook.pal = S.zfLook.pal === ds.zflkpal ? "" : ds.zflkpal; zfKeep(); return; }
  if (ds.zflk) { zfReadLook(); S.zfLook.sel[ds.zflk] = S.zfLook.sel[ds.zflk] === ds.zfv ? "" : ds.zfv; zfKeep(); return; }
  if (ds.zflknew !== undefined) { S.zfLook = zfNewLook(); if (S.page === "zf_look") zfKeep(); else go("zf_look"); return; }
  if (ds.zflksave !== undefined) { zfReadLook(); const L = S.zfLook; const nom = (L.nom || "").trim() || tr("Mon look") + " " + (ZD.looks.length + 1);
    const rec = { ...L, nom, id: L.id || zfId(), d: L.d || zfToday(), sel: { ...L.sel } }; const i = ZD.looks.findIndex(x => x.id === rec.id);
    if (i >= 0) ZD.looks[i] = rec; else ZD.looks.unshift(rec); if (!zfSave()) return; toast(i >= 0 ? "Look modifié" : "Look enregistré"); S.zfLook = null; S.hist = S.hist.filter(h => h !== "zf_look" && h !== "zf_looks"); go("zf_looks"); return; }
  if (ds.zflkedit) { const l = ZD.looks.find(x => x.id === ds.zflkedit); if (!l) return; S.zfLook = JSON.parse(JSON.stringify(l)); go("zf_look"); return; }
  if (ds.zflkdup) { const l = ZD.looks.find(x => x.id === ds.zflkdup); if (!l) return; ZD.looks.unshift({ ...JSON.parse(JSON.stringify(l)), id: zfId(), nom: (l.nom + " " + tr("(copie)")).slice(0, 60), fav: false, d: zfToday() }); zfSave(); toast("Look dupliqué"); zfKeep(); return; }
  if (ds.zflkfav) { const l = ZD.looks.find(x => x.id === ds.zflkfav); if (!l) return; l.fav = !l.fav; zfSave(); zfKeep(); return; }
  if (ds.zflksel) { const c = S.zfLkSel || [], i = c.indexOf(ds.zflksel); if (i >= 0) c.splice(i, 1); else { c.push(ds.zflksel); while (c.length > 2) c.shift(); } S.zfLkSel = c; zfKeep(); return; }
  if (ds.zflkdel) { const l = ZD.looks.find(x => x.id === ds.zflkdel); if (!l || !confirm(tr("Supprimer ce look ?"))) return; ZD.looks = ZD.looks.filter(x => x.id !== l.id); S.zfLkSel = (S.zfLkSel || []).filter(x => x !== l.id); zfSave(); toast("Look supprimé"); zfKeep(); return; }
  if (ds.zfinscat) { S.zfInsD = { ...(S.zfInsD || { titre: "", note: "" }), cat: ds.zfinscat, titre: (document.getElementById("zf_it") || {}).value || "", note: (document.getElementById("zf_in") || {}).value || "" }; S.zfInsOpen = true; zfKeep(); return; }
  if (ds.zfinsf !== undefined) { S.zfInsF = ds.zfinsf; zfKeep(); return; }
  if (ds.zfinsfav !== undefined) { S.zfInsFav = !S.zfInsFav; zfKeep(); return; }
  if (ds.zfinsfv) { const x = (ZINS || []).find(y => y.id === ds.zfinsfv); if (!x) return; x.fav = !x.fav; ZIDB.put(x).then(() => zfKeep()).catch(() => { x.fav = !x.fav; toast("Impossible d’enregistrer ce changement."); }); return; }
  if (ds.zfinssel) { const c = S.zfInsSel || [], i = c.indexOf(ds.zfinssel); if (i >= 0) c.splice(i, 1); else { c.push(ds.zfinssel); while (c.length > 2) c.shift(); } S.zfInsSel = c; zfKeep(); return; }
  if (ds.zfinsclr !== undefined) { S.zfInsSel = []; zfKeep(); return; }
  if (ds.zfinsdel) { if (!confirm(tr("Supprimer cette inspiration ?"))) return; ZIDB.del(ds.zfinsdel).then(() => { ZINS = ZINS.filter(x => x.id !== ds.zfinsdel); S.zfInsSel = (S.zfInsSel || []).filter(x => x !== ds.zfinsdel); ZD.insN = ZINS.length; zfSave(); toast("Inspiration supprimée"); zfKeep(); }).catch(() => toast("Impossible de supprimer cette image.")); return; }
  if (ds.zfles) { S.zfLes = ds.zfles; if (S.page === "zf_les") { S.dir = "f"; render(false); } else go("zf_les"); return; }
  if (ds.zflesdone) { if (ZD.les[ds.zflesdone]) delete ZD.les[ds.zflesdone]; else ZD.les[ds.zflesdone] = 1; zfSave(); toast(ZD.les[ds.zflesdone] ? "Leçon terminée" : "Leçon à refaire"); zfKeep(); return; }
  if (ds.zfprac) { if (ZD.prac[ds.zfprac]) delete ZD.prac[ds.zfprac]; else ZD.prac[ds.zfprac] = 1; zfSave(); zfKeep(); return; }
  if (ds.zfwipe !== undefined) { if (!confirm(tr("Effacer ton profil de mariée, tes robes, tes palettes, tes looks, tes photos d’inspiration et tes leçons de ce téléphone ?"))) return; zfWipe(); toast("Tes données ZIFAFI sont effacées"); S.hist = []; S.page = "zf"; render(false); return; }
});
document.addEventListener("input", e => {
  const id = e.target.id;
  if (id === "zf_it" || id === "zf_in") { S.zfInsD = S.zfInsD || { cat: "robes", titre: "", note: "" }; S.zfInsD[id === "zf_it" ? "titre" : "note"] = e.target.value; }
});
document.addEventListener("change", e => { if (e.target.matches && e.target.matches("[data-zfinsfile]")) { const f = e.target.files && e.target.files[0]; e.target.value = ""; zfAddIns(f); } });
function zfWipe() { try { localStorage.removeItem(ZF_KEY); } catch (e) {} ZD = zfCleanAll(null); ZIDB.clear(); ZINS = null; S.zfDraft = null; S.zfLook = null; S.zfCmp = []; S.zfLkSel = []; S.zfInsSel = []; S.zfAlt = {}; S.zfShow = false; }
