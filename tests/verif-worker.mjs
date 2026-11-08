// Tests du Worker « Vérifié par une vraie styliste » (v143), avec un KV simulé.
// Lancer : STYLISTE_CODE=<code> node tests/verif-worker.mjs  (sans code, les tests de la styliste utilisent une empreinte de test)
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
// worker.js est un module ES sans package.json : on le charge tel quel.
const W = (await import(new URL("../worker/worker.js", import.meta.url))).default;
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
const store = new Map();
const KV = {
  async put(k, v, o = {}) { store.set(k, { v, meta: o.metadata || null, ttl: o.expirationTtl }); },
  async get(k, t) { const e = store.get(k); return e ? (t === "json" ? JSON.parse(e.v) : e.v) : null; },
  async delete(k) { store.delete(k); },
  async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name, metadata: store.get(name).meta })), list_complete: true }; }
};
const CODE = process.env.STYLISTE_CODE || "TEST-CODE-1234";
const env = { VERIF: KV, ...(process.env.STYLISTE_CODE ? {} : { STYLISTE_HASH: createHash("sha256").update(CODE).digest("hex") }) };
let ip = 0;
const call = async (path, body, origin = "https://imendriss271982-bit.github.io") => {
  const r = await W.fetch(new Request("https://w.dev" + path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "10.0.0." + (++ip) }, body: JSON.stringify(body) }), env);
  return { s: r.status, j: await r.json() };
};
let r = await call("/verif/new", { nom: "Sara", question: "" });
ok(r.s === 400, "Demande vide refusée");
r = await call("/verif/new", { nom: "Sara", question: "Est-ce que le corail me va ?" }, "https://pirate.example");
ok(r.s === 403, "Autre site refusé");
r = await call("/verif/new", { nom: "Sara<script>", lang: "fr", pays: "QA", quoi: ["visage", "couleurs"], question: "Est-ce que le corail me va ?", profil: "Silhouette : Sablier", photo: "data:image/jpeg;base64,AAAA" });
ok(r.s === 200 && /^[0-9a-f]{16}$/.test(r.j.id) && /^[0-9a-f]{32}$/.test(r.j.token), "Demande créée : identifiant et jeton");
const { id, token } = r.j;
const raw = JSON.parse(store.get("d:" + id).v);
ok(raw.t !== token && raw.t.length === 64, "Seule l’empreinte du jeton est gardée");
ok(store.get("d:" + id).ttl === 60 * 24 * 3600, "La demande expire après 60 jours");
r = await call("/verif/new", { question: "x", photo: "data:text/html;base64,AAAA" });
ok(r.s === 400, "Photo d’un mauvais type refusée");
r = await call("/verif/get", { id, token: "mauvais" });
ok(r.s === 404, "Mauvais jeton : rien n’est montré");
r = await call("/verif/get", { id, token });
ok(r.s === 200 && r.j.statut === "attente" && r.j.rep === null, "La cliente voit « en attente »");
r = await call("/verif/admin", { code: "FAUX", action: "list" });
ok(r.s === 401, "Mauvais code de styliste refusé");
r = await call("/verif/admin", { code: CODE.toLowerCase(), action: "list" });
ok(r.s === 200 && r.j.demandes.length === 1 && r.j.demandes[0].id === id && r.j.demandes[0].statut === "attente", "La styliste voit la liste (code sans souci de majuscules)");
r = await call("/verif/admin", { code: CODE, action: "read", id });
ok(r.s === 200 && r.j.question === "Est-ce que le corail me va ?" && r.j.profil === "Silhouette : Sablier" && r.j.photo && !("t" in r.j), "La styliste lit la demande, sans le jeton");
r = await call("/verif/admin", { code: CODE, action: "reply", id, texte: "", audio: "" });
ok(r.s === 400, "Réponse vide refusée");
r = await call("/verif/admin", { code: CODE, action: "reply", id, texte: "Oui, le corail illumine ton teint.", audio: "data:audio/mp4;base64,AAAA" });
ok(r.s === 200, "La styliste répond (texte + vocal)");
r = await call("/verif/get", { id, token });
ok(r.j.statut === "repondu" && r.j.rep.texte === "Oui, le corail illumine ton teint." && r.j.rep.audio.startsWith("data:audio/"), "La cliente reçoit la réponse et le vocal");
r = await call("/verif/admin", { code: CODE, action: "list" });
ok(r.j.demandes[0].statut === "repondu", "La liste montre « répondu »");
r = await call("/verif/del", { id, token: "mauvais" });
ok(store.has("d:" + id), "Effacement avec un mauvais jeton : rien n’est supprimé");
r = await call("/verif/del", { id, token });
ok(r.s === 200 && !store.has("d:" + id), "La cliente efface sa demande avec son jeton");
r = await call("/verif/admin", { code: CODE, action: "delete", id });
r = await call("/verif/get", { id, token });
ok(r.s === 404, "Demande supprimée");
const env2 = { };
const r2 = await W.fetch(new Request("https://w.dev/verif/new", { method: "POST", headers: { Origin: "https://imendriss271982-bit.github.io", "CF-Connecting-IP": "9.9.9.9" }, body: "{}" }), env2);
ok(r2.status === 503, "Sans KV branché : message clair, pas de plantage");
// Limite : 4 demandes par 10 minutes depuis la même adresse
let last;
for (let i = 0; i < 6; i++) last = await W.fetch(new Request("https://w.dev/verif/new", { method: "POST", headers: { Origin: "https://imendriss271982-bit.github.io", "CF-Connecting-IP": "8.8.8.8" }, body: JSON.stringify({ question: "q" + i }) }), env);
ok(last.status === 429, "Trop de demandes depuis la même adresse : limité");
console.log(fails ? fails + " test(s) en échec" : "Tous les tests passent"); process.exit(fails ? 1 : 0);
