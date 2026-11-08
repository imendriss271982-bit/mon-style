// Tests du Worker « Comptes clientes » (v181) : code par email, session, sauvegarde et récupération,
// photos, effacement, mesure d'usage, page « Mes clientes ». Brevo simulé, base D1 = SQLite (node:sqlite).
// Lancer : node tests/compte-worker.mjs
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
const W = (await import(new URL("../worker/worker.js", import.meta.url))).default;
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
const db = new DatabaseSync(":memory:");
const D1 = {
  prepare(sql) { const st = { sql, args: [], bind(...a) { st.args = a; return st; },
    async first() { return db.prepare(sql).get(...st.args) || null; },
    async all() { return { results: db.prepare(sql).all(...st.args) }; },
    async run() { const s = db.prepare(sql); if (/RETURNING/i.test(sql)) return { results: s.all(...st.args) }; const r = s.run(...st.args); return { meta: { changes: r.changes } }; } }; return st; },
  async batch(l) { const out = []; for (const s of l) out.push(await s.run()); return out; }
};
const MAILS = [];
globalThis.fetch = async (url, o = {}) => {
  if (String(url).includes("api.brevo.com")) { MAILS.push(JSON.parse(o.body)); return new Response("{}", { status: 201 }); }
  throw new Error("réseau interdit : " + url);
};
const CODE_STY = "STY-TEST-7Q";
const env = { MAJLIS: D1, GEMINI_KEY: "g", BREVO_KEY: "b", STYLISTE_HASH: createHash("sha256").update(CODE_STY).digest("hex") };
let ip = 0;
const call = async (path, body, e = env) => {
  const r = await W.fetch(new Request("https://w.dev" + path, { method: "POST", headers: { Origin: "https://imendriss271982-bit.github.io", "Content-Type": "application/json", "CF-Connecting-IP": "10.7.0." + (++ip % 250) }, body: JSON.stringify(body) }), e);
  return { s: r.status, j: await r.json() };
};
const dev = (await call("/device", {})).j.dev, dev2 = (await call("/device", {})).j.dev;
const codeDe = () => (MAILS.at(-1).htmlContent.match(/>(\d{6})</) || [])[1];

// 1. Code par email
let r = await call("/auth/start", { email: "sara@example.com", lang: "ar" });
ok(r.s === 401 && r.j.code === "device", "Sans jeton d'appareil : pas de code envoyé");
r = await call("/auth/start", { dev, email: "pas-un-email", lang: "fr" });
ok(r.s === 400 && r.j.code === "email", "Email invalide refusé");
r = await call("/auth/start", { dev, email: "Sara@Example.com ", lang: "ar" });
ok(r.s === 200 && MAILS.length === 1 && MAILS[0].to[0].email === "sara@example.com" && /\d{6}/.test(codeDe()), "Code envoyé par email (adresse en minuscules)");
ok(/dir="rtl"/.test(MAILS[0].htmlContent) && /كود/.test(MAILS[0].subject), "Email du code en arabe pour une cliente arabophone");
ok(!JSON.stringify(db.prepare("SELECT * FROM ms_otp").all()).includes(codeDe()), "Le code n'est pas gardé en clair sur le serveur");
const bon = codeDe();
r = await call("/auth/verify", { dev, email: "sara@example.com", code: bon === "000000" ? "111111" : "000000" });
ok(r.s === 400 && r.j.code === "faux", "Mauvais code refusé");
r = await call("/auth/verify", { dev, email: "sara@example.com", code: bon, nom: "Sara", pays: "qa", lang: "ar" });
ok(r.s === 200 && /^[0-9a-f]{48}$/.test(r.j.tok) && r.j.nouveau === true && r.j.donnees === false, "Bon code : compte créé, session ouverte");
const tok = r.j.tok;
r = await call("/auth/verify", { dev, email: "sara@example.com", code: bon });
ok(r.s === 400 && r.j.code === "expire", "Un code ne sert qu'une fois");
ok(db.prepare("SELECT th FROM ms_sess").get().th !== tok, "Seule l'empreinte du jeton de session est gardée");

// 2. Essais limités
await call("/auth/start", { dev, email: "noura@example.com", lang: "fr" });
for (let i = 0; i < 5; i++) await call("/auth/verify", { dev, email: "noura@example.com", code: "999999" === codeDe() ? "888888" : "999999" });
r = await call("/auth/verify", { dev, email: "noura@example.com", code: codeDe() });
ok(r.s === 429 && r.j.code === "essais", "Après 5 mauvais codes, même le bon est refusé (il faut un nouveau code)");

