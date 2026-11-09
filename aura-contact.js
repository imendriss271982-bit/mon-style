/* Diva Divina — Contact et séance privée (v156, demandé par Imen).
   Page `P.contact`, deux onglets (`S.ctTab`) :
   - « Besoin d’aide » : type (problème technique, question, suggestion), message, capture d’écran facultative.
     L’adresse email de contact (`CT_EMAIL`) est aussi affichée, avec un lien qui ouvre l’app Mail.
   - « Séance privée » : 1 heure avec la styliste au prix `prix("seance")` (300 QAR au Qatar), en ligne ou à Doha,
     date, créneau, objectif, petit mot. Les résultats Diva Divina (PROFIL()) sont joints à la demande.
     Le paiement n’est pas fait dans l’app : la styliste confirme la date et envoie le moyen de paiement par email.
   Envoi : Worker `/contact/new` → email (API Brevo) vers l’adresse d’Imen ; « Répondre » répond à la cliente.
   Rien n’est gardé sur le serveur ni sur le téléphone (sauf l’email/WhatsApp déjà dans le profil, pré-remplis).
   Si l’envoi échoue : lien email pré-rempli (mailto) pour ne jamais perdre le message.
   Entrées : tuile dans le Profil, bouton « Séance avec la styliste » des formules (`data-buy="seance"`).
   Chargé APRÈS aura-portes.js (utilise S, P, AI_URL, VERSION, PROFIL, pays, prix, go, render, say, toast, esc, tr, DOCK_OF). */

const CT_EMAIL = "imendriss@divadivina.app";
const CT_QUOI = [["bug", "Problème technique"], ["question", "Question"], ["idee", "Suggestion"]];
const CT_MODE = [["ligne", "En ligne (appel vidéo)"], ["doha", "À Doha"]];
const CT_CREN = [["matin", "Matin · 9 h – 12 h"], ["aprem", "Après-midi · 13 h – 17 h"], ["soir", "Soir · 18 h – 21 h"]];
const CT_OBJ = ["Mariage", "Garde-robe", "Travail", "Changer de style", "Une occasion", "Autre"];
let CT = { quoi: "bug", msg: "", photo: null, url: "", mode: "ligne", date: "", cren: "", obj: [], note: "", email: "", tel: "" };

const ctDemain = () => { const d = new Date(Date.now() + 86400000); return d.toISOString().slice(0, 10); };
// Garde ce que la cliente a tapé avant chaque nouveau rendu.
function ctLire() {
  const v = id => { const e = document.getElementById(id); return e ? e.value : null; };
  [["ct_msg", "msg"], ["ct_note", "note"], ["ct_email", "email"], ["ct_tel", "tel"], ["ct_date", "date"]].forEach(([id, k]) => { const x = v(id); if (x != null) CT[k] = x; });
}
function ctPhoto(file) { // même réduction que « Vérifié par une vraie styliste » (900 px, JPEG)
  if (typeof vfPhoto === "function") return vfPhoto(file);
  return new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ko(new Error("Cette photo n’a pas pu être lue")); r.readAsDataURL(file); });
}
// Lien email pré-rempli (secours si l'envoi échoue, ou si la cliente préfère son app Mail).
function ctMailto(type) {
  const nom = S.nom || "", sujet = type === "seance" ? "Diva Divina — Séance privée" : "Diva Divina — " + ((CT_QUOI.find(x => x[0] === CT.quoi) || ["", "Message"])[1]);
  let corps = type === "seance"
    ? `Bonjour,\n\nJe souhaite réserver une séance privée d’1 heure (${prix("seance")}).\nFormat : ${(CT_MODE.find(x => x[0] === CT.mode) || ["", ""])[1]}\nDate souhaitée : ${CT.date || "—"}\nCréneau : ${(CT_CREN.find(x => x[0] === CT.cren) || ["", "Peu importe"])[1]}\nObjectif : ${CT.obj.join(", ") || "—"}\n${CT.note ? "\n" + CT.note + "\n" : ""}\n${nom}`
    : `Bonjour,\n\n${CT.msg || ""}\n\n${nom}\n(Diva Divina v${typeof VERSION !== "undefined" ? VERSION : ""})`;
  return "mailto:" + CT_EMAIL + "?subject=" + encodeURIComponent(sujet) + "&body=" + encodeURIComponent(corps);
}

