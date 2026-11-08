// Test de la demande « couverte » du Worker (v182) : un modèle Gemini lent ne fait plus attendre la cliente.
// Lancer : node tests/vitesse-worker.mjs
const W = (await import(new URL("../worker/worker.js", import.meta.url))).default;
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
let LENT = 3000, PANNE = false;
const vus = [];
globalThis.fetch = async (url, o = {}) => {
  url = String(url);
  const m = (url.match(/models\/([^:]+):generateContent/) || [])[1];
  if (!m) throw new Error("réseau interdit : " + url);
  vus.push(m);
  if (m === "lent-1") {
    if (PANNE) return new Response("{}", { status: 503 });
    await new Promise((ok, ko) => { const t = setTimeout(ok, LENT); o.signal && o.signal.addEventListener("abort", () => { clearTimeout(t); ko(new Error("annulé")); }); });
  }
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ modele: m }) }] } }] }));
};
const env = { GEMINI_KEY: "g", MODEL: "lent-1", HEDGE_MS: "1500" };
const call = async body => {
  const dev = (await (await W.fetch(new Request("https://w.dev/device", { method: "POST", headers: { Origin: "https://imendriss271982-bit.github.io", "CF-Connecting-IP": "10.8.0.1" }, body: "{}" }), env)).json()).dev;
  const t0 = Date.now(), r = await W.fetch(new Request("https://w.dev/", { method: "POST", headers: { Origin: "https://imendriss271982-bit.github.io", "Content-Type": "application/json", "CF-Connecting-IP": "10.8.0.2" }, body: JSON.stringify({ dev, ...body }) }), env);
  return { ms: Date.now() - t0, j: await r.json() };
};
let r = await call({ prompt: "test" });
ok(r.j.modele && r.j.modele !== "lent-1" && r.ms < 2300, `Modèle lent : le 2e modèle répond, en ${r.ms} ms au lieu de ${LENT} ms`);
LENT = 50; vus.length = 0;
r = await call({ prompt: "test" });
ok(r.ms < 1000 && vus.length >= 1, "Modèle rapide : réponse directe");
PANNE = true; vus.length = 0;
r = await call({ prompt: "test" });
ok(r.j.modele && r.j.modele !== "lent-1" && r.ms < 1000, `Modèle en panne : le 2e modèle est lancé tout de suite (${r.ms} ms, sans attendre ${env.HEDGE_MS} ms)`);
console.log(fails ? fails + " échec(s)" : "Tout est bon");
process.exit(fails ? 1 : 0);
