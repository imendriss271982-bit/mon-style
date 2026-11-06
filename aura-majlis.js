/* My Style — « Le Majlis » (v159, demandé par Imen) : discuter avec ses amies qui ont aussi My Style.
   - Entrée : bouton rond dans l'en-tête de l'accueil (bulle + pastille des messages non lus) → page `P.majlis`.
   - Une amie s'ajoute SEULEMENT par lien d'invitation (…/mon-style/?majlis=CODE) envoyé sur WhatsApp,
     partagé ou copié. À l'ouverture du lien, la carte « X t'invite dans son Majlis » apparaît sur l'accueil.
   - Conversation `P.mj_chat` (S.mjAmi) : texte, photo (visage caché), tenue enregistrée (collage des vraies pièces).
     Nouveaux messages vérifiés toutes les 3 s tant que la conversation est ouverte (seul #mjList est redessiné,
     le champ de texte garde le focus). « Vu » sous mon dernier message lu.
   - Partager vers le Majlis : bouton « Au Majlis » des tenues enregistrées (`data-mjlook`) et de l'Outfit check
     (`data-mjout`) → choisir l'amie (`S.mjPart`) → envoyé.
   - Vie privée (choix d'Imen) : le VISAGE est caché SUR LE TÉLÉPHONE avant tout envoi de photo (MediaPipe,
     modèle selfie multiclasse déjà utilisé par aura-studio.js : peau du visage + cheveux autour → pixellisés).
     Si le visage ne peut pas être caché (réseau, modèle), la photo n'est PAS envoyée.
   - Serveur : routes /majlis/… du Worker, base D1 `MAJLIS` (identifiant + jeton du téléphone, pas d'email ;
     seule l'empreinte du jeton est gardée ; messages effacés après 60 jours). Téléphone : `monstyle_majlis`
     {uid, token, code} et `monstyle_mj_inv` (invitation en attente). Les messages ne sont pas gardés sur le téléphone.
   - « Effacer toutes mes données » → mjWipe() supprime aussi tout côté serveur.
   Chargé APRÈS aura-photo.js. Test : node tests/majlis.js (serveur simulé) et node tests/majlis-worker.mjs. */