// 3. Sauvegarde
r = await call("/sync/meta", { dev, tok: "f".repeat(48) });
ok(r.s === 401 && r.j.code === "session", "Session inventée refusée");
const prof = JSON.stringify({ nom: "Sara", res: { visage: { forme: "ovale" } } });
const img = "data:image/jpeg;base64," + "A".repeat(2000);
r = await call("/sync/put", { dev, tok, data: { monstyle: prof, monstyle_gr: '{"items":[{"id":"p1"}]}', autre_cle: "x" }, photos: { p1: img, p2: "javascript:alert(1)" } });
ok(r.s === 200 && r.j.t > 0, "Profil, garde-robe et photo sauvegardés");
r = await call("/sync/meta", { dev: dev2, tok });
ok(r.s === 200 && r.j.email === "sara@example.com" && r.j.keys.monstyle && r.j.keys.monstyle_gr && !r.j.keys.autre_cle && Object.keys(r.j.photos).join() === "p1", "Un autre téléphone voit ce qui est sauvegardé (clé inconnue et fausse photo ignorées)");
r = await call("/sync/get", { dev: dev2, tok, keys: ["monstyle", "monstyle_gr", "autre_cle"], photos: ["p1"] });
ok(r.j.data.monstyle.v === prof && r.j.photos.p1 === img && !r.j.data.autre_cle, "Récupération sur le nouveau téléphone : profil et photo identiques");
r = await call("/sync/put", { dev, tok, data: { monstyle: "x".repeat(1800001) } });
ok(r.s === 413, "Donnée trop grosse refusée");
r = await call("/sync/put", { dev, tok, data: { monstyle_gr: null }, photos: { p1: null } });
r = await call("/sync/meta", { dev, tok });
ok(!r.j.keys.monstyle_gr && !Object.keys(r.j.photos).length, "Suppression d'une clé et d'une photo");

// 4. Mesure d'usage + page Mes clientes
await call("/ev", { dev, e: ["open", "p:home", "p:home", "p:garde", "<script>"] });
await call("/ev", { dev: dev2, e: ["open", "p:outfit"] });
r = await call("/admin/clientes", { code: "faux" });
ok(r.s === 401, "Page Mes clientes : mauvais code refusé");
r = await call("/admin/clientes", { code: CODE_STY.toLowerCase(), jours: 30 });
const ec = Object.fromEntries(r.j.ecrans.map(x => [x.e, x.n]));
ok(r.s === 200 && r.j.users.length === 1 && r.j.users[0].email === "sara@example.com" && r.j.users[0].pays === "QA", "Mes clientes : la liste unique (email, pays)");
ok(r.j.actifs.length === 1 && r.j.actifs[0].n === 2 && ec.open === 2 && ec["p:home"] === 1 && !ec["<script>"], "Usage : 2 téléphones actifs aujourd'hui, écrans comptés, noms invalides ignorés");
ok(r.j.j1 && typeof r.j.j1.base === "number", "Retour à J+1 / J+7 calculé");
r = await call("/admin/clientes", { code: CODE_STY, jours: 30 }, { ...env, STYLISTE_HASH: "" });
ok(r.s === 503, "Sans STYLISTE_HASH, la page Mes clientes est fermée");

// 5. Déconnexion et effacement
const tok2 = await (async () => { await call("/auth/start", { dev, email: "sara@example.com", lang: "fr" }); return (await call("/auth/verify", { dev, email: "sara@example.com", code: codeDe() })).j; })();
ok(tok2.nouveau === false, "Reconnexion : même compte, pas de doublon");
r = await call("/auth/out", { dev, tok: tok2.tok });
ok((await call("/sync/meta", { dev, tok: tok2.tok })).s === 401, "Déconnexion : la session ne marche plus");
await call("/sync/put", { dev, tok, data: { monstyle: prof }, photos: { p9: img } });
r = await call("/compte/del", { dev, tok });
ok(r.s === 200 && !db.prepare("SELECT COUNT(*) AS n FROM ms_users").get().n && !db.prepare("SELECT COUNT(*) AS n FROM ms_data").get().n && !db.prepare("SELECT COUNT(*) AS n FROM ms_photo").get().n, "Effacer mon compte : profil, données et photos supprimés du serveur");

// 6. Sans Brevo : message clair
r = await call("/auth/start", { dev: dev2, email: "x@example.com" }, { ...env, BREVO_KEY: "" });
ok(r.s === 503 && r.j.code === "off", "Sans clé Brevo : « pas encore activé »");

console.log(fails ? fails + " échec(s)" : "Tout est bon");
process.exit(fails ? 1 : 0);