async function ctEnvoyer(type) {
  ctLire();
  const email = String(CT.email || "").trim().toLowerCase();
  if (type === "aide" && !CT.msg.trim()) { toast("Écris ton message."); return; }
  if (type === "seance" && !CT.date) { toast("Choisis une date."); return; }
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { toast("Vérifie ton email."); return; }
  if (S.ctBusy) return;
  S.ctBusy = 1; S.ctErr = ""; render(false);
  try {
    const photo = type === "aide" && CT.photo ? await ctPhoto(CT.photo) : "";
    const body = { type, nom: S.nom || "", email, tel: String(CT.tel || "").trim(), lang: S.lang || "fr", pays: typeof pays === "function" && typeof PAYS !== "undefined" && PAYS[pays()] ? PAYS[pays()].n : "" };
    if (type === "aide") Object.assign(body, { quoi: CT.quoi, message: CT.msg.trim(), photo, version: typeof VERSION !== "undefined" ? VERSION : "", appareil: navigator.userAgent.slice(0, 160) });
    else Object.assign(body, { mode: CT.mode, date: CT.date, creneau: CT.cren, objectifs: CT.obj, message: CT.note.trim(), prix: prix("seance"), profil: typeof PROFIL === "function" ? PROFIL() : "" });
    const r = await fetch(AI_URL + "/contact/new", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) throw new Error(j.erreur || "Le message n’est pas parti.");
    if (CT.url) try { URL.revokeObjectURL(CT.url); } catch (e) {}
    if (type === "aide") Object.assign(CT, { msg: "", photo: null, url: "" }); else Object.assign(CT, { date: "", cren: "", obj: [], note: "" });
    S.ctBusy = 0; S.ctOk = type; render(false); window.scrollTo(0, 0);
    say(type === "seance" ? "Merci, ta demande de séance est envoyée. Ta styliste te confirme la date par email." : "Merci, ton message est bien arrivé. Je te réponds par email.");
  } catch (e) { S.ctBusy = 0; S.ctErr = (e && e.message) || "Le message n’est pas parti."; render(false); }
}