const MJ_APP = "https://imendriss271982-bit.github.io/mon-style/";
const MJ_POLL = 3000;
let MJ = { uid: "", token: "", code: "", amis: null, nl: 0, err: "", busy: 0, inv: "", invNom: "", invErr: "" };
const MJC = {}; // conversations en mémoire : { [idAmie]: { msgs: [], vu: 0, last: 0, ok: 0 } }
try {
  const j = JSON.parse(localStorage.getItem("monstyle_majlis") || "null");
  if (j && /^[0-9a-f]{16}$/.test(j.uid) && /^[0-9a-f]{32}$/.test(j.token)) Object.assign(MJ, { uid: j.uid, token: j.token, code: String(j.code || "").slice(0, 8) });
} catch (e) {}
try { const c = localStorage.getItem("monstyle_mj_inv"); if (c && /^[A-Z2-9]{6}$/.test(c)) MJ.inv = c; } catch (e) {}
// Lien d'invitation ouvert : on garde le code et on nettoie l'adresse.
try {
  const u = new URL(location.href), c = (u.searchParams.get("majlis") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (u.searchParams.has("majlis")) {
    u.searchParams.delete("majlis"); history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    if (/^[A-Z2-9]{6}$/.test(c) && c !== MJ.code) { MJ.inv = c; try { localStorage.setItem("monstyle_mj_inv", c); } catch (e) {} }
  }
} catch (e) {}

const mjSave = () => { try { localStorage.setItem("monstyle_majlis", JSON.stringify({ uid: MJ.uid, token: MJ.token, code: MJ.code })); } catch (e) {} };
const mjAuth = () => ({ uid: MJ.uid, token: MJ.token });
const mjLien = () => MJ_APP + "?majlis=" + MJ.code;
function mjInvFin() { MJ.inv = ""; MJ.invNom = ""; MJ.invErr = ""; try { localStorage.removeItem("monstyle_mj_inv"); } catch (e) {} }
async function mjApi(r, body) {
  const res = await fetch(AI_URL + "/majlis/" + r, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
  let j = {}; try { j = await res.json(); } catch (e) {}
  if (!res.ok) { const er = new Error(j.erreur || "Pas de connexion. Réessaie."); er.code = j.code || res.status; throw er; }
  return j;
}
// Le jeton n'est plus reconnu (base effacée…) : on repart d'un compte neuf.
function mjPerdu(e) { if (e && e.code === "compte") { MJ.uid = MJ.token = MJ.code = ""; MJ.amis = null; mjSave(); return true; } return false; }
async function mjCompte(nom) {
  const r = await mjApi("moi", { ...mjAuth(), nom: String(nom || S.nom || "").trim().slice(0, 30) });
  if (r.token) { MJ.uid = r.uid; MJ.token = r.token; }
  MJ.code = r.code || MJ.code; mjSave(); return r;
}
async function mjAmis() {
  if (!MJ.uid) return;
  try { const r = await mjApi("amis", mjAuth()); MJ.amis = r.amis || []; MJ.err = ""; MJ.nl = MJ.amis.reduce((n, a) => n + (a.nl || 0), 0); mjBadge(); }
  catch (e) { if (!mjPerdu(e)) MJ.err = e.message; }
}
async function mjNonLus() {
  if (!MJ.uid || document.hidden) return;
  try { const r = await mjApi("nonlus", mjAuth()); if (r.n !== MJ.nl) { MJ.nl = r.n || 0; mjBadge(); if (S.page === "home" || S.page === "majlis") mjAmis().then(() => { if (S.page === "majlis" || S.page === "home") mjRedraw(); }); } } catch (e) { mjPerdu(e); }
}
function mjRedraw() { const y = window.scrollY; render(false); window.scrollTo(0, y); }

// ——— Invitation ———
async function mjInvInfo() {
  if (!MJ.inv || MJ.invNom) return;
  try { const r = await mjApi("code", { code: MJ.inv }); MJ.invNom = r.nom || "ton amie"; } catch (e) { if (e.code === "introuvable") { mjInvFin(); toast("Ce lien d’invitation ne marche plus."); } else MJ.invErr = e.message; }
  if (S.page === "home" || S.page === "majlis") mjRedraw();
}
async function mjRejoindre() {
  if (!MJ.inv || MJ.busy) return;
  const nomI = document.getElementById("mj_nom");
  const nom = (nomI && nomI.value.trim()) || S.nom || "";
  if (!nom) { S.mjJoin = 1; go("majlis"); return; }
  MJ.busy = 1; mjRedraw();
  try {
    if (!MJ.uid) await mjCompte(nom);
    const r = await mjApi("join", { ...mjAuth(), code: MJ.inv });
    mjInvFin(); MJ.busy = 0; await mjAmis();
    toast(tr("Vous êtes amies dans le Majlis") + " 💛");
    S.mjAmi = r.ami.id; S.mjAmiNom = r.ami.nom; go("mj_chat");
  } catch (e) { MJ.busy = 0; if (e.code === "moi") mjInvFin(); if (mjPerdu(e)) return mjRejoindre(); toast(e.message); mjRedraw(); }
}

// ——— Visage caché sur le téléphone (MediaPipe, modèle selfie multiclasse : 1 = cheveux, 3 = peau du visage) ———
const MJ_SEG = { pret: null, segmenter: null };
function mjSegmenteur() {
  if (MJ_SEG.segmenter) return Promise.resolve(MJ_SEG.segmenter);
  if (!MJ_SEG.pret) {
    const MP = typeof ST_MP !== "undefined" ? ST_MP : "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
    const MOD = typeof ST_MODELE !== "undefined" ? ST_MODELE : "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
    MJ_SEG.pret = (async () => {
      const v = await import(MP + "/vision_bundle.mjs"), fs = await v.FilesetResolver.forVisionTasks(MP + "/wasm");
      const mk = d => v.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: MOD, delegate: d }, runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true });
      let s; try { s = await mk("GPU"); } catch (e) { s = await mk("CPU"); }
      return c => { const r = s.segment(c), m = r.confidenceMasks, w = m[3].width, h = m[3].height; const face = m[3].getAsFloat32Array().slice(), hair = m[1].getAsFloat32Array().slice(); r.close && r.close(); return { face, hair, w, h }; };
    })();
    MJ_SEG.pret.catch(() => { MJ_SEG.pret = null; });
  }
  return MJ_SEG.pret;
}
// Zone à cacher (pure, testable) : peau du visage agrandie + cheveux autour du visage.
function mjZone(face, hair, w, h) {
  const F = new Uint8Array(w * h); let n = 0;
  for (let i = 0; i < F.length; i++) if (face[i] > 0.35) { F[i] = 1; n++; }
  if (n < Math.max(12, w * h * 0.0004)) return { n: 0, z: null };
  const dil = (src, r) => { // dilatation carrée séparable
    const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) { let last = -1e9; for (let x = 0; x < w; x++) { if (src[y * w + x]) last = x; if (x - last <= r) t[y * w + x] = 1; } last = 1e9; for (let x = w - 1; x >= 0; x--) { if (src[y * w + x]) last = x; if (last - x <= r) t[y * w + x] = 1; } }
    for (let x = 0; x < w; x++) { let last = -1e9; for (let y = 0; y < h; y++) { if (t[y * w + x]) last = y; if (y - last <= r) o[y * w + x] = 1; } last = 1e9; for (let y = h - 1; y >= 0; y--) { if (t[y * w + x]) last = y; if (last - y <= r) o[y * w + x] = 1; } }
    return o;
  };
  const r = Math.max(3, Math.round(Math.max(w, h) * 0.035)), pres = dil(F, r), autour = dil(F, r * 3), z = new Uint8Array(w * h);
  for (let i = 0; i < z.length; i++) z[i] = pres[i] || (autour[i] && hair && hair[i] > 0.5) ? 1 : 0;
  return { n, z };
}
function mjImage(src) {
  return new Promise((ok, ko) => {
    const im = new Image(), u = typeof src === "string" ? src : URL.createObjectURL(src);
    im.onload = () => { if (typeof src !== "string") URL.revokeObjectURL(u); ok(im); };
    im.onerror = () => { if (typeof src !== "string") URL.revokeObjectURL(u); ko(new Error("Cette photo n’a pas pu être lue")); };
    im.src = u;
  });
}
function mjJpeg(c) { let q = 0.8, out = c.toDataURL("image/jpeg", q); while (out.length > 600000 && q > 0.4) { q -= 0.12; out = c.toDataURL("image/jpeg", q); } return out; }
async function mjCacherVisage(src) {
  const im = await mjImage(src), k = Math.min(1, 900 / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
  const W = Math.max(1, Math.round((im.naturalWidth || im.width) * k)), H = Math.max(1, Math.round((im.naturalHeight || im.height) * k));
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); g.drawImage(im, 0, 0, W, H);
  let seg; try { seg = await (await mjSegmenteur())(c); } catch (e) { const er = new Error("Je n’ai pas pu cacher le visage : la photo n’est pas envoyée."); er.code = "visage"; throw er; }
  if (!seg || !seg.face || !seg.w) { const er = new Error("Je n’ai pas pu cacher le visage : la photo n’est pas envoyée."); er.code = "visage"; throw er; }
  const { n, z } = mjZone(seg.face, seg.hair, seg.w, seg.h);
  if (n && z) {
    // photo pixellisée (gros carrés) visible seulement dans la zone du visage
    const b = Math.max(10, Math.round(Math.max(W, H) / 30)), sw = Math.max(1, Math.round(W / b)), sh = Math.max(1, Math.round(H / b));
    const sm = document.createElement("canvas"); sm.width = sw; sm.height = sh; sm.getContext("2d").drawImage(c, 0, 0, sw, sh);
    const px = document.createElement("canvas"); px.width = W; px.height = H; const pg = px.getContext("2d"); pg.imageSmoothingEnabled = false; pg.drawImage(sm, 0, 0, W, H);
    const mc = document.createElement("canvas"); mc.width = seg.w; mc.height = seg.h; const mg = mc.getContext("2d"), md = mg.createImageData(seg.w, seg.h);
    for (let i = 0; i < z.length; i++) if (z[i]) { md.data[i * 4 + 3] = 255; }
    mg.putImageData(md, 0, 0);
    pg.globalCompositeOperation = "destination-in"; pg.imageSmoothingEnabled = true; pg.drawImage(mc, 0, 0, W, H);
    g.drawImage(px, 0, 0);
  }
  return { url: mjJpeg(c), visage: !!n };
}

