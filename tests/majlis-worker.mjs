// Tests du Worker « Le Majlis » (v159) avec une vraie base SQLite (node:sqlite) qui imite D1.
// Lancer : node tests/majlis-worker.mjs
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
const W = (await import(new URL("../worker/worker.js", import.meta.url))).default;
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
const db = new DatabaseSync(":memory:");
db.exec(`CREATE TABLE mj_users (id TEXT PRIMARY KEY, th TEXT NOT NULL, nom TEXT, code TEXT UNIQUE, cree INTEGER, vu INTEGER);
CREATE TABLE mj_amis (a TEXT NOT NULL, b TEXT NOT NULL, cree INTEGER, PRIMARY KEY (a, b));
CREATE TABLE mj_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, conv TEXT NOT NULL, de TEXT NOT NULL, t INTEGER, txt TEXT, img TEXT, look TEXT, lu INTEGER DEFAULT 0);`);
// Petit D1 : prepare().bind().first()/all()/run() + batch()
const D1 = {
  prepare(sql) { const st = { sql, args: [], bind(...a) { st.args = a; return st; },
    async first() { return db.prepare(sql).get(...st.args) || null; },
    async all() { return { results: db.prepare(sql).all(...st.args) }; },
    async run() { const r = db.prepare(sql).run(...st.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }; return st; },
  async batch(l) { const out = []; for (const s of l) out.push(await s.run()); return out; }
};
const env = { MAJLIS: D1 };
let ip = 0;
const call = async (path, body, origin = "https://imendriss271982-bit.github.io") => {
  const r = await W.fetch(new Request("https://w.dev" + path, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": "10.1.0." + (++ip % 250) }, body: JSON.stringify(body) }), env);
  return { s: r.status, j: await r.json() };
};
let r = await call("/majlis/moi", { nom: "" });
ok(r.s === 400, "Compte sans prénom refusé");
r = await call("/majlis/moi", { nom: "Sara" }, "https://mystyle.divadivina.app");
ok(r.s === 403, "Le site vitrine n'a pas accès au Majlis");
const A = (await call("/majlis/moi", { nom: "Sara" })).j, B = (await call("/majlis/moi", { nom: "Noura" })).j, C = (await call("/majlis/moi", { nom: "Mariam" })).j;
ok(/^[0-9a-f]{16}$/.test(A.uid) && /^[0-9a-f]{32}$/.test(A.token) && /^[A-Z2-9]{6}$/.test(A.code), "Compte créé : identifiant, jeton, code");
ok(db.prepare("SELECT th FROM mj_users WHERE id=?").get(A.uid).th !== A.token, "Seule l'empreinte du jeton est gardée");
const a = { uid: A.uid, token: A.token }, bb = { uid: B.uid, token: B.token }, c = { uid: C.uid, token: C.token };
r = await call("/majlis/moi", { ...a, nom: "Sarah" });
ok(r.s === 200 && r.j.uid === A.uid && r.j.code === A.code && !r.j.token, "Prénom mis à jour sans nouveau compte");
r = await call("/majlis/code", { code: A.code.toLowerCase() });
ok(r.s === 200 && r.j.nom === "Sarah", "Aperçu de l'invitation : prénom seulement");
r = await call("/majlis/code", { code: "ZZZZZZ" });
ok(r.s === 404, "Mauvais code");
r = await call("/majlis/amis", { uid: A.uid, token: "x".repeat(32) });
ok(r.s === 401, "Mauvais jeton refusé");
r = await call("/majlis/join", { ...a, code: A.code });
ok(r.s === 400 && r.j.code === "moi", "On ne s'invite pas soi-même");
r = await call("/majlis/send", { ...a, ami: B.uid, txt: "Coucou" });
ok(r.s === 404, "Pas de message avant d'être amies");
r = await call("/majlis/join", { ...bb, code: A.code });
ok(r.s === 200 && r.j.ami.id === A.uid && r.j.ami.nom === "Sarah", "Noura rejoint le Majlis de Sarah");
await call("/majlis/join", { ...bb, code: A.code });
ok(db.prepare("SELECT COUNT(*) n FROM mj_amis").get().n === 2, "Amitié dans les deux sens, sans doublon");
r = await call("/majlis/amis", a);
ok(r.s === 200 && r.j.amis.length === 1 && r.j.amis[0].nom === "Noura", "Sarah voit Noura");
r = await call("/majlis/send", { ...a, ami: B.uid, txt: "Tu préfères laquelle ?" });
ok(r.s === 200 && r.j.id > 0, "Message envoyé");
r = await call("/majlis/send", { ...a, ami: B.uid, img: "data:image/jpeg;base64,AAAA", look: "Look bureau" });
ok(r.s === 200, "Photo de tenue envoyée");
r = await call("/majlis/send", { ...a, ami: B.uid, img: "data:text/html;base64,AAAA" });
ok(r.s === 400, "Fichier qui n'est pas une image refusé");
r = await call("/majlis/send", { ...a, ami: B.uid, img: "data:image/jpeg;base64," + "A".repeat(700000) });
ok(r.s === 400, "Photo trop lourde refusée");
r = await call("/majlis/send", { ...a, ami: B.uid, txt: "   " });
ok(r.s === 400, "Message vide refusé");
r = await call("/majlis/nonlus", bb);
ok(r.j.n === 2, "Noura a 2 messages non lus");
r = await call("/majlis/amis", bb);
ok(r.j.amis[0].nl === 2 && r.j.amis[0].der.img === true && r.j.amis[0].der.look === "Look bureau", "Liste : non lus + dernier message");
r = await call("/majlis/msgs", { ...bb, ami: A.uid });
ok(r.j.msgs.length === 2 && !r.j.msgs[0].moi && r.j.msgs[1].img.startsWith("data:image"), "Noura lit la conversation");
ok((await call("/majlis/nonlus", bb)).j.n === 0, "Messages marqués lus");
r = await call("/majlis/msgs", { ...a, ami: B.uid });
ok(r.j.vu === r.j.msgs[1].id && r.j.msgs[0].moi, "Sarah voit « Vu »");
const last = r.j.msgs[1].id;
await call("/majlis/send", { ...bb, ami: A.uid, txt: "La deuxième 😍" });
r = await call("/majlis/msgs", { ...a, ami: B.uid, apres: last });
ok(r.j.msgs.length === 1 && r.j.msgs[0].txt === "La deuxième 😍", "Seuls les nouveaux messages arrivent");
r = await call("/majlis/msgs", { ...c, ami: A.uid });
ok(r.s === 404, "Mariam ne peut pas lire une conversation qui n'est pas la sienne");
await call("/majlis/join", { ...c, code: A.code });
ok((await call("/majlis/amis", a)).j.amis.length === 2, "Sarah a 2 amies");
r = await call("/majlis/quitter", { ...a, ami: B.uid });
ok(r.s === 200 && (await call("/majlis/amis", bb)).j.amis.length === 0 && db.prepare("SELECT COUNT(*) n FROM mj_msgs").get().n === 0, "Retirer une amie efface l'amitié et la conversation des deux côtés");
await call("/majlis/send", { ...c, ami: A.uid, txt: "Salut" });
r = await call("/majlis/wipe", c);
ok(r.s === 200 && !db.prepare("SELECT 1 FROM mj_users WHERE id=?").get(C.uid) && db.prepare("SELECT COUNT(*) n FROM mj_msgs").get().n === 0 && (await call("/majlis/amis", a)).j.amis.length === 0, "Effacer mes données : compte, amitiés et messages supprimés");
console.log(fails ? fails + " échec(s)" : "Tout est bon"); process.exit(fails ? 1 : 0);