P.contact = () => {
  const tab = S.ctTab === "seance" ? "seance" : "aide";
  const i = S.info || {};
  if (!CT.email && i.email) CT.email = i.email;
  if (!CT.tel && i.tel) CT.tel = i.tel;
  const onglets = `<div class="ct-tabs" role="tablist">${[["aide", "Besoin d’aide"], ["seance", "Séance privée"]].map(x => `<button type="button" role="tab" data-cttab="${x[0]}" aria-selected="${tab === x[0]}">${x[1]}</button>`).join("")}</div>`;
  const merci = S.ctOk ? `<div class="ct-ok"><span aria-hidden="true">💌</span><div><b>${S.ctOk === "seance" ? "Ta demande de séance est envoyée" : "Ton message est bien arrivé"}</b><small>${S.ctOk === "seance" ? "Ta styliste te confirme la date et t’envoie le moyen de paiement par email." : "Je te réponds par email, en général sous 48 heures."}</small></div></div>` : "";
  const moi = `<label class="vf-lab" for="ct_email">Ton email (pour te répondre)</label>
   <input class="field" id="ct_email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" dir="ltr" placeholder="you@example.com" value="${esc(CT.email || "")}">
   <label class="vf-lab" for="ct_tel">WhatsApp (facultatif)</label>
   <input class="field" id="ct_tel" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="+974 …" value="${esc(CT.tel || "")}">`;
  const err = S.ctErr ? `<div class="note">${esc(S.ctErr)}<br><a class="link" href="${ctMailto(tab)}">Envoyer par email à la place</a></div>` : "";
  let html;
  if (tab === "aide") html = `${onglets}${merci}
   <p class="sub">Un souci dans l’app, une question, une idée ? Écris-moi, je te réponds par email.</p>
   <p class="vf-lab">C’est à propos de…</p>
   <div class="vf-chips">${CT_QUOI.map(q => `<button type="button" data-ctquoi="${q[0]}" aria-pressed="${CT.quoi === q[0]}">${q[1]}</button>`).join("")}</div>
   <label class="vf-lab" for="ct_msg">Ton message</label>
   <textarea class="field" id="ct_msg" rows="5" maxlength="3000" placeholder="${CT.quoi === "bug" ? "Explique ce qui s’est passé : sur quelle page, ce que tu as touché…" : "Écris ton message ici"}">${esc(CT.msg)}</textarea>
   <label class="vf-photo"><input type="file" accept="image/*" data-ctphoto hidden>${CT.url ? `<img src="${CT.url}" alt="Capture jointe">` : `<span aria-hidden="true">📷</span>`}<b>${CT.url ? "Changer la capture" : "Ajouter une capture d’écran (facultatif)"}</b></label>
   ${moi}${err}
   <div class="ct-mail"><span>Tu préfères écrire directement ?</span><a href="mailto:${CT_EMAIL}" dir="ltr" data-noi18n>${CT_EMAIL}</a></div>
   <p class="hint">Ton prénom, ton email, ton message et la capture choisie sont envoyés par email, et rien d’autre.</p>`;
  else html = `${onglets}${merci}
   <div class="ct-offre"><b>Parle directement avec ta styliste</b><span>Une séance privée d’1 heure, rien que pour toi : ta morphologie, tes couleurs, ta garde-robe, ton occasion.</span><strong data-noi18n>${esc(prix("seance"))} · 1 h</strong></div>
   <p class="vf-lab">Format</p>
   <div class="vf-chips">${CT_MODE.map(q => `<button type="button" data-ctmode="${q[0]}" aria-pressed="${CT.mode === q[0]}">${q[1]}</button>`).join("")}</div>
   <label class="vf-lab" for="ct_date">Date souhaitée</label>
   <input class="field" id="ct_date" type="date" min="${ctDemain()}" value="${esc(CT.date || "")}">
   <p class="vf-lab">Créneau préféré</p>
   <div class="vf-chips">${CT_CREN.map(q => `<button type="button" data-ctcren="${q[0]}" aria-pressed="${CT.cren === q[0]}">${q[1]}</button>`).join("")}</div>
   <p class="vf-lab">Ton objectif</p>
   <div class="vf-chips">${CT_OBJ.map(o => `<button type="button" data-ctobj="${esc(o)}" aria-pressed="${CT.obj.includes(o)}">${o}</button>`).join("")}</div>
   <label class="vf-lab" for="ct_note">Un petit mot (facultatif)</label>
   <textarea class="field" id="ct_note" rows="3" maxlength="1500" placeholder="Par exemple : je me marie en mars et je ne sais pas par où commencer.">${esc(CT.note)}</textarea>
   ${moi}${err}
   <p class="hint">Rien n’est payé maintenant. Ta styliste te confirme la date et t’envoie le moyen de paiement par email. Tes résultats Diva Divina sont joints pour qu’elle prépare ta séance.</p>`;
  return { back: true, html: `<p class="step">Contact</p><h1>${tab === "seance" ? "Séance privée" : "Contacte-nous"}</h1>${html}`, say: "",
    foot: S.ctBusy ? `<button class="btn" disabled>J’envoie…</button>` : `<button class="btn" data-ctsend="${tab}">${tab === "seance" ? "Demander ma séance" : "Envoyer mon message"}</button>` };
};
if (typeof DOCK_OF !== "undefined") DOCK_OF.contact = "profil";