// ——— Tenue enregistrée → une image (collage des vraies pièces, pas de visage) ———
async function mjCollage(t) {
  const it = (t.pieces || []).map(id => GR.items.find(x => x.id === id)).filter(x => x && x.img).slice(0, 4);
  if (!it.length) throw new Error("Les photos de cette tenue ne sont pas sur ce téléphone.");
  const W = 720, H = 820, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
  g.fillStyle = "#FBF6EE"; g.fillRect(0, 0, W, H);
  const cols = it.length === 1 ? 1 : 2, rows = Math.ceil(it.length / cols), pad = 18, cw = (W - pad * (cols + 1)) / cols, ch = (H - 70 - pad * (rows + 1)) / rows;
  for (let i = 0; i < it.length; i++) {
    const x0 = pad + (i % cols) * (cw + pad), y0 = pad + Math.floor(i / cols) * (ch + pad);
    g.fillStyle = "#fff"; g.fillRect(x0, y0, cw, ch);
    try { const im = await mjImage(it[i].img), s = Math.min(cw / im.width, ch / im.height) * 0.94; g.drawImage(im, x0 + (cw - im.width * s) / 2, y0 + (ch - im.height * s) / 2, im.width * s, im.height * s); } catch (e) {}
  }
  g.fillStyle = "rgba(140,109,53,.85)"; g.font = "600 26px Georgia,serif"; g.textAlign = "center"; g.fillText("My Style", W / 2, H - 26);
  return mjJpeg(c);
}

// ——— Envoyer ———
async function mjEnvoyer(ami, m) {
  const r = await mjApi("send", { ...mjAuth(), ami, txt: m.txt || "", img: m.img || "", look: m.look || "" });
  const cv = MJC[ami] || (MJC[ami] = { msgs: [], vu: 0, last: 0 });
  if (!cv.msgs.some(x => x.id === r.id)) cv.msgs.push({ id: r.id, moi: true, t: r.t, txt: m.txt || "", img: m.img || "", look: m.look || "" });
  cv.last = Math.max(cv.last, r.id);
  return r;
}
// Prépare ce qu'on partage (tenue, outfit check, photo) : toujours SANS visage visible.
async function mjPrepare(p) {
  if (p.kind === "look") { const t = (GR.saved || []).find(x => x.id === p.id); if (!t) throw new Error("Tenue introuvable."); return { img: await mjCollage(t), look: t.titre || "Ma tenue", txt: "" }; }
  if (p.kind === "outfit") { const f = S.file && S.file.outfit; if (!f) throw new Error("La photo de la tenue n’est plus sur ce téléphone."); const o = S.res && S.res.outfit, v = await mjCacherVisage(f); return { img: v.url, look: S.occ || "Outfit check", txt: o && o.note != null ? tr("Mon outfit check") + " : " + o.note + "/10" : "" }; }
  if (p.kind === "photo") { const v = await mjCacherVisage(p.file); return { img: v.url, look: "", txt: "" }; }
  throw new Error("Rien à envoyer.");
}
async function mjPartagerA(ami, nom) {
  const p = S.mjPart; if (!p || MJ.busy) return;
  MJ.busy = 1; mjRedraw();
  try { const m = await mjPrepare(p), r = await mjEnvoyer(ami, m); mjAuraPhoto(ami, r.id, m); S.mjPart = null; MJ.busy = 0; S.mjAmi = ami; S.mjAmiNom = nom; go("mj_chat"); }
  catch (e) { MJ.busy = 0; toast(e.message); mjRedraw(); }
}

// ——— Aura dans le Majlis (v160, choix d'Imen) ———
// Aura donne UN point de styliste, PAR ÉCRIT (pas de voix : moins cher), seulement :
//  1) quand une amie envoie une photo / une tenue (une seule fois par photo),
//  2) quand quelqu'une écrit son nom (« Aura », « أورا »…) dans un message.
// Le téléphone qui déclenche prépare le conseil avec l'IA (route « / ») puis le range sur le serveur (/majlis/aura),
// pour que les deux amies le voient. Au plus MJ_AURA_MAX conseils par jour et par téléphone.
const MJ_APPEL = /(^|[^\p{L}])(aura|أورا|اورا|آورا|ئورا)(?![\p{L}])/iu;
const MJ_AURA_MAX = 25;
function mjAuraQuota() {
  const j = new Date().toDateString(); let q = { j, n: 0 };
  try { const v = JSON.parse(localStorage.getItem("monstyle_mj_aura") || "null"); if (v && v.j === j) q = v; } catch (e) {}
  if (q.n >= MJ_AURA_MAX) return false;
  q.n++; try { localStorage.setItem("monstyle_mj_aura", JSON.stringify(q)); } catch (e) {}
  return true;
}
async function mjBlob(url) { const b = await (await fetch(url)).blob(); b.mx = 900; return b; }
function mjAuraEcrit(ami, on) {
  const cv = MJC[ami] || (MJC[ami] = { msgs: [], vu: 0, last: 0, ok: 0 });
  cv.aura = on ? 1 : 0;
  if (S.page === "mj_chat" && S.mjAmi === ami) mjListeMaj();
}
// Prépare le conseil. photo = { img (data URL), look, moi } ou null ; question = message qui appelle Aura.
async function mjAuraConseil(ami, photo, question) {
  const sm = await getSample();
  if (!sm || !sm.json) return "";
  const amie = ((MJ.amis || []).find(a => a.id === ami) || {}).nom || (S.mjAmi === ami && S.mjAmiNom) || "son amie";
  const moi = S.nom || "elle";
  const cv = MJC[ami], fil = cv ? cv.msgs.filter(m => !m.aura && m.txt).slice(-6).map(m => (m.moi ? moi : amie) + " : " + m.txt).join(" | ") : "";
  const aMoi = photo && photo.moi;
  const pr = REF + " Tu es Aura, la styliste de My Style. Tu interviens dans le Majlis : une discussion privée entre deux amies, " + moi + " et " + amie + ". " +
    (photo ? "Photo envoyée par " + (aMoi ? moi : amie) + (photo.look ? " (« " + photo.look + " »)" : "") + ". " +
      (aMoi ? "Son profil : " + ((typeof PROFIL === "function" && PROFIL()) || "inconnu") + ". " + (typeof pfRules === "function" ? pfRules() : "") + " "
            : "Tu ne connais pas le profil de " + amie + " : donne un conseil valable pour elle sans parler de sa morphologie ni de ses couleurs personnelles. ") +
      "Le visage est caché exprès (pixellisé) pour la vie privée : ne parle JAMAIS du visage, du maquillage ni de la coiffure, et ne dis pas que la photo est floue. " : "") +
    (fil ? "Derniers messages : " + fil + ". " : "") +
    (question ? "On t’appelle avec ce message : « " + question + " ». Réponds à cette demande" + (photo ? " en regardant la photo" : "") + ". "
              : "Donne UN seul point utile sur la tenue : une vraie qualité, ou UNE petite amélioration concrète (couleur, pièce, accessoire, chaussures). ") +
    "Ton chaleureux et bienveillant, comme une amie styliste ; jamais de critique blessante. Maximum 2 phrases courtes, sans liste, sans marque ni prix inventés. Appelle la personne par son prénom. " +
    FMT + 'Format : {"reponse":"1 à 2 phrases courtes"}';
  const r = await sm.json(pr, photo ? { images: [await mjBlob(photo.img)] } : {});
  if (r && r.erreur) throw new Error(r.erreur);
  return String((r && r.reponse) || "").trim().slice(0, 400);
}
async function mjAuraRanger(ami, txt, ref) {
  const r = await mjApi("aura", { ...mjAuth(), ami, txt, ref: ref || 0 });
  const cv = MJC[ami] || (MJC[ami] = { msgs: [], vu: 0, last: 0, ok: 0 });
  if (!cv.msgs.some(x => x.id === r.id)) cv.msgs.push({ id: r.id, aura: true, moi: false, t: r.t, txt: r.txt || txt, img: "", look: "", ref: ref || 0 });
  cv.msgs.sort((a, b) => a.id - b.id); cv.last = Math.max(cv.last, r.id);
}
async function mjAura(ami, photo, ref, question) {
  if (!mjAuraQuota()) { if (question) toast("Aura a déjà beaucoup conseillé aujourd’hui. À demain 💛"); return; }
  mjAuraEcrit(ami, 1);
  try { const t = await mjAuraConseil(ami, photo, question); if (t) await mjAuraRanger(ami, t, ref); }
  catch (e) { if (question) toast(errMsg(e)); }
  mjAuraEcrit(ami, 0);
}
// 1) Photo ou tenue envoyée : Aura la commente une fois.
function mjAuraPhoto(ami, id, m) { if (id && m && m.img) mjAura(ami, { img: m.img, look: m.look || "", moi: true }, id, ""); }
// 2) On écrit son nom : elle répond, en regardant la dernière photo de la conversation (si elle est récente).
function mjAuraAppel(ami, question) {
  const cv = MJC[ami], recents = cv ? cv.msgs.slice(-12) : [], ph = [...recents].reverse().find(m => m.img);
  mjAura(ami, ph ? { img: ph.img, look: ph.look || "", moi: !!ph.moi } : null, 0, question);
}

