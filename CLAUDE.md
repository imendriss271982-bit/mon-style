# My Style — notes pour Claude Code

Application de personal styling (PWA statique) avec Aura, styliste IA vocale. Langues : français (source), anglais, arabe qatari.

## Structure
- `index.html` : toute l'app (CSS + script principal). Pages = objet `P` (`P.home`, `P.garde`, `P.profil`…), navigation `go(page)` / `back()` / `home()`, rendu `render()`. Un seul écouteur de clic principal (`data-*` sur les boutons).
- `aura-profile.js` : préférences de style choisies par la cliente (`PF`, clé `monstyle_pref`), avis 👍/👎, page `P.prefs`, `pfCtx()` (contexte pour Aura), `pfRules()` (règles strictes des prompts), `pfFit()` (classement boutique). Chargé après le script principal.
- `i18n.js` : traductions `[fr, en, ar]`. Toute nouvelle phrase affichée doit y être ajoutée (sinon elle reste en français).
- `worker/worker.js` : Cloudflare Worker (`mon-style.imendriss271982.workers.dev`) qui appelle Gemini (analyses, tenues, make-up) et ElevenLabs (voix). Les clés sont des variables Cloudflare (`GEMINI_KEY`, `ELEVEN_KEY`, `VOICE_ID`, `MODEL`, `IMAGE_MODEL`) — jamais dans le dépôt.
- Assets : `aura-*.webp/jpg`, `videos/`, `sons/`.

## Données (localStorage, sur le téléphone de la cliente)
`monstyle` (profil, résultats), `monstyle_gr` (garde-robe `{items, looks, saved}`), `monstyle_pref` (préférences), `monstyle_plan`, `monstyle_mk`. Toujours charger avec validation (données abîmées ignorées, jamais bloquantes). Ne jamais migrer de façon destructive. « Effacer toutes mes données » vide aussi `monstyle_pref`.

## Règles importantes
- Ne rien inventer sur la cliente : seules ses réponses explicites vont dans le profil.
- Les tenues n'utilisent que les vraies pièces (ids vérifiés) ; un achat proposé est « facultatif ». Pas de marque ni de prix inventés.
- `PROFIL()` résume analyses + infos + `pfCtx()` + `grBrief()` ; c'est la variable `profil` envoyée à l'agent ElevenLabs (voix et chat).
- `GRATUIT=true` (phase de test) : tout est illimité. Le remettre à `false` réactive les formules.
- À chaque publication : augmenter `const VERSION` dans `index.html` (mise à jour auto des téléphones) et le `?v=` de `i18n.js` / `aura-profile.js` si modifiés.
- Aucune clé API dans le front, les fichiers publics ou l'historique Git.

## Développement et tests
- Lancer en local : `python3 -m http.server 8765` dans le dossier, puis ouvrir http://localhost:8765/ (l'IA ne répond qu'en ligne : le Worker n'accepte que l'origine GitHub Pages).
- Tests (Playwright, IA simulée) : `node tests/smoke.js` (toutes les pages, erreurs JS) ; `EXTRA=$PWD/tests/crawl.js node tests/smoke.js` (clique chaque bouton) ; `node tests/features.js` (préférences, garde-robe, tenues, semaine, données abîmées).
- Pas d'étape de build.

## Déploiement
Push sur `main` → workflow `.github/workflows/pages.yml` publie le dossier sur https://imendriss271982-bit.github.io/mon-style/. Le Worker se déploie à part sur Cloudflare (`wrangler.jsonc`).