addEventListener("click", e => {
  const t = e.target.closest("[data-cttab],[data-ctquoi],[data-ctmode],[data-ctcren],[data-ctobj],[data-ctsend],[data-ctgo]"); if (!t) return;
  ctLire();
  const d = t.dataset;
  if (d.ctgo) { S.ctTab = d.ctgo; S.ctOk = ""; S.ctErr = ""; go("contact"); return; }
  if (d.cttab) { S.ctTab = d.cttab; S.ctOk = ""; S.ctErr = ""; render(false); return; }
  if (d.ctsend) return ctEnvoyer(d.ctsend);
  if (d.ctquoi) CT.quoi = d.ctquoi;
  if (d.ctmode) CT.mode = d.ctmode;
  if (d.ctcren) CT.cren = CT.cren === d.ctcren ? "" : d.ctcren;
  if (d.ctobj) { const k = CT.obj.indexOf(d.ctobj); if (k < 0) CT.obj.push(d.ctobj); else CT.obj.splice(k, 1); }
  const y = window.scrollY; render(false); window.scrollTo(0, y);
}, true);
addEventListener("change", e => {
  const t = e.target.closest && e.target.closest("[data-ctphoto]"); if (!t) return;
  const f = t.files && t.files[0]; if (!f) return;
  ctLire();
  if (CT.url) try { URL.revokeObjectURL(CT.url); } catch (er) {}
  CT.photo = f; CT.url = URL.createObjectURL(f); render(false);
});
// « Séance avec la styliste » dans les formules ouvre la réservation (au lieu de « bientôt »).
addEventListener("click", e => {
  const t = e.target.closest('[data-buy="seance"]'); if (!t) return;
  e.stopImmediatePropagation(); e.preventDefault();
  S.ctTab = "seance"; S.ctOk = ""; S.ctErr = ""; go("contact");
}, true);

// ——— Entrée dans le Profil : juste avant la politique de confidentialité ———
if (typeof P.profil === "function") {
  const profilAvantCt = P.profil;
  P.profil = (...a) => {
    const o = profilAvantCt(...a);
    if (o && o.html) o.html = o.html.replace(/(<a class="link" href="privacy\.html)/, `<h2>Contact</h2>
 <button class="tile main ct-tile" data-ctgo="seance"><b>Séance privée avec ta styliste</b><span>1 heure rien que pour toi · <span data-noi18n>${esc(prix("seance"))}</span></span></button>
 <button class="tile ct-tile2" data-ctgo="aide"><b>Besoin d’aide ?</b><span>Un souci dans l’app, une question : écris-moi</span></button>
 $1`);
    return o;
  };
}

(function ctCSS() {
  const st = document.createElement("style");
  st.textContent = `
.ct-tabs{display:flex;gap:6px;padding:4px;margin:0 0 14px;border-radius:999px;background:var(--surface);box-shadow:0 2px 10px rgba(140,109,53,.12)}
.ct-tabs button{flex:1;padding:10px 8px;border:0;border-radius:999px;background:transparent;color:var(--muted);font:inherit;font-weight:600;font-size:.92rem;cursor:pointer}
.ct-tabs button[aria-selected="true"]{background:var(--accent);color:#fff}
.ct-offre{display:flex;flex-direction:column;gap:6px;margin:0 0 6px;padding:16px;border:2px solid var(--accent);border-radius:16px;background:var(--surface)}
.ct-offre span{color:var(--muted);font-size:.92rem;line-height:1.45}
.ct-offre strong{color:var(--accent);font-size:1.15rem}
.ct-ok{display:flex;gap:12px;align-items:center;margin:0 0 14px;padding:14px 16px;border-radius:16px;background:var(--surface);border-inline-start:4px solid #2F6B2A}
.ct-ok>span{font-size:1.5rem}.ct-ok div{display:flex;flex-direction:column;gap:2px}.ct-ok small{color:var(--muted)}
.ct-mail{display:flex;flex-direction:column;gap:4px;margin:16px 0 4px;padding:12px 14px;border-radius:14px;background:var(--surface);font-size:.9rem;color:var(--muted)}
.ct-mail a{color:var(--accent);font-weight:700;word-break:break-all}
input.field[type="date"]{min-height:46px}
`;
  document.head.appendChild(st);
})();