// ——— Affichage ———
const mjInit = nom => esc(String(nom || "?").trim().charAt(0).toUpperCase() || "?");
function mjHeure(t) {
  const d = new Date(t), n = new Date(), loc = S.lang === "ar" ? "ar" : S.lang === "en" ? "en-GB" : "fr-FR";
  try { return d.toDateString() === n.toDateString() ? d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString(loc, { day: "numeric", month: "short" }); } catch (e) { return ""; }
}
const MJ_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h8A2.5 2.5 0 0 1 17 5.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3H6.5A2.5 2.5 0 0 1 4 10.5z"/><path d="M19.5 8.5h.0A2 2 0 0 1 21 10.5v4.5a2 2 0 0 1-2 2h-.5v2.5L15.5 17H12a2 2 0 0 1-2-1.7"/></svg>`;
function mjInviter() {
  if (!MJ.code) return "";
  const msg = tr("Rejoins mon Majlis sur My Style 💛 On se montre nos tenues et on se donne nos avis :") + " " + mjLien();
  return `<section class="mj-inv"><h2>Invite une amie</h2><p class="sub">Elle ouvre ton lien, et vous êtes amies dans le Majlis.</p>
   <div class="mj-inv-b"><a class="btn mj-wa" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>${navigator.share ? `<button class="btn" data-mjshare>Partager</button>` : ""}<button class="btn" data-mjcopy>Copier le lien</button></div>
   <p class="mj-lien" dir="ltr" data-noi18n>${esc(mjLien())}</p></section>`;
}
function mjInvCarte() {
  if (!MJ.inv) return "";
  return `<section class="mj-invite"><span class="mj-av" aria-hidden="true">${MJ.invNom ? mjInit(MJ.invNom) : "💛"}</span><div><b>${MJ.invNom ? `<span data-noi18n>${esc(MJ.invNom)}</span> ` : ""}<span>t’invite dans son Majlis</span></b><small>Discutez de vos tenues entre amies.</small></div>
   <div class="mj-invite-b"><button class="btn" data-mjjoin ${MJ.busy ? "disabled" : ""}>${MJ.busy ? "Un instant…" : "Rejoindre"}</button><button class="link" data-mjinvno>Plus tard</button></div></section>`;
}
function mjListe() {
  if (MJ.amis === null) return `<p class="hint mj-load">${MJ.err ? esc(MJ.err) + ` <button class="link" data-mjre>Réessayer</button>` : "Un instant…"}</p>`;
  if (!MJ.amis.length) return `<div class="mj-vide"><span aria-hidden="true">🫖</span><b>Ton Majlis est encore vide</b><small>Invite ta première amie avec ton lien.</small></div>`;
  return `<ul class="mj-amis">${MJ.amis.map(a => {
    const d = a.der, apercu = d && d.de === "aura" ? `<span>✨ Aura : <bdi data-noi18n>${esc(d.txt)}</bdi></span>` : !d ? `<span>Dis-lui bonjour 👋</span>` : d.img ? `<span>${d.de === MJ.uid ? "Toi : " : ""}📷 ${d.look ? `<span data-noi18n>${esc(d.look)}</span>` : "Photo"}</span>` : `<span>${d.de === MJ.uid ? "Toi : " : ""}<bdi data-noi18n>${esc(d.txt)}</bdi></span>`;
    return `<li><button class="mj-ami${a.nl ? " nl" : ""}" data-mjami="${esc(a.id)}" data-mjnom="${esc(a.nom)}"><span class="mj-av" aria-hidden="true">${mjInit(a.nom)}</span><span class="mj-t"><b data-noi18n>${esc(a.nom)}</b>${apercu}</span><span class="mj-m">${d ? `<small>${esc(mjHeure(d.t))}</small>` : ""}${a.nl ? `<i class="mj-nl">${a.nl}</i>` : ""}</span></button></li>`;
  }).join("")}</ul>`;
}

