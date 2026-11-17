// Tests du Worker « Suivi de Diva » (v225) : abonnement, questions programmées, envoi Web Push (VAPID) par le cron,
// lecture du texte par le service worker, abonnement expiré, effacement. Base SQLite (node:sqlite) qui imite D1.
// Lancer : node tests/suivi-worker.mjs
import { DatabaseSync } from "node:sqlite";
const W = (await import(new URL("../worker/worker.js", import.meta.url))).default;
const { suiviCron, vapidHeader, vapid } = await import(new URL("../worker/suivi.js", import.meta.url));
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
const db = new DatabaseSync(":memory:");
const D1 = {
  prepare(sql) { const st = { sql, args: [], bind(...a) { st.args = a; return st; },
    async first() { return db.prepare(sql).get(...st.args) || null; },
    async all() { return { results: db.prepare(sql).all(...st.args) }; },
    async run() { const r = db.prepare(sql).run(...st.args); return { meta: { changes: r.changes } }; } }; return st; },
  async batch(l) { const out = []; for (const s of l) out.push(await s.run()); return out; }
};
const env = { MAJLIS: D1, DEVICE_SECRET: "secret-test" };
let ip = 0;
const call = async (path, body) => {
  const r = await W.fetch(new Request("https://w.dev" + path, { method: "POST", headers: { Origin: "https://imendriss271982-bit.github.io", "Content-Type": "application/json", "CF-Connecting-IP": "10.2.0." + (++ip % 250) }, body: JSON.stringify(body) }), env);
  return { s: r.status, j: await r.json() };
};
const dev = (await call("/device", {})).j.dev;
ok(!!dev, "Jeton d'appareil");
let r = await call("/suivi/key", { dev });
ok(r.s === 200 && /^[A-Za-z0-9_-]{80,90}$/.test(r.j.key), "Clé publique VAPID créée toute seule (65 octets)");
const k1 = r.j.key;
ok((await call("/suivi/key", { dev })).j.key === k1, "La même clé est gardée");
r = await call("/suivi/key", {});
ok(r.s === 401, "Sans jeton d'appareil : refusé");

const sub = { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", keys: { p256dh: "p", auth: "a" } };
const now = Date.now();
r = await call("/suivi/add", { dev, sub: { endpoint: "https://evil.example.com/x" }, id: "abcdef1234", at: now + 1000, b: "x" });
ok(r.s === 400, "Adresse de notification inconnue refusée");
r = await call("/suivi/add", { dev, sub, id: "abcdef1234", at: now + 40 * 864e5 });
ok(r.s === 400, "Plus de 30 jours à l'avance refusé");
r = await call("/suivi/add", { dev, sub, id: "travail0001", at: now - 1000, t: "Diva", b: "Comment s’est passée ta journée au travail ?", lang: "fr" });
ok(r.s === 200, "Question « travail » programmée");
r = await call("/suivi/add", { dev, sub, id: "mariage0001", at: now + 864e5, t: "Diva", b: "Alors, le mariage de ta sœur ?", lang: "fr" });
ok(r.s === 200, "Question « mariage » programmée pour demain");
r = await call("/suivi/add", { dev, sub, id: "annule00001", at: now - 1000, t: "Diva", b: "À annuler", lang: "fr" });
await call("/suivi/del", { dev, id: "annule00001" });
ok(!db.prepare("SELECT 1 FROM ms_suivi WHERE id='annule00001'").get(), "Répondue dans l'app avant l'heure : la question est retirée");

// Le cron n'envoie que ce qui est arrivé à l'heure, avec un en-tête VAPID valide et sans contenu.
const sent = [];
const fakeFetch = async (url, o) => { sent.push({ url, o }); return { status: 201 }; };
let c = await suiviCron(env, now, fakeFetch);
ok(c.envoyes === 1 && sent.length === 1 && sent[0].url === sub.endpoint, "Cron : 1 notification envoyée (la question de demain attend)");
const h = sent[0].o.headers;
ok(/^vapid t=[^.]+\.[^.]+\.[^,]+, k=/.test(h.Authorization) && h.TTL === "86400" && !sent[0].o.body, "En-tête VAPID, TTL, aucune donnée dans la notification");
// Vérifie la signature du jeton VAPID avec la clé publique.
{
  const v = await vapid(D1);
  const t = h.Authorization.match(/t=([^,]+)/)[1], [hh, pp, ss] = t.split(".");
  const dec = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), ch => ch.charCodeAt(0));
  const pub = await crypto.subtle.importKey("raw", dec(v.pub), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const okSig = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, dec(ss), new TextEncoder().encode(hh + "." + pp));
  const pl = JSON.parse(new TextDecoder().decode(dec(pp)));
  ok(okSig && pl.aud === "https://fcm.googleapis.com" && pl.sub.startsWith("mailto:"), "Signature VAPID valide, audience = service de notification");
}
c = await suiviCron(env, now, fakeFetch);
ok(c.envoyes === 0, "Pas d'envoi en double");

// Le service worker lit le texte, une seule fois.
r = await call("/suivi/pending", { ep: sub.endpoint });
ok(r.s === 200 && r.j.msgs.length === 1 && r.j.msgs[0].id === "travail0001" && !r.j.msgs[0].b && r.j.lang === "fr" && r.j.silent === false, "Le téléphone reçoit seulement l'identifiant (la question n'est jamais sur le serveur)");
ok(!db.prepare("SELECT 1 FROM ms_suivi WHERE b <> ''").get(), "Aucun texte de question gardé sur le serveur");
r = await call("/suivi/pending", { ep: sub.endpoint });
ok(r.j.msgs.length === 0, "Texte lu une seule fois");
r = await call("/suivi/pending", { ep: "https://evil.example.com/x" });
ok(r.j.msgs.length === 0, "Adresse inconnue : rien");

// Mode silencieux choisi dans le Profil.
await call("/suivi/mode", { dev, mode: "silent", lang: "ar" });
await call("/suivi/add", { dev, sub, id: "silence0001", at: now - 500 });
await suiviCron(env, now, fakeFetch);
r = await call("/suivi/pending", { ep: sub.endpoint });
ok(r.j.silent === true && r.j.lang === "ar" && r.j.msgs.length === 1, "Mode silencieux et langue transmis au téléphone");
// Demain : le mariage part ; abonnement expiré → tout est oublié.
c = await suiviCron(env, now + 864e5 + 1000, async () => ({ status: 410 }));
ok(c.envoyes === 0 && !db.prepare("SELECT 1 FROM ms_push WHERE ep=?").get(sub.endpoint) && !db.prepare("SELECT 1 FROM ms_suivi").get(), "Notifications retirées (410) : abonnement et questions effacés");

// Effacer toutes mes données.
await call("/suivi/add", { dev, sub, id: "zzzzzz0001", at: now + 5000, b: "x" });
await call("/suivi/wipe", { dev });
ok(!db.prepare("SELECT 1 FROM ms_suivi").get() && !db.prepare("SELECT 1 FROM ms_push").get(), "Effacer mes données : tout est supprimé");
// Le scheduled du Worker existe et ne plante pas.
let waited; await W.scheduled({}, env, { waitUntil: p => { waited = p; } }); await waited;
ok(true, "scheduled() tourne");
console.log(fails ? fails + " échec(s)" : "Tous les tests passent"); process.exit(fails ? 1 : 0);
