/* My Style — « Your Style Twin » (v139, niveau 1 : la fiche de données).
   Le jumeau de style = la copie de style de la cliente dans l'app. Il ne crée AUCUNE nouvelle donnée :
   il rassemble ce qui existe déjà (analyses S.res, infos S.info, préférences PF, garde-robe GR)
   et montre ce qui manque, avec un bouton pour le compléter. Rien n'est deviné, tout reste sur le téléphone.
   Aura le connaît déjà : PROFIL() envoie ces mêmes données à l'agent.
   Niveaux suivants (plus tard) : 2) avatar cartoon, 3) avatar réaliste + essayage virtuel.
   Chargé APRÈS aura-profile.js et zifafi*.js (utilise S, P, ok, season, SEASONS, PF, GR, grCount, esc, cap…). */

// Les 8 parties du jumeau : [clé, titre, fait ?, valeur affichée, action]
function twinParts() {
  const v = ok("visage"), b = ok("corps"), c = season(), i = S.info || {};
  const pf = typeof PF !== "undefined" ? PF : { aime: [], evite: [], coupes: [], occasions: [], pudeur: "" };
  const g = typeof grCount === "function" ? grCount() : { tot: 0, hauts: 0, bas: 0 };
  const mesTxt = [i.taille ? i.taille + " cm" : "", i.tvet || ""].filter(Boolean).join(" · ");
  const gouts = [...(i.styles || []), ...pf.coupes].slice(0, 5);
  const act = (done, view, alt) => done ? view : alt;
  return [
    { k: "corps", t: "Ta silhouette", ok: !!b, val: b ? (b.kibbe ? b.forme + " · " + b.kibbe : b.forme) : "", go: act(!!b, 'data-view="r_corps"', 'data-mod="corps"') },
    { k: "mesures", t: "Ta taille et tes mesures", ok: !!(i.taille && i.tvet), val: mesTxt, go: 'data-go="infos"' },
    { k: "visage", t: "Ton visage", ok: !!v, val: v ? v.forme : "", go: act(!!v, 'data-view="r_visage"', 'data-mod="visage"') },
    { k: "teint", t: "Ton teint et tes couleurs", ok: !!c, val: c || "", sw: c && SEASONS[c] ? SEASONS[c].c.slice(0, 5).map(x => x[0]) : null, go: act(!!c, 'data-view="r_couleurs"', 'data-mod="couleurs"') },
    { k: "gouts", t: "Tes goûts", ok: !!(gouts.length || pf.aime.length), val: gouts.join(", "), like: pf.aime.slice(0, 6), go: 'data-go="prefs"' },
    { k: "budget", t: "Ton budget", ok: !!i.budget, val: i.budget || "", go: 'data-go="infos"' },
    { k: "occasions", t: "Tes occasions", ok: !!pf.occasions.length, val: pf.occasions.slice(0, 5).join(", "), go: 'data-go="prefs"' },
    { k: "garde", t: "Ta garde-robe", ok: g.tot >= (typeof GR_MIN !== "undefined" ? GR_MIN : 7), val: g.tot ? g.tot + " article" + (g.tot > 1 ? "s" : "") : "", go: 'data-go="garde"' }
  ];
}
const twinPct = () => { const p = twinParts(); return Math.round(p.filter(x => x.ok).length / p.length * 100); };

const TW_IC = {
  corps: '<circle cx="12" cy="4.5" r="2"/><path d="M8 9h8l-2 6 2 6M8 9l2 6-2 6M12 9v6"/>',
  mesures: '<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6 8v3M9.5 8v4M13 8v3M16.5 8v4"/>',
  visage: '<ellipse cx="12" cy="12" rx="6.5" ry="8.5"/><path d="M9.5 10.5h.01M14.5 10.5h.01M10 15c1.2.8 2.8.8 4 0"/>',
  teint: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-2 0-3s3 0 4.5-1.5C20 13 21 11 21 10c0-4-4-7-9-7z"/><path d="M7.5 11h.01M10 7.5h.01M15 7.5h.01"/>',
  gouts: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  budget: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  occasions: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  garde: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 3v18M9.5 11v2M14.5 11v2"/>'
};
const twinRing = (pct, r) => { const C = 2 * Math.PI * r; return `<svg viewBox="0 0 ${2 * r + 8} ${2 * r + 8}" aria-hidden="true"><circle cx="${r + 4}" cy="${r + 4}" r="${r}" class="tw-rb"/><circle cx="${r + 4}" cy="${r + 4}" r="${r}" class="tw-rf" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${r + 4} ${r + 4})"/></svg>`; };

// Carte de l'accueil (sous Outfit check)
function twinCard() {
  const p = twinParts(), pct = twinPct(), n = p.filter(x => x.ok).length;
  return `<button class="tw-card" data-view="twin" aria-label="Your Style Twin">
  <span class="tw-ring">${twinRing(pct, 22)}<b>${pct}%</b></span>
  <span class="tw-ct"><small>Ta copie de style</small><b data-noi18n>Your Style Twin</b><em>${pct === 100 ? "Ton jumeau est complet" : `Complet à ${pct} %`}</em></span>
  <span class="hx-chev" aria-hidden="true">›</span></button>`;
}