P.majlis = () => {
  if (MJ.uid && MJ.amis === null && !MJ.chg) { MJ.chg = 1; mjAmis().then(() => { MJ.chg = 0; if (S.page === "majlis") mjRedraw(); }); }
  if (MJ.inv && !MJ.invNom && !MJ.invErr) mjInvInfo();
  const tete = `<p class="step">Entre amies</p><h1>Le Majlis</h1>`;
  // Pas encore de compte : juste le prénom (déjà connu le plus souvent).
  if (!MJ.uid) {
    if (S.nom && !MJ.busy && !MJ.err && !MJ.inv) { MJ.busy = 1; mjCompte(S.nom).then(() => { MJ.busy = 0; return mjAmis(); }, e => { MJ.busy = 0; MJ.err = e.message; }).then(() => { if (S.page === "majlis") mjRedraw(); }); }
    const demande = !S.nom || MJ.inv;
    return { back: true, html: `${tete}<p class="sub">Discute avec tes amies qui ont My Style : montre ta tenue, demande leur avis.</p>${mjInvCarte()}
      ${demande && !S.nom ? `<label class="vf-lab" for="mj_nom">Ton prénom (tes amies le verront)</label><input class="field" id="mj_nom" autocomplete="given-name" maxlength="30" value="${esc(S.nom || "")}">` : ""}
      ${MJ.err ? `<div class="note">${esc(MJ.err)} <button class="link" data-mjre>Réessayer</button></div>` : MJ.busy ? `<p class="hint">Un instant…</p>` : ""}
      <ul class="mj-why"><li>🔗 Seules les amies qui ont ton lien peuvent t’écrire.</li><li>🙈 Les visages sont cachés sur les photos envoyées.</li><li>🗓️ Les messages s’effacent au bout de 60 jours.</li></ul>`,
      say: "", foot: MJ.inv ? "" : (!S.nom ? `<button class="btn" data-mjopen>Ouvrir mon Majlis</button>` : "") };
  }
  const part = S.mjPart ? `<div class="mj-part"><b>${S.mjPart.kind === "look" ? "Envoie ta tenue à une amie" : "Envoie ton outfit check à une amie"}</b><small>Choisis à qui l’envoyer. Le visage est caché automatiquement.</small><button class="link" data-mjpartno>Annuler</button></div>` : "";
  return { back: true, html: `${tete}${part}${mjInvCarte()}${MJ.busy && S.mjPart ? `<p class="hint">J’envoie…</p>` : ""}${mjListe()}${S.mjPart ? "" : mjInviter()}
    <ul class="mj-why"><li>✨ Aura donne son avis sur vos tenues. Écris « Aura » pour l’appeler.</li><li>🙈 Les visages sont cachés sur les photos envoyées.</li><li>🗓️ Les messages s’effacent au bout de 60 jours.</li></ul>`, say: "" };
};

function mjBulles(ami) {
  const cv = MJC[ami];
  if (!cv || !cv.ok) return `<p class="hint mj-load">${cv && cv.err ? esc(cv.err) : "Un instant…"}</p>`;
  if (!cv.msgs.length) return `<div class="mj-vide"><span aria-hidden="true">💬</span><b>Commencez à discuter</b><small>Envoie un message, une photo ou une de tes tenues.</small></div>`;
  const dernierMoi = [...cv.msgs].reverse().find(m => m.moi);
  return cv.msgs.map(m => m.aura ? `<div class="mj-b mj-aura"><b class="mj-aura-n"><span aria-hidden="true">✨</span> Aura</b><p dir="auto" data-noi18n>${esc(m.txt)}</p><small>${esc(mjHeure(m.t))}</small></div>` : `<div class="mj-b ${m.moi ? "moi" : "elle"}">${m.img ? `<img src="${m.img}" alt="${esc(m.look || "Photo")}" loading="lazy" data-mjzoom>` : ""}${m.look ? `<em dir="auto" data-noi18n>${esc(m.look)}</em>` : ""}${m.txt ? `<p dir="auto" data-noi18n>${esc(m.txt)}</p>` : ""}<small>${esc(mjHeure(m.t))}${m.moi && dernierMoi && m.id === dernierMoi.id && cv.vu >= m.id ? ` · <span>Vu</span>` : ""}</small></div>`).join("") + (cv.aura ? `<div class="mj-b mj-aura mj-ecrit"><b class="mj-aura-n"><span aria-hidden="true">✨</span> Aura</b><p><span>Aura écrit</span><i aria-hidden="true"> …</i></p></div>` : "");
}
async function mjCharger(ami, tout) {
  const cv = MJC[ami] || (MJC[ami] = { msgs: [], vu: 0, last: 0, ok: 0 });
  if (cv.busy) return; cv.busy = 1;
  try {
    const r = await mjApi("msgs", { ...mjAuth(), ami, apres: tout ? 0 : cv.last });
    const avant = cv.msgs.length + ":" + cv.vu;
    if (tout) cv.msgs = [];
    (r.msgs || []).forEach(m => { if (!cv.msgs.some(x => x.id === m.id)) cv.msgs.push(m); });
    cv.msgs.sort((a, b) => a.id - b.id); cv.last = cv.msgs.length ? cv.msgs[cv.msgs.length - 1].id : 0; cv.vu = r.vu || 0; cv.err = "";
    const neuf = !cv.ok || avant !== cv.msgs.length + ":" + cv.vu; cv.ok = 1;
    if (neuf && S.page === "mj_chat" && S.mjAmi === ami) mjListeMaj();
    if (MJ.amis) { const a = MJ.amis.find(x => x.id === ami); if (a && a.nl) { a.nl = 0; MJ.nl = MJ.amis.reduce((n, x) => n + (x.nl || 0), 0); mjBadge(); } }
  } catch (e) {
    if (e.code === "amie") { toast(e.message); delete MJC[ami]; MJ.amis = null; cv.busy = 0; if (S.page === "mj_chat") back(); return; }
    if (!mjPerdu(e)) { cv.err = e.message; if (!cv.ok && S.page === "mj_chat") mjListeMaj(); }
  }
  cv.busy = 0;
}
function mjListeMaj() {
  const el = document.getElementById("mjList"); if (!el) return;
  const bas = window.innerHeight + window.scrollY >= document.body.scrollHeight - 120;
  el.innerHTML = mjBulles(S.mjAmi);
  if (bas || !el.dataset.vu) { el.dataset.vu = 1; requestAnimationFrame(() => window.scrollTo(0, document.body.scrollHeight)); }
}
let MJ_T = 0;
function mjBoucle() {
  clearInterval(MJ_T); MJ_T = 0;
  if (S.page === "mj_chat" && S.mjAmi) MJ_T = setInterval(() => { if (S.page !== "mj_chat") return mjBoucle(); if (!document.hidden) mjCharger(S.mjAmi); }, MJ_POLL);
}

