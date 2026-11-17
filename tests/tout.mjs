// Lance TOUS les tests (v228) : ceux de l'app (Playwright, serveur sur http://localhost:8765/) et ceux du Worker.
// Utilisé par GitHub avant chaque publication : si un seul test échoue, l'app n'est pas publiée.
// En local : python3 -m http.server 8765 (dans le dossier de l'app), puis : node tests/tout.mjs
// Options : JOBS=4 (tests en même temps), SEUL=accueil,jour (seulement ceux-là), PART=1/4 (une part sur 4), DRY=1 (liste sans lancer).
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
// crawl.js n'est pas un test à part : il sert d'extension à smoke.js (EXTRA=…).
const HORS = new Set(["crawl.js", "tout.mjs"]);
let liste = readdirSync(ICI).filter(f => /\.(m?js)$/.test(f) && !HORS.has(f)).sort().map(f => ({ f, env: {} }));
// Tests qui ont aussi une version « dans l'app » (PAGE=1).
for (const f of ["mesure.js", "corps.js", "couleur.js", "silhouette.js"]) if (liste.some(x => x.f === f)) liste.push({ f, env: { PAGE: "1" } });
liste.push({ f: "smoke.js", env: { EXTRA: join(ICI, "crawl.js") } });
// PART=2/4 : seulement la 2e part sur 4 (GitHub lance les 4 parts sur 4 machines en même temps).
// Répartition par durée connue (secondes, mesurées le 17/11/2026) pour que les 4 parts finissent ensemble.
const DUREE = { "zifafi.js": 223, "wedding.js": 169, "ux.js": 156, "achat.js": 102, "compte.js": 102, "corps.js(PAGE)": 96, "avatar.js": 93, "accueil.js": 89, "jour.js": 78, "majlis.js": 67, "ecoute.js": 60, "features.js": 54, "golfe.js": 49, "verif.js": 43, "events.js": 38, "salut.js": 37, "contact.js": 30, "camera.js": 29, "smoke.js(crawl)": 60, "smoke.js": 27 };
const cle = t => t.f + (t.env.PAGE ? "(PAGE)" : t.env.EXTRA ? "(crawl)" : "");
if (process.env.PART) {
  const [k, n] = process.env.PART.split("/").map(Number);
  const parts = Array.from({ length: n }, () => ({ s: 0, l: [] }));
  for (const t of [...liste].sort((x, y) => (DUREE[cle(y)] || 15) - (DUREE[cle(x)] || 15))) {
    const p = parts.reduce((m, x) => x.s < m.s ? x : m); p.s += DUREE[cle(t)] || 15; p.l.push(t);
  }
  liste = parts[k - 1].l;
}
if (process.env.SEUL) { const s = process.env.SEUL.split(",").map(x => x.trim().replace(/\.m?js$/, "")); liste = liste.filter(x => s.includes(x.f.replace(/\.m?js$/, ""))); }

const JOBS = Math.max(1, Number(process.env.JOBS) || 3);
const nom = t => t.f + (t.env.PAGE ? " (PAGE=1)" : t.env.EXTRA ? " (crawl)" : "");
if (process.env.DRY) { console.log(liste.map(nom).join("\n")); process.exit(0); }
const lancer = t => new Promise(res => {
  const debut = Date.now(); let sortie = "";
  const p = spawn(process.execPath, [join(ICI, t.f)], { cwd: join(ICI, ".."), env: { ...process.env, ...t.env } });
  const tue = setTimeout(() => { sortie += "\n(arrêté : plus de 6 minutes)"; p.kill("SIGKILL"); }, 6 * 60e3);
  p.stdout.on("data", d => sortie += d); p.stderr.on("data", d => sortie += d);
  p.on("close", code => { clearTimeout(tue); res({ ok: code === 0, sortie, s: Math.round((Date.now() - debut) / 1000) }); });
});

const echecs = [];
let i = 0;
async function ouvrier() {
  while (i < liste.length) {
    const t = liste[i++];
    let r = await lancer(t);
    // Un seul nouvel essai : quelques tests de largeur d'écran sont parfois instables (voir CLAUDE.md, photo.js).
    if (!r.ok) { const r2 = await lancer(t); if (r2.ok) { console.log(`⚠ ${nom(t)} : réussi au 2e essai`); r = r2; } }
    console.log(`${r.ok ? "✓" : "✗"} ${nom(t)} (${r.s} s)`);
    if (!r.ok) echecs.push({ t, sortie: r.sortie });
  }
}
await Promise.all(Array.from({ length: JOBS }, ouvrier));
for (const e of echecs) {
  console.log(`\n——— ${nom(e.t)} ———`);
  console.log(e.sortie.split("\n").filter(l => /✗|Error|rror|échec/.test(l)).slice(0, 15).join("\n") || e.sortie.slice(-1500));
}
console.log(echecs.length ? `\n${echecs.length} test(s) en échec sur ${liste.length}` : `\nLes ${liste.length} tests passent`);
process.exit(echecs.length ? 1 : 0);
