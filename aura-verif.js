/* My Style — « Vérifié par une vraie styliste » (v143, étape « 9/10 » face à ChatGPT/Gemini).
   Ce qu'aucune IA ne peut offrir : une vraie styliste (Imen, sans montrer son visage ni son nom) relit l'analyse
   ou la tenue de la cliente et répond personnellement, par écrit et/ou par message vocal.
   - Page `P.verif` : demandes envoyées (statut), formulaire (quoi vérifier, question, photo facultative).
   - Page `P.verif_rep` (S.vid) : la réponse écrite et le vocal.
   - Serveur : Worker `/verif/new` et `/verif/get` (KV « mon-style-styliste », 60 jours). La styliste répond depuis
     `styliste.html` (son code secret). Envoyé : prénom, langue, pays, résultats (PROFIL()), question, photo choisie.
   - « Effacer toutes mes données » → vfWipe() : supprimées du téléphone ET du serveur (/verif/del).
   - Sur le téléphone : `monstyle_verif` = [{id, token, cree, quoi, question, statut, rep:{texte, quand}, vu}] ;
     le vocal n'est pas copié sur le téléphone (il est relu sur le serveur tant que la demande existe).
   - Accueil : carte « Ta styliste t'a répondu » tant que la réponse n'a pas été ouverte.
   Chargé APRÈS aura-golfe.js (utilise S, P, NOM, PROFIL, pays, AI_URL, isVip, paywall, go, render, say, toast, esc, DOCK_OF). */

const VF_QUOI = [["visage", "Mon visage"], ["silhouette", "Ma silhouette"], ["couleurs", "Mes couleurs"], ["tenue", "Une tenue"], ["autre", "Autre question"]];
let VF = [];
try { const v = JSON.parse(localStorage.getItem("monstyle_verif") || "[]"); if (Array.isArray(v)) VF = v.filter(x => x && /^[0-9a-f]{16}$/.test(x.id) && /^[0-9a-f]{32}$/.test(x.token)).map(x => ({ id: x.id, token: x.token, cree: +x.cree || 0, quoi: Array.isArray(x.quoi) ? x.quoi.map(String) : [], question: String(x.question || ""), statut: x.statut === "repondu" ? "repondu" : "attente", rep: x.rep && typeof x.rep === "object" ? { texte: String(x.rep.texte || ""), quand: +x.rep.quand || 0, vocal: !!x.rep.vocal } : null, vu: x.vu ? 1 : 0 })).slice(0, 20); } catch (e) {}
function vfSave() { try { localStorage.setItem("monstyle_verif", JSON.stringify(VF)); } catch (e) {} }
const VF_AUDIO = {}; // vocaux de la séance (pas gardés sur le téléphone)
let VF_FORM = { quoi: [], question: "", photo: null, url: "" };

async function vfPost(path, body) {
  const r = await fetch(AI_URL + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok) { const er = new Error(j.erreur || "Le service ne répond pas. Réessaie plus tard."); er.code = j.code; throw er; }
  return j;
}
// Photo réduite (900 px, JPEG) en data URL, sous la limite du serveur.
function vfPhoto(file) {
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => { let m = 900, out = ""; for (let i = 0; i < 4; i++) { const k = Math.min(1, m / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); out = c.toDataURL("image/jpeg", 0.75); if (out.length < 850000) break; m = Math.round(m * 0.75); } URL.revokeObjectURL(u); ok(out); };
    im.onerror = () => { URL.revokeObjectURL(u); ko(new Error("Cette photo n’a pas pu être lue")); };
    im.src = u;
  });
}

// Met à jour les demandes en attente (au plus une fois par minute, ou forcé).
let vfDernier = 0, vfEnCours = false;
async function vfMaj(force) {
  if (vfEnCours || (!force && Date.now() - vfDernier < 60000)) return;
  const att = VF.filter(x => x.statut === "attente" || (force && x.rep && x.rep.vocal && !VF_AUDIO[x.id]));
  if (!att.length) return;
  vfEnCours = true; vfDernier = Date.now(); let chg = false;
  for (const d of att) {
    try {
      const r = await vfPost("/verif/get", { id: d.id, token: d.token });
      if (r.statut === "repondu" && r.rep) { if (d.statut !== "repondu") { d.vu = 0; chg = true; } d.statut = "repondu"; d.rep = { texte: String(r.rep.texte || ""), quand: +r.rep.quand || 0, vocal: !!r.rep.audio }; if (r.rep.audio) VF_AUDIO[d.id] = r.rep.audio; }
    } catch (e) { if (e.code === "introuvable") { d.statut = "expire"; chg = true; } }
  }
  VF = VF.filter(x => x.statut !== "expire");
  vfSave(); vfEnCours = false;
  if (chg && S && ["verif", "verif_rep", "home", "profil"].includes(S.page)) { const y = window.scrollY; render(false); window.scrollTo(0, y); }
}