P.mj_chat = () => {
  const ami = S.mjAmi, nom = S.mjAmiNom || ((MJ.amis || []).find(a => a.id === ami) || {}).nom || "";
  if (!ami) return P.majlis();
  if (!MJC[ami] || !MJC[ami].ok) setTimeout(() => mjCharger(ami, true), 0);
  setTimeout(() => { mjListeMaj(); mjBoucle(); }, 0);
  const choix = S.mjPick ? `<div class="mj-pick"><b>Envoyer…</b>
     <label class="mj-pk"><input type="file" accept="image/*" data-mjphoto hidden><span aria-hidden="true">📷</span>Une photo de ma tenue <small>(visage caché)</small></label>
     ${(GR.saved || []).length ? `<p class="hint">Mes tenues enregistrées</p><div class="mj-looks">${GR.saved.slice(0, 12).map(t => { const it = t.pieces.map(id => GR.items.find(x => x.id === id)).filter(Boolean); return `<button class="mj-lk" data-mjsendlook="${esc(t.id)}"><span class="gr-col n${Math.min(it.length, 4)}">${it.slice(0, 4).map(x => grImg(x)).join("")}</span><b data-noi18n>${esc(t.titre)}</b></button>`; }).join("")}</div>` : `<p class="hint">Enregistre une tenue dans ta garde-robe pour pouvoir l’envoyer ici.</p>`}
     <button class="link" data-mjpick>Fermer</button></div>` : "";
  return { back: true, html: `<div class="mj-hd"><span class="mj-av" aria-hidden="true">${mjInit(nom)}</span><div><h1 data-noi18n><bdi>${esc(nom)}</bdi></h1><small>Dans ton Majlis</small></div><button class="link mj-quit" data-mjquit>Retirer</button></div>
    <div id="mjList" class="mj-list" aria-live="polite">${mjBulles(ami)}</div>${choix}`,
    say: "",
    foot: `<div class="mj-cmp"><button class="mj-plus" data-mjpick aria-label="Envoyer une photo ou une tenue" ${MJ.busy ? "disabled" : ""}>${MJ.busy ? "…" : "+"}</button><input class="field" id="mj_txt" maxlength="1000" placeholder="Écris un message…" autocomplete="off" value="${esc(S.mjDraft || "")}" enterkeyhint="send"><button class="btn send-b" data-mjsend aria-label="Envoyer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button></div>` };
};

async function mjEnvoyerTexte() {
  const el = document.getElementById("mj_txt"), t = el ? el.value.trim() : "";
  if (!t || !S.mjAmi) return;
  el.value = ""; S.mjDraft = "";
  try { await mjEnvoyer(S.mjAmi, { txt: t }); mjListeMaj(); window.scrollTo(0, document.body.scrollHeight); if (MJ_APPEL.test(t)) mjAuraAppel(S.mjAmi, t); }
  catch (e) { if (el) el.value = t; S.mjDraft = t; toast(e.message); }
}
async function mjEnvoyerChoix(p) {
  if (MJ.busy) return; MJ.busy = 1; S.mjPick = 0; S.mjDraft = (document.getElementById("mj_txt") || {}).value || S.mjDraft || ""; render(false);
  toast(p.kind === "photo" ? "Je cache le visage…" : "J’envoie…");
  try { const m = await mjPrepare(p), r = await mjEnvoyer(S.mjAmi, m); mjAuraPhoto(S.mjAmi, r.id, m); }
  catch (e) { toast(e.message); }
  MJ.busy = 0; if (S.page === "mj_chat") { render(false); window.scrollTo(0, document.body.scrollHeight); }
}

// ——— Pastille dans l'en-tête (accueil) ———
function mjBadge() {
  const b = document.getElementById("hmj"); if (!b) return;
  const i = b.querySelector(".mj-bd"); if (i) { i.textContent = MJ.nl > 9 ? "9+" : MJ.nl; i.hidden = !MJ.nl; }
  b.setAttribute("aria-label", tr("Le Majlis") + (MJ.nl ? " · " + MJ.nl : ""));
}
(function mjEntete() {
  const h = document.querySelector("header"); if (!h || document.getElementById("hmj")) return;
  const b = document.createElement("button"); b.className = "ib"; b.id = "hmj"; b.type = "button"; b.dataset.go = "majlis"; b.setAttribute("aria-label", "Le Majlis");
  b.innerHTML = MJ_SVG + `<i class="mj-bd" hidden data-noi18n></i>`; b.hidden = S.page !== "home";
  const p = document.getElementById("hprof"); p ? p.after(b) : h.appendChild(b);
  mjBadge();
})();
{ const prev = window.onPage; window.onPage = pg => { const b = document.getElementById("hmj"); if (b) b.hidden = pg !== "home"; if (pg !== "mj_chat") { S.mjPick = 0; mjBoucle(); } if (prev) prev(pg); }; }
if (typeof DOCK_OF !== "undefined") { DOCK_OF.majlis = "home"; DOCK_OF.mj_chat = "home"; }
setTimeout(() => { mjNonLus(); if (MJ.inv) mjInvInfo(); }, 1500);
setInterval(mjNonLus, 60000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { mjNonLus(); if (S.page === "mj_chat" && S.mjAmi) mjCharger(S.mjAmi); } });

