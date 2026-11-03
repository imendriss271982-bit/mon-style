// Tests de la liste d'attente du site vitrine (/liste/add, /liste/admin), avec un KV simulé.
// Lancer : node tests/liste-worker.mjs
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
const W = (await import("data:text/javascript;base64," + readFileSync(new URL("../worker/worker.js", import.meta.url)).toString("base64"))).default;
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
const store = new Map();
const KV = {
  async put(k, v, o = {}) { store.set(k, { v, meta: o.metadata || null, ttl: o.expirationTtl }); },
  async get(k, t) { const e = store.get(k); return e ? (t === "json" ? JSON.parse(e.v) : e.v) : null; },
  async delete(k) { store.delete(k); },
  async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name, metadata: store.get(name).meta })), list_complete: true }; }
};
const CODE = "TEST-CODE-1234";
const env = { VERIF: KV, STYLISTE_HASH: createHash("sha256").update(CODE).digest("hex") };
const SITE = "https://mystyle.divadivina.app";
let ip = 0;
const call = async (path, body, origin = SITE) => {
  const r = await W.fetch(new Request("https://w.dev" + path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "10.1.0." + (++ip) }, body: JSON.stringify(body) }), env);
  return { s: r.status, j: await r.json(), cors: r.headers.get("Access-Control-Allow-Origin") };
};
let r = await call("/liste/add", { email: "pas-un-email" });
ok(r.s === 400, "Email invalide refusé");
r = await call("/liste/add", { email: "Sara@Exemple.com ", prenom: "Sara", pays: "Qatar", lang: "ar" });
ok(r.s === 200 && r.j.ok && !r.j.deja && r.cors === SITE, "Inscription depuis le site (CORS du site)");
r = await call("/liste/add", { email: "sara@exemple.com", prenom: "Sara" });
ok(r.s === 200 && r.j.deja, "Même email : pas de doublon");
ok([...store.keys()].filter(k => k.startsWith("w:")).length === 1, "Une seule inscrite stockée");
ok(store.values().next().value.ttl === undefined, "Pas d'expiration");
r = await call("/liste/add", { email: "robot@spam.com", site: "http://x" });
ok(r.s === 200 && [...store.keys()].length === 1, "Robot (champ piège) ignoré");
r = await call("/liste/add", { email: "x@y.com" }, "https://pirate.example");
ok(r.s === 403, "Autre site refusé");
r = await call("/verif/admin", { code: CODE, action: "list" }, SITE);
ok(r.s === 403, "Le site ne peut pas ouvrir les demandes de la styliste");
r = await call("/", { prompt: "x" }, SITE);
ok(r.s === 403, "Le site ne peut pas utiliser l'IA");
r = await call("/liste/admin", { code: "FAUX", action: "list" });
ok(r.s === 401, "Mauvais code refusé");
r = await call("/liste/admin", { code: CODE.toLowerCase(), action: "list" });
ok(r.s === 200 && r.j.inscrites.length === 1 && r.j.inscrites[0].email === "sara@exemple.com" && r.j.inscrites[0].lang === "ar", "La liste s'affiche avec le bon code");
r = await call("/liste/admin", { code: CODE, action: "delete", email: "sara@exemple.com" });
ok(r.s === 200 && ![...store.keys()].some(k => k.startsWith("w:")), "Suppression d'une inscrite");
console.log(fails ? `\n${fails} échec(s)` : "\nTout est bon"); process.exit(fails ? 1 : 0);
