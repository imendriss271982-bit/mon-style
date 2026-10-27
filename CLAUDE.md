# My Style — notes pour Claude Code

Application de personal styling (PWA statique) avec Aura, styliste IA vocale. Langues : français (source), anglais, arabe qatari. Palette officielle : fond #FAF7F2, bordeaux #702B3A, fond secondaire #F0E9E0, texte #292421, texte secondaire #77716B, blanc.

## Structure
- `index.html` : toute l'app (CSS + script principal). Pages = objet `P` (`P.home`, `P.garde`, `P.profil`…), navigation `go(page)` / `back()` / `home()`, rendu `render()`. Barre du bas (v102) : Accueil `home`, Garde-robe `garde` (articles seulement), Aura `chat`, Boutique `boutique`, Profil `profil` (v105 : Boutique remplace Mes tenues ; Mes tenues `tenues` = `P.garde(1)` s'ouvre depuis la garde-robe, l'accueil et Aura). Beauté et Nouveautés s'ouvrent depuis l'accueil ; `DOCK_OF` dit quel onglet reste allumé sur une page secondaire. Un seul écouteur de clic principal (`data-*` sur les boutons).
- `aura-profile.js` : préférences de style choisies par la cliente (`PF`, clé `monstyle_pref`), objectifs, confort, avis 👍/👎, page `P.prefs`, `pfCtx()` (contexte pour Aura), `pfRules()` (règles strictes des prompts), `pfFit()` (classement boutique). Chargé après le script principal.
- `aura-methode.js` : la méthode de stylisme d'Imen (`REF`, une rubrique par ligne, titre en majuscules). C'est ici qu'on met à jour la méthode avec ses cours, sans toucher à `index.html`. Chargé avant le script principal.
- `aura-mesure.js` (v106) : mesure précise du visage. MediaPipe Face Landmarker (chargé depuis jsDelivr + modèle Google, sur le téléphone) place 478 points ; on mesure A (longueur, naissance des cheveux estimée par les tiers du visage), B (front), C (pommettes), D (mâchoire) et l'angularité, puis `classer()` applique les règles du cours d'Imen (seuils dans `SEUILS`). `prepVisage()`/`fixVisage()` dans `index.html` : si la mesure réussit, Gemini reçoit la forme imposée et n'écrit que les conseils ; visage tourné → photo refusée ; mesure impossible (réseau) → ancienne analyse Gemini. `classer()` est testable dans Node.
- ZIFAFI — My Wedding (espace mariée, v103) :
  - `zifafi-methode.js` : choix du questionnaire mariée (`ZF`), nettoyage (`zfCleanProf`), moteur à règles simples `zfReco(prof,{rej,alt})` → 3 directions distinctes expliquées (ou état « decouverte »), `zfLookOpts` (bijoux, voile, chaussures, coiffure, maquillage, bouquet selon la robe), harmonies `ZF_PALS`. Aucune dépendance au DOM, testable dans Node. La catégorie de silhouette ne sert qu'à départager. Chargé avant le script principal.
  - `zifafi.js` : pages `P.zf` (tableau de bord), `zf_prof` (profil 6 étapes), `zf_robe`, `zf_cmp`, `zf_col`, `zf_look`, `zf_looks`, `zf_insp`, `zf_acad`, `zf_les` ; illustrations SVG originales (`zfDressSVG`, `zfFig`) ; contexte d'Aura `S.zfCtx` (« quotidien » / « mariee », auto selon la page) ; `zfCtx()` ajouté en tête de `PROFIL()` en mode mariée ; `zfHomeCards()` (2 cartes de l'accueil), `zfChatCtx()`/`zfChatSug()` (page Aura). Chargé après `aura-profile.js`.
  - `zifafi.css` : styles de l'espace mariée. `zifafi-i18n.js` : traductions mariée (`ZF_I18N`, même format), ajoutées à `I18N_D` par `i18n.js`.
- `i18n.js` : traductions `[fr, en, ar]`. Toute nouvelle phrase affichée doit y être ajoutée (sinon elle reste en français).
- `worker/worker.js` : Cloudflare Worker (`mon-style.imendriss271982.workers.dev`) qui appelle Gemini (analyses, tenues, make-up) et ElevenLabs (voix). Les clés sont des variables Cloudflare (`GEMINI_KEY`, `ELEVEN_KEY`, `VOICE_ID`, `MODEL`, `IMAGE_MODEL`) — jamais dans le dépôt.
- Assets : `aura-*.webp/jpg`, `videos/`, `sons/`.

## Données (localStorage, sur le téléphone de la cliente)
`monstyle` (profil, résultats), `monstyle_gr` (garde-robe `{items, looks, saved}`), `monstyle_pref` (préférences), `monstyle_plan`, `monstyle_mk`, `monstyle_zf` (ZIFAFI : `{prof, saved, rej, pal, looks, les, prac, insN}`). Photos d'inspiration ZIFAFI : IndexedDB `monstyle_zf_img` (réduites à 1024 px, jamais envoyées). Toujours charger avec validation (données abîmées ignorées, jamais bloquantes). Ne jamais migrer de façon destructive. « Effacer toutes mes données » vide aussi `monstyle_pref` et ZIFAFI (`zfWipe()`).

## Règles importantes
- Ne rien inventer sur la cliente : seules ses réponses explicites vont dans le profil.
- Les tenues n'utilisent que les vraies pièces (ids vérifiés) ; un achat proposé est « facultatif ». Pas de marque ni de prix inventés.
- `PROFIL()` résume analyses + infos + `pfCtx()` + `grBrief()` ; c'est la variable `profil` envoyée à l'agent ElevenLabs (voix et chat).
- `GRATUIT=true` (phase de test) : tout est illimité. Le remettre à `false` réactive les formules.
- À chaque publication : augmenter `const VERSION` dans `index.html` (mise à jour auto des téléphones) et le `?v=` de `i18n.js` / `aura-profile.js` / `aura-methode.js` / `zifafi*.js` / `zifafi.css` si modifiés.
- Aucune clé API dans le front, les fichiers publics ou l'historique Git.

## Développement et tests
- Lancer en local : `python3 -m http.server 8765` dans le dossier, puis ouvrir http://localhost:8765/ (l'IA ne répond qu'en ligne : le Worker n'accepte que l'origine GitHub Pages).
- Tests (Playwright, IA simulée) : `node tests/smoke.js` (toutes les pages, erreurs JS) ; `EXTRA=$PWD/tests/crawl.js node tests/smoke.js` (clique chaque bouton) ; `node tests/features.js` (préférences, garde-robe, tenues, semaine, données abîmées) ; `node tests/ux.js` (barre du bas, accueil, arabe RTL, largeurs 320 à 1280 px) ; `node tests/zifafi.js` (moteur, profil, robes, couleurs, looks, inspiration, académie, Aura mariée, langues, largeurs) ; `node tests/mesure.js` (règles de forme du visage) et `PAGE=1 node tests/mesure.js` (branchement dans l'app).
- Pas d'étape de build.

## Déploiement
Push sur `main` → workflow `.github/workflows/pages.yml` publie le dossier sur https://imendriss271982-bit.github.io/mon-style/. Le Worker se déploie à part sur Cloudflare (`wrangler.jsonc`). Il limite les demandes par IP (60 analyses, 6 make-up, 60 voix par 10 min, par instance).