P.twin = () => {
  const p = twinParts(), pct = twinPct(), n = p.filter(x => x.ok).length;
  const rows = p.map(x => `<button class="tw-row ${x.ok ? "ok" : ""}" ${x.go}>
   <span class="tw-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${TW_IC[x.k]}</svg></span>
   <span class="tw-rt"><b>${x.t}</b>${x.val ? `<em>${esc(cap(x.val))}</em>` : `<em class="tw-todo">À compléter</em>`}
   ${x.sw ? `<span class="tw-sw">${x.sw.map(h => `<i style="background:${h}"></i>`).join("")}</span>` : ""}
   ${x.like && x.like.length ? `<span class="tw-sw">${x.like.map(nm => { const f = (typeof PF_COULEURS !== "undefined" ? PF_COULEURS : []).find(z => z[0] === nm); return f ? `<i style="background:${f[1]}" title="${esc(nm)}"></i>` : ""; }).join("")}</span>` : ""}</span>
   <span class="tw-st" aria-hidden="true">${x.ok ? "✓" : "+"}</span></button>`).join("");
  const miss = p.find(x => !x.ok);
  return {
    back: true,
    html: `<p class="step">Ta copie de style</p><h1 data-noi18n>Your Style Twin</h1>
  <p class="sub">Ton jumeau de style garde ta silhouette, ton teint, tes goûts et chaque pièce de ta garde-robe. Plus il est complet, plus Aura te conseille juste.</p>
  <div class="tw-hero"><span class="tw-ring big">${twinRing(pct, 34)}<b>${pct}%</b></span>
   <span><b>${pct === 100 ? "Ton jumeau est complet" : `Complet à ${pct} %`}</b><small>${n} sur ${p.length}</small></span></div>
  <div class="tw-list">${rows}</div>
  <p class="hint">Tout reste sur ton téléphone. Tu peux tout modifier ou effacer dans ton profil.</p>`,
    say: pct === 100 ? "Voici ton Style Twin. Il est complet : je te connais bien maintenant." : "Voici ton Style Twin. Il est complet à " + pct + " %. Complète-le pour que je te conseille encore plus juste.",
    foot: miss ? `<button class="btn" ${miss.go}>Compléter : ${miss.t.toLowerCase()}</button>` : `<button class="btn" data-view="chat">Parler à Aura</button>`
  };
};
if (typeof DOCK_OF !== "undefined") DOCK_OF.twin = "home";

(function twinCSS() {
  const st = document.createElement("style");
  st.textContent = `
.tw-card{display:flex;align-items:center;gap:14px;width:100%;margin-top:12px;padding:14px 16px;border:0;border-radius:16px;background:var(--surface);color:var(--ink);text-align:start;cursor:pointer;box-shadow:0 2px 10px rgba(140,109,53,.12);transition:transform .15s}
.tw-card:active{transform:scale(.98)}
.tw-ring{position:relative;flex:none;display:grid;place-items:center;width:52px;height:52px}
.tw-ring svg{position:absolute;inset:0;width:100%;height:100%}
.tw-ring b{position:relative;font-size:.8rem;color:var(--accent)}
.tw-ring.big{width:80px;height:80px}.tw-ring.big b{font-size:1.15rem}
.tw-rb{fill:none;stroke:var(--line);stroke-width:5}
.tw-rf{fill:none;stroke:var(--accent);stroke-width:5;stroke-linecap:round}
.tw-ct{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.tw-ct small{font-size:.72rem;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.tw-ct b{font-size:1.05rem}.tw-ct em{font-style:normal;font-size:.85rem;color:var(--accent)}
.tw-hero{display:flex;align-items:center;gap:16px;margin:18px 0 14px;padding:16px;border-radius:16px;background:var(--surface);box-shadow:0 2px 10px rgba(140,109,53,.12)}
.tw-hero>span:last-child{display:flex;flex-direction:column;gap:4px}
.tw-hero small{color:var(--muted)}
.tw-list{display:flex;flex-direction:column;gap:8px}
.tw-row{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);text-align:start;cursor:pointer}
.tw-ic{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--soft)}
.tw-ic svg{width:20px;height:20px;fill:none;stroke:var(--accent);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.tw-rt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.tw-rt b{font-size:.95rem}.tw-rt em{font-style:normal;font-size:.85rem;color:var(--ink)}
.tw-rt em.tw-todo{color:var(--muted)}
.tw-sw{display:flex;gap:4px;margin-top:2px}.tw-sw i{width:16px;height:16px;border-radius:50%;border:1px solid rgba(0,0,0,.08)}
.tw-st{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:.85rem;background:var(--soft);color:var(--muted)}
.tw-row.ok .tw-st{background:var(--accent);color:var(--on)}`;
  document.head.appendChild(st);
})();
try { if (S.page === "home" || S.page === "twin") render(false); } catch (e) {}