async function vfEnvoyer() {
  if (typeof isVip === "function" && !isVip()) return paywall("verif");
  const q = document.getElementById("vf_q"); if (q) VF_FORM.question = q.value;
  const question = VF_FORM.question.trim();
  if (!VF_FORM.quoi.length && !question) { toast("Dis-moi ce que tu veux faire vérifier."); return; }
  if (S.vfBusy) return;
  S.vfBusy = 1; S.vfErr = ""; render(false);
  try {
    const photo = VF_FORM.photo ? await vfPhoto(VF_FORM.photo) : "";
    const r = await vfPost("/verif/new", { nom: S.nom || "", lang: S.lang || "fr", pays: typeof pays === "function" ? pays() : "", quoi: VF_FORM.quoi, question, profil: typeof PROFIL === "function" ? PROFIL() : "", photo });
    VF.unshift({ id: r.id, token: r.token, cree: r.cree || Date.now(), quoi: VF_FORM.quoi.slice(), question, statut: "attente", rep: null, vu: 0 });
    VF = VF.slice(0, 20); vfSave();
    if (VF_FORM.url) try { URL.revokeObjectURL(VF_FORM.url); } catch (e) {}
    VF_FORM = { quoi: [], question: "", photo: null, url: "" };
    S.vfBusy = 0; S.vfNew = 0; render(false);
    say("C’est envoyé. Ta styliste te répond sous 48 heures, ici dans l’app.");
  } catch (e) { S.vfBusy = 0; S.vfErr = e.message || "Le service ne répond pas. Réessaie plus tard."; render(false); }
}

