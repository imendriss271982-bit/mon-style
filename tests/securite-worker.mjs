// Tests de la sécurité des coûts du Worker (v180) : jeton d'appareil, quotas par jour, méthode ajoutée
// côté serveur, consigne système, codes testeuse, lien signé de l'agent vocal, code de la styliste.
// Gemini et ElevenLabs sont simulés (fetch remplacé) ; la base D1 est une vraie base SQLite (node:sqlite).
// Lancer : node tests/securite-worker.mjs
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
const W = (await import(new URL("../worker/worker.js", import.meta.url))).default;
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };

const db = new DatabaseSync(":memory:");
const D1 = {
  prepare(sql) { const st = { sql, args: [], bind(...a) { st.args = a; return st; },
    async first() { return db.prepare(sql).get(...st.args) || null; },
    async all() { return { results: db.prepare(sql).all(...st.args) }; },
    async run() { const s = db.prepare(sql); if (/RETURNING/i.test(sql)) return { results: s.all(...st.args) }; const r = s.run(...st.args); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; } }; return st; },
  async batch(l) { const out = []; for (const s of l) out.push(await s.run()); return out; }
};
// Cache des voix simulé
globalThis.caches = { default: { m: new Map(), async match(k) { const v = this.m.get(k.url); return v ? v.clone() : undefined; }, async put(k, v) { this.m.set(k.url, v); } } };

// Gemini / ElevenLabs simulés : on garde ce qui est envoyé.
const SENT = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, o = {}) => {
  url = String(url);
  SENT.push({ url, body: o.body ? String(o.body) : "" });
  if (url.includes("generativelanguage") && url.includes(":generateContent")) {
    if (url.includes("image")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "AAAA" } }] } }] }));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"note":7}' }] } }] }));
  }
  if (url.includes("get-signed-url")) return new Response(JSON.stringify({ signed_url: "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=x&conversation_signature=abc" }));
  if (url.includes("text-to-speech")) return new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "audio/mpeg" } });
  return realFetch(url, o);
};

const CODE_STY = "STYLISTE-TEST-9X";
const env = { MAJLIS: D1, GEMINI_KEY: "k-gemini", ELEVEN_KEY: "k-eleven", TEST_CODES: "Diva-2026, AUTRECODE", Q_AI_DEV: "3", Q_MK_DEV: "1",
  STYLISTE_HASH: createHash("sha256").update(CODE_STY).digest("hex"), VERIF: { async list() { return { keys: [], list_complete: true }; }, async get() { return null; } } };
let ipn = 0;
const call = async (path, body, o = {}) => {
  const r = await W.fetch(new Request("https://w.dev" + path, { method: "POST", headers: { Origin: o.origin || "https://imendriss271982-bit.github.io", "Content-Type": "application/json", "CF-Connecting-IP": o.ip || "10.9.0." + (++ipn % 250) }, body: JSON.stringify(body) }), o.env || env);
  const t = r.headers.get("Content-Type") || "";
  return { s: r.status, j: t.includes("json") ? await r.json() : null };
};

// 1. Sans jeton d'appareil : rien ne part chez Google ni ElevenLabs.
for (const [p, b] of [["/", { prompt: "§REF§ test" }], ["/tts", { type: "say_en", texte: "Hello" }], ["/makeup", { prompt: "x", image: "AAAA" }], ["/voice/session", {}]]) {
  const n = SENT.length, r = await call(p, b);
  ok(r.s === 401 && r.j.code === "device" && SENT.length === n, "Sans jeton : " + p + " refusé, aucun appel payant");
}
let r = await call("/", { prompt: "x", dev: "0123456789abcdef.00000000000000000000000000000000" });
ok(r.s === 401 && r.j.code === "device", "Jeton fabriqué (mauvaise signature) refusé");
r = await call("/device", {}, { origin: "https://evil.example" });
ok(r.s === 403, "Autre site : pas de jeton");

// 2. Jeton valide
r = await call("/device", {});
const DEV = r.j.dev;
ok(r.s === 200 && /^[0-9a-f]{16}\.[0-9a-f]{32}$/.test(DEV), "Jeton d'appareil délivré");