// ——— Accueil : invitation reçue, ou « X t'a écrit » ———
if (typeof P.home === "function") {
  const homeAvantMj = P.home;
  P.home = (...a) => {
    const o = homeAvantMj(...a);
    if (!o || typeof o.html !== "string") return o;
    let carte = "";
    if (MJ.inv) carte = mjInvCarte();
    else if (MJ.nl && MJ.amis) { const a1 = MJ.amis.find(x => x.nl); if (a1) carte = `<button class="mj-msg" data-mjami="${esc(a1.id)}" data-mjnom="${esc(a1.nom)}"><span class="mj-av" aria-hidden="true">${mjInit(a1.nom)}</span><span><b><span data-noi18n>${esc(a1.nom)}</span> <span>t’a écrit dans le Majlis</span></b><small>${MJ.nl > 1 ? MJ.nl + " " : ""}<span>${MJ.nl > 1 ? "nouveaux messages" : "Nouveau message"}</span></small></span><i class="mj-nl">${MJ.nl}</i></button>`; }
    if (carte) { const k = o.html.indexOf('<section class="hz-st'); o.html = k > 0 ? o.html.slice(0, k) + carte + o.html.slice(k) : carte + o.html; }
    return o;
  };
}
// Tenues enregistrées : bouton « Au Majlis »
if (typeof grSavedHTML === "function") {
  const grSavedAvantMj = grSavedHTML;
  grSavedHTML = function () { return grSavedAvantMj().replace(/<button type="button" data-gunsave="([^"]+)">/g, `<button type="button" data-mjlook="$1">💬 Au Majlis</button>$&`); };
}
// Outfit check : bouton « Envoyer au Majlis » (la photo est encore sur le téléphone)
if (typeof P.o_res === "function") {
  const oResAvantMj = P.o_res;
  P.o_res = (...a) => {
    const r = oResAvantMj(...a);
    if (r && typeof r.html === "string" && S.file && S.file.outfit) r.html += `<button class="btn mj-out" data-mjout>💬 Demander l’avis de mes amies</button><p class="hint mj-out-h">Envoie ta tenue dans le Majlis — ton visage est caché.</p>`;
    return r;
  };
}

// ——— Clics ———
addEventListener("click", e => {
  const t = e.target.closest("[data-mjami],[data-mjjoin],[data-mjinvno],[data-mjshare],[data-mjcopy],[data-mjopen],[data-mjre],[data-mjsend],[data-mjpick],[data-mjsendlook],[data-mjquit],[data-mjlook],[data-mjout],[data-mjpartno],[data-mjzoom]");
  if (!t) return;
  const d = t.dataset;
  if (d.mjami !== undefined) { e.preventDefault(); if (S.mjPart) return mjPartagerA(d.mjami, d.mjnom || ""); S.mjAmi = d.mjami; S.mjAmiNom = d.mjnom || ""; S.mjDraft = ""; go("mj_chat"); return; }
  if (t.hasAttribute("data-mjjoin")) return mjRejoindre();
  if (t.hasAttribute("data-mjinvno")) { mjInvFin(); mjRedraw(); return; }
  if (t.hasAttribute("data-mjshare")) { navigator.share && navigator.share({ title: "My Style", text: tr("Rejoins mon Majlis sur My Style 💛 On se montre nos tenues et on se donne nos avis :"), url: mjLien() }).catch(() => {}); return; }
  if (t.hasAttribute("data-mjcopy")) { const l = mjLien(); (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => toast("Lien copié"), () => { prompt("", l); }); return; }
  if (t.hasAttribute("data-mjopen")) {
    const n = (document.getElementById("mj_nom") || {}).value || ""; if (!n.trim()) { toast("Dis-moi ton prénom."); return; }
    MJ.busy = 1; MJ.err = ""; mjRedraw(); mjCompte(n).then(() => { MJ.busy = 0; return mjAmis(); }, er => { MJ.busy = 0; MJ.err = er.message; }).then(() => mjRedraw()); return;
  }
  if (t.hasAttribute("data-mjre")) { MJ.err = ""; MJ.amis = null; MJ.chg = 0; MJ.invErr = ""; mjRedraw(); return; }
  if (t.hasAttribute("data-mjsend")) { e.preventDefault(); return mjEnvoyerTexte(); }
  if (t.hasAttribute("data-mjpick")) { S.mjDraft = (document.getElementById("mj_txt") || {}).value || ""; S.mjPick = !S.mjPick; render(false); if (S.mjPick) requestAnimationFrame(() => { const p = document.querySelector(".mj-pick"); p && p.scrollIntoView({ block: "end" }); }); else window.scrollTo(0, document.body.scrollHeight); return; }
  if (d.mjsendlook) return mjEnvoyerChoix({ kind: "look", id: d.mjsendlook });
  if (t.hasAttribute("data-mjquit")) {
    const nom = S.mjAmiNom || ""; if (!confirm(tr("Retirer cette amie de ton Majlis ? Votre conversation sera effacée pour vous deux."))) return;
    mjApi("quitter", { ...mjAuth(), ami: S.mjAmi }).then(() => { delete MJC[S.mjAmi]; MJ.amis = (MJ.amis || []).filter(a => a.id !== S.mjAmi); toast("C’est fait"); back(); }, er => toast(er.message)); return;
  }
  if (d.mjlook) { S.mjPart = { kind: "look", id: d.mjlook }; go("majlis"); return; }
  if (t.hasAttribute("data-mjout")) { S.mjPart = { kind: "outfit" }; go("majlis"); return; }
  if (t.hasAttribute("data-mjpartno")) { S.mjPart = null; back(); return; }
  if (t.hasAttribute("data-mjzoom")) { t.classList.toggle("zoom"); return; }
}, true);
addEventListener("keydown", e => { if (e.key === "Enter" && e.target && e.target.id === "mj_txt" && !e.isComposing) { e.preventDefault(); mjEnvoyerTexte(); } });
addEventListener("input", e => { if (e.target && e.target.id === "mj_txt") S.mjDraft = e.target.value; });
addEventListener("change", e => {
  const t = e.target.closest && e.target.closest("[data-mjphoto]"); if (!t) return;
  const f = t.files && t.files[0]; if (f) mjEnvoyerChoix({ kind: "photo", file: f });
});

// « Effacer toutes mes données » : tout est supprimé aussi du serveur.
function mjWipe() {
  if (MJ.uid) mjApi("wipe", mjAuth()).catch(() => {});
  try { localStorage.removeItem("monstyle_majlis"); localStorage.removeItem("monstyle_mj_inv"); } catch (e) {}
  MJ = { uid: "", token: "", code: "", amis: null, nl: 0, err: "", busy: 0, inv: "", invNom: "", invErr: "" }; Object.keys(MJC).forEach(k => delete MJC[k]); mjBadge();
}