const vfDate = t => { try { return new Date(t).toLocaleDateString(S.lang === "ar" ? "ar-QA" : S.lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long" }); } catch (e) { return ""; } };
const vfQuoiTxt = d => d.quoi.map(k => (VF_QUOI.find(x => x[0] === k) || ["", ""])[1]).filter(Boolean).join(" · ");

P.verif = () => {
  vfMaj();
  const liste = VF.length ? `<h2>Mes demandes</h2><div class="vf-list">${VF.map(d => `<button class="vf-row ${d.statut}" data-vfopen="${d.id}">
     <span class="vf-st">${d.statut === "repondu" ? (d.vu ? "Réponse lue" : "Nouvelle réponse") : "En attente"}</span>
     <b>${esc(vfQuoiTxt(d) || "Ma question")}</b><small><span data-noi18n>${esc(vfDate(d.cree))}</span>${d.question ? " · " + esc(d.question.slice(0, 60)) + (d.question.length > 60 ? "…" : "") : ""}</small>
     <span class="hx-chev" aria-hidden="true">›</span></button>`).join("")}</div>` : "";
  const form = S.vfNew || !VF.length ? `<h2>${VF.length ? "Nouvelle demande" : "Ta demande"}</h2>
   <p class="vf-lab">Que veux-tu faire vérifier ?</p>
   <div class="vf-chips">${VF_QUOI.map(q => `<button type="button" data-vfq="${q[0]}" aria-pressed="${VF_FORM.quoi.includes(q[0])}">${q[1]}</button>`).join("")}</div>
   <label class="vf-lab" for="vf_q">Ta question (facultatif)</label>
   <textarea class="field" id="vf_q" rows="4" maxlength="1200" placeholder="Par exemple : est-ce que le corail me va vraiment ?">${esc(VF_FORM.question)}</textarea>
   <label class="vf-photo"><input type="file" accept="image/*" data-vfphoto hidden>${VF_FORM.url ? `<img src="${VF_FORM.url}" alt="Photo jointe">` : `<span aria-hidden="true">📷</span>`}<b>${VF_FORM.url ? "Changer de photo" : "Ajouter une photo (facultatif)"}</b></label>
   <p class="hint">Ton prénom, tes résultats, ta question et la photo choisie sont envoyés à ta styliste, et rien d’autre. Ils sont effacés après 60 jours.</p>
   ${S.vfErr ? `<div class="note">${esc(S.vfErr)}</div>` : ""}` : "";
  return { back: true,
    html: `<p class="step">Ta styliste</p><h1>Vérifié par une vraie styliste</h1>
   <p class="sub">Une styliste professionnelle de My Style relit ton analyse ou ta tenue, et te répond personnellement, par écrit ou par message vocal.</p>
   <div class="vf-promesse"><span>✓ Une vraie personne, pas une IA</span><span>✓ Réponse sous 48 heures</span><span>✓ En français, en anglais ou en arabe</span></div>
   ${liste}${form}`,
    say: VF.length ? "" : "Une vraie styliste peut vérifier ton analyse. Dis-moi ce que tu veux lui demander.",
    foot: S.vfBusy ? `<button class="btn" disabled>J’envoie ta demande…</button>` : (S.vfNew || !VF.length) ? `<button class="btn" data-vfsend>Envoyer à ma styliste</button>` : `<button class="btn" data-vfnew>Nouvelle demande</button>` };
};
P.verif_rep = () => {
  const d = VF.find(x => x.id === S.vid);
  if (!d) return { back: true, html: `<h1>Vérifié par une vraie styliste</h1><div class="note">Demande introuvable.</div>`, say: "" };
  if (d.statut === "repondu" && !d.vu) { d.vu = 1; vfSave(); }
  if (d.rep && d.rep.vocal && !VF_AUDIO[d.id]) vfMaj(true);
  const a = VF_AUDIO[d.id];
  return { back: true,
    html: `<p class="step">Ta styliste</p><h1>${esc(vfQuoiTxt(d) || "Ma question")}</h1>
   <p class="sub"><span data-noi18n>${esc(vfDate(d.cree))}</span></p>
   ${d.question ? `<div class="vf-bulle moi"><small>Ta question</small><p>${esc(d.question)}</p></div>` : ""}
   ${d.statut === "repondu" && d.rep ? `<div class="vf-bulle elle"><small>Ta styliste</small>${d.rep.texte ? `<p data-noi18n>${esc(d.rep.texte)}</p>` : ""}
     ${d.rep.vocal ? (a ? `<audio controls preload="none" src="${a}"></audio>` : `<p class="hint">Je charge son message vocal…</p>`) : ""}</div>`
    : `<div class="note">Ta styliste n’a pas encore répondu. Tu recevras sa réponse ici, sous 48 heures.</div>`}`,
    say: "" };
};
if (typeof DOCK_OF !== "undefined") { DOCK_OF.verif = "profil"; DOCK_OF.verif_rep = "profil"; }

addEventListener("click", e => {
  const t = e.target.closest("[data-vfq],[data-vfsend],[data-vfnew],[data-vfopen]"); if (!t) return;
  const q = document.getElementById("vf_q"); if (q) VF_FORM.question = q.value;
  if (t.dataset.vfq) { const k = t.dataset.vfq, i = VF_FORM.quoi.indexOf(k); if (i < 0) VF_FORM.quoi.push(k); else VF_FORM.quoi.splice(i, 1); t.setAttribute("aria-pressed", i < 0); return; }
  if (t.hasAttribute("data-vfsend")) return vfEnvoyer();
  if (t.hasAttribute("data-vfnew")) { S.vfNew = 1; S.vfErr = ""; render(false); return; }
  if (t.dataset.vfopen) { S.vid = t.dataset.vfopen; go("verif_rep"); }
});
addEventListener("change", e => {
  const t = e.target.closest && e.target.closest("[data-vfphoto]"); if (!t) return;
  const f = t.files && t.files[0]; if (!f) return;
  const q = document.getElementById("vf_q"); if (q) VF_FORM.question = q.value;
  if (VF_FORM.url) try { URL.revokeObjectURL(VF_FORM.url); } catch (er) {}
  VF_FORM.photo = f; VF_FORM.url = URL.createObjectURL(f); render(false);
});

// « Effacer toutes mes données » : les demandes sont aussi supprimées du serveur.
function vfWipe() {
  const old = VF.slice(); VF = []; VF_FORM = { quoi: [], question: "", photo: null, url: "" };
  try { localStorage.removeItem("monstyle_verif"); } catch (e) {}
  old.forEach(d => vfPost("/verif/del", { id: d.id, token: d.token }).catch(() => {}));
}

// ——— Entrées ———
const vfTuile = () => `<button class="tile main vf-tile" data-view="verif"><b>Vérifié par une vraie styliste</b><span>Une styliste professionnelle relit ton analyse et te répond personnellement.</span></button>`;
if (typeof P.profil === "function") {
  const profilAvant = P.profil;
  P.profil = (...a) => { const o = profilAvant(...a); if (o && o.html) o.html = o.html.replace(/(<button class="tile main" data-view="prefs">[\s\S]*?<\/button>)/, "$1" + vfTuile()); vfMaj(); return o; };
}
if (typeof P.twin === "function") {
  const twinAvant = P.twin;
  P.twin = () => { const o = twinAvant(); if (o && o.html) o.html = o.html.replace(/(<div class="tw-list">[\s\S]*?<\/div>)(\s*<p class="hint">)/, `$1<div class="vf-twin">${vfTuile()}</div>$2`); return o; };
}
// Accueil : réponse non lue → carte en haut de « Pour toi aujourd'hui » ; et vérification discrète des réponses.
if (typeof P.home === "function") {
  const homeAvant2 = P.home;
  P.home = (...a) => {
    const o = homeAvant2(...a); vfMaj();
    const n = VF.filter(x => x.statut === "repondu" && !x.vu);
    if (n.length && o && o.html) o.html = o.html.replace(/<section><h2 class="hz-h">Pour toi aujourd’hui<\/h2>/, m => `<button class="vf-home" data-vfopen="${n[0].id}"><span aria-hidden="true">💌</span><span><b>Ta styliste t’a répondu</b><small>Touche pour lire sa réponse</small></span><span class="hx-chev" aria-hidden="true">›</span></button>` + m);
    return o;
  };
}

(function vfCSS() {
  const st = document.createElement("style");
  st.textContent = `
.vf-promesse{display:flex;flex-direction:column;gap:6px;margin:4px 0 16px;padding:14px 16px;border-radius:16px;background:var(--surface);box-shadow:0 2px 10px rgba(140,109,53,.12);font-size:.92rem;color:var(--accent);font-weight:600}
.vf-lab{display:block;margin:12px 0 8px;font-size:.92rem;color:var(--muted)}
.vf-chips{display:flex;flex-wrap:wrap;gap:8px}
.vf-chips button{padding:9px 14px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);font:inherit;font-size:.9rem;cursor:pointer}
.vf-chips button[aria-pressed="true"]{border-color:var(--accent);background:var(--accent);color:#fff}
.vf-photo{display:flex;align-items:center;gap:12px;margin:14px 0 8px;padding:12px 14px;border:1.5px dashed var(--accent);border-radius:14px;background:var(--surface);cursor:pointer}
.vf-photo img{width:56px;height:56px;object-fit:cover;border-radius:10px}
.vf-photo span{font-size:1.4rem}
.vf-list{display:flex;flex-direction:column;gap:8px}
.vf-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);text-align:start;font:inherit;cursor:pointer}
.vf-row .hx-chev{grid-row:1/4;grid-column:2}
.vf-row b{font-size:.95rem}.vf-row small{font-size:.82rem;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vf-st{font-size:.75rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.vf-row.repondu .vf-st{color:#2F6B2A}
.vf-bulle{margin:12px 0;padding:14px 16px;border-radius:16px;background:var(--surface);box-shadow:0 2px 10px rgba(140,109,53,.12)}
.vf-bulle small{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
.vf-bulle p{margin:6px 0 0;white-space:pre-wrap;line-height:1.5}
.vf-bulle.elle{border-inline-start:4px solid var(--accent)}
.vf-bulle audio{width:100%;margin-top:10px}
.vf-twin{margin-top:12px}
.vf-home{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 14px;padding:14px 16px;border:2px solid var(--accent);border-radius:16px;background:var(--surface);color:var(--ink);text-align:start;font:inherit;cursor:pointer}
.vf-home>span:first-child{font-size:1.5rem}
.vf-home>span:nth-child(2){flex:1;display:flex;flex-direction:column;gap:2px}
.vf-home small{color:var(--muted)}
`;
  document.head.appendChild(st);
})();