// 3. La méthode est ajoutée par le Worker + consigne système
SENT.length = 0;
r = await call("/", { prompt: "§REFP:VISAGISME§\nAnalyse ce visage.", dev: DEV });
const g = SENT.find(x => x.url.includes(":generateContent")), gb = g && JSON.parse(g.body);
ok(r.s === 200 && r.j.note === 7, "Analyse acceptée avec le jeton");
ok(gb && /VISAGISME/.test(gb.contents[0].parts[0].text) && !/§REF/.test(gb.contents[0].parts[0].text), "La méthode (VISAGISME) est ajoutée côté serveur, plus aucun repère §");
ok(gb && !/COLORIMÉTRIE 12 SAISONS/.test(gb.contents[0].parts[0].text), "Seules les rubriques demandées sont ajoutées");
ok(gb && gb.system_instruction && /My Style/.test(gb.system_instruction.parts[0].text), "Consigne système envoyée à Gemini");
r = await call("/", { prompt: "x".repeat(30001), dev: DEV });
ok(r.s === 400, "Demande trop longue refusée (30 000 caractères max)");

// 4. Quota par téléphone (Q_AI_DEV = 3 ici) : 1 déjà utilisée (la demande trop longue ne compte pas)
r = await call("/", { prompt: "a", dev: DEV });
r = await call("/", { prompt: "b", dev: DEV });
ok(r.s === 200, "3e analyse du jour acceptée");
const n4 = SENT.length;
r = await call("/", { prompt: "c", dev: DEV });
ok(r.s === 429 && r.j.code === "quota" && SENT.length === n4, "4e analyse du jour refusée (quota par téléphone), Gemini pas appelé");
const DEV2 = (await call("/device", {})).j.dev;
r = await call("/", { prompt: "d", dev: DEV2 });
ok(r.s === 200, "Un autre téléphone garde son propre quota");

// 5. Plafond global de l'app
const envG = { ...env, Q_AI_ALL: "5", Q_AI_DEV: "100" };
for (let i = 0; i < 3; i++) await call("/", { prompt: "e", dev: DEV2 }, { env: envG });
r = await call("/", { prompt: "f", dev: (await call("/device", {}, { env: envG })).j.dev }, { env: envG });
ok(r.s === 429 && r.j.code === "quota", "Plafond global de l'app : refusé même avec un nouveau jeton");

// 6. Make-up : quota propre (Q_MK_DEV = 1)
r = await call("/makeup", { prompt: "§REF§ Maquille-moi", image: "AAAA", dev: DEV });
const mk = SENT.filter(x => x.url.includes("image")).pop();
ok(r.s === 200 && r.j.image === "AAAA" && mk && !/§REF/.test(mk.body) && /BASE DE RÉFÉRENCE/.test(mk.body), "Make-up accepté, méthode ajoutée côté serveur");
r = await call("/makeup", { prompt: "x", image: "AAAA", dev: DEV });
ok(r.s === 429 && r.j.code === "quota", "2e make-up du jour refusé");

// 7. Voix : le cache ne consomme pas le quota
const envT = { ...env, Q_TTS_DEV: "1" };
r = await call("/tts", { type: "say_en", texte: "Hello Sara", dev: DEV }, { env: envT });
ok(r.s === 200, "Phrase lue (1re fois, appel ElevenLabs)");
r = await call("/tts", { type: "say_en", texte: "Hello Sara", dev: DEV }, { env: envT });
ok(r.s === 200, "Même phrase : servie par le cache, quota non consommé");
r = await call("/tts", { type: "say_en", texte: "Another sentence", dev: DEV }, { env: envT });
ok(r.s === 429 && r.j.code === "quota", "Nouvelle phrase au-delà du quota refusée");

// 8. Agent vocal : lien signé
r = await call("/voice/session", { dev: DEV });
const su = SENT.find(x => x.url.includes("get-signed-url"));
ok(r.s === 200 && /^wss:\/\//.test(r.j.signedUrl) && su && su.url.includes("agent_3801m58kjga8fddsm7bz46gcz4wf"), "Lien signé de l'agent Aura délivré");

// 9. Codes testeuse vérifiés par le Worker
ok((await call("/code", { code: "diva 2026" })).j.ok === true, "Code testeuse valide (espaces, minuscules acceptés)");
ok((await call("/code", { code: "MYSTYLE2026" })).j.ok === false, "Ancien code public refusé");
ok((await call("/code", { code: "DIVA2026" }, { env: { ...env, TEST_CODES: "" } })).j.ok === false, "Sans variable TEST_CODES, aucun code n'ouvre le VIP");

// 10. Code de la styliste : seulement depuis la variable Cloudflare
r = await call("/verif/admin", { code: "styliste-test-9x", action: "list" });
ok(r.s === 200, "Styliste : bon code accepté");
r = await call("/verif/admin", { code: "TEST-CODE-1234", action: "list" }, { env: { ...env, STYLISTE_HASH: "" } });
ok(r.s === 503 && r.j.code === "off", "Sans STYLISTE_HASH, l'espace styliste est fermé (plus d'empreinte dans le code)");

console.log(fails ? fails + " échec(s)" : "Tout est bon");
process.exit(fails ? 1 : 0);