(function mjCSS() {
  const st = document.createElement("style");
  st.textContent = `
#hmj{order:2;position:relative;display:grid;place-items:center;color:var(--accent);cursor:pointer}#hmj[hidden]{display:none}
#hmj svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round}
.mj-bd{position:absolute;top:-3px;inset-inline-end:-3px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#B3261E;color:#fff;font:700 11px/18px system-ui,sans-serif;font-style:normal;text-align:center;box-shadow:0 0 0 2px #fff}
.mj-av{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(160deg,#F3E3C2,#D9B977);color:#5A4220;font:700 18px/1 Georgia,serif}
.mj-invite,.mj-msg{display:flex;flex-wrap:wrap;align-items:center;gap:12px;width:100%;margin:6px 0 14px;padding:14px 16px;border:0;border-radius:18px;background:#fff;box-shadow:0 4px 18px rgba(140,109,53,.16);text-align:start;font:inherit;color:var(--ink)}
.mj-invite>div,.mj-msg>span:nth-child(2){flex:1;min-width:150px;display:flex;flex-direction:column;gap:2px}.mj-invite small,.mj-msg small{color:#6E6E6E}
.mj-invite-b{display:flex;align-items:center;gap:12px;width:100%}.mj-invite-b .btn{flex:1;margin:0}
.mj-msg{cursor:pointer;flex-wrap:nowrap}.mj-nl{flex:none;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#B3261E;color:#fff;font:700 12px/22px system-ui,sans-serif;font-style:normal;text-align:center}
.mj-amis{list-style:none;margin:6px 0 18px;padding:0;display:flex;flex-direction:column;gap:8px}
.mj-ami{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid #E6E6E6;border-radius:16px;background:#fff;font:inherit;color:var(--ink);text-align:start;cursor:pointer}
.mj-ami.nl{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent) inset}
.mj-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.mj-t>span{color:#6E6E6E;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mj-ami.nl .mj-t>span{color:var(--ink);font-weight:600}
.mj-m{display:flex;flex-direction:column;align-items:flex-end;gap:4px}.mj-m small{color:#6E6E6E;font-size:.75rem;white-space:nowrap}
.mj-vide{display:flex;flex-direction:column;align-items:center;gap:4px;margin:10px 0 18px;padding:22px 16px;border-radius:18px;background:#fff;text-align:center}.mj-vide>span{font-size:2rem}.mj-vide small{color:#6E6E6E}
.mj-inv{margin:6px 0 10px;padding:16px;border-radius:18px;background:#fff;box-shadow:0 4px 18px rgba(140,109,53,.12)}.mj-inv h2{margin-top:0}
.mj-inv-b{display:flex;flex-wrap:wrap;gap:8px}.mj-inv-b .btn{flex:1 1 120px;margin:0;text-decoration:none;text-align:center}
.mj-lien{margin:10px 0 0;font-size:.78rem;color:#6E6E6E;word-break:break-all;text-align:center}
.mj-why{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:.88rem;color:#6E6E6E}
.mj-part{display:flex;flex-direction:column;gap:2px;margin:0 0 12px;padding:12px 14px;border-radius:14px;background:#fff;border-inline-start:4px solid var(--accent)}.mj-part small{color:#6E6E6E}.mj-part .link{align-self:flex-start;padding:4px 0}
.mj-hd{display:flex;align-items:center;gap:12px;margin:0 0 10px}.mj-hd>div{flex:1;min-width:0}.mj-hd h1{margin:0;font-size:1.5rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mj-hd small{color:#6E6E6E}.mj-quit{flex:none;width:auto!important;margin:0;padding:8px 4px;font-size:.85rem;color:#6E6E6E}
.mj-invite-b .link,.mj-part .link,.mj-pick>.link{width:auto!important;flex:none;margin:0}
.mj-list{display:flex;flex-direction:column;gap:8px;padding:4px 0 12px;min-height:40vh}
.mj-b{max-width:80%;padding:9px 12px 6px;border-radius:18px;background:#fff;box-shadow:0 1px 4px rgba(41,36,33,.08);display:flex;flex-direction:column;gap:4px;align-self:flex-start;border-end-start-radius:6px}
.mj-b.moi{align-self:flex-end;background:#F3E7CF;border-end-start-radius:18px;border-end-end-radius:6px}
.mj-b p{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.4}.mj-b em{font-style:normal;font-weight:600;font-size:.88rem;color:#5A4220}
.mj-b img{display:block;max-width:100%;max-height:300px;border-radius:12px;object-fit:cover;cursor:zoom-in;background:#F5F5F5}.mj-b img.zoom{max-height:none;cursor:zoom-out}
.mj-b small{font-size:.7rem;color:#8A8178;align-self:flex-end}
.mj-cmp{display:flex;align-items:center;gap:8px;width:100%}.mj-cmp .field{flex:1;min-width:0;margin:0}
.mj-plus{flex:none;width:46px;height:46px;border-radius:50%;border:1px solid #E6E6E6;background:#fff;color:var(--accent);font:400 26px/1 system-ui,sans-serif;cursor:pointer}
.mj-cmp .send-b svg{width:22px;height:22px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}[dir=rtl] .mj-cmp .send-b svg{transform:scaleX(-1)}
.mj-pick{margin:4px 0 12px;padding:14px;border-radius:18px;background:#fff;box-shadow:0 4px 18px rgba(140,109,53,.14);display:flex;flex-direction:column;gap:8px}
.mj-pk{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1.5px dashed var(--accent);border-radius:14px;cursor:pointer}.mj-pk span{font-size:1.4rem}.mj-pk small{color:#6E6E6E}
.mj-looks{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.mj-lk{display:flex;flex-direction:column;gap:6px;padding:8px;border:1px solid #E6E6E6;border-radius:14px;background:#fff;font:inherit;color:var(--ink);cursor:pointer;text-align:start}.mj-lk b{font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mj-lk .gr-col{display:grid;grid-template-columns:1fr 1fr;gap:3px;aspect-ratio:1;overflow:hidden;border-radius:10px}.mj-lk .gr-col.n1{grid-template-columns:1fr}.mj-lk .gr-col img{width:100%;height:100%;object-fit:cover}
.mj-b.mj-aura{align-self:center;max-width:88%;background:#FFFDF8;border:1px solid #D9B977;border-radius:18px;box-shadow:0 2px 10px rgba(140,109,53,.14)}.mj-aura-n{font:600 .8rem/1.2 Georgia,serif;color:var(--accent)}.mj-ecrit i{font-style:normal;animation:mjEc 1.2s infinite}@keyframes mjEc{50%{opacity:.25}}
.mj-out{width:100%;margin:16px 0 4px}.mj-out-h{text-align:center;margin:0 0 8px}
`;
  document.head.appendChild(st);
})();
