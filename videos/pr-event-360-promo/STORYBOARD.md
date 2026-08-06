---
format: 1920x1080
duration: 58.357s
message: "Centralisez accréditations, journalistes et newsroom — dès 800 € HT par événement"
arc: PAS with feature-benefit progression
audience: organisateurs d'événements, attachés de presse, agences RP
mode: collaborative
music: none
voice: ElevenLabs « Koraly – Smooth and Captivating » (v3), FR
language: fr
---

## Video direction

- **palette:** canvas `#FFFFFF` → `#EEF3F9`, ink navy `#07142F` (dégradé radial vers `#1B3C6E`), soft ink `#4A5568`, accent cyan `#1598D3`, accent clair `#5CC0E8`, succès `#2FBF71`, alerte `#E24D4D`, bordure `#E0E8F1`.
- **motion:** GSAP, eases `power3.out` (et `back.out` sur les entrées ponctuelles). Chaque élément entre au moment où la voix le nomme ; le premier élément de chaque scène démarre à t=0 pour qu'aucune coupe ne laisse un fond nu.
- **montage — règle structurante :** les scènes s'enchaînent par **coupe franche**. Leurs fenêtres `data-start`/`data-duration` ne se recouvrent jamais et aucune transition n'est animée sur la timeline principale. C'est ce qui rend impossible la superposition de deux textes (défaut de la version précédente, qui utilisait des crossfades).
- **durées des calques :** dans chaque scène, `#root`, le fond et le `stage` portent **exactement** la même durée. Un calque plus court que sa scène produirait un écran noir en fin de plan.
- **composition :** contenu centré verticalement (`justify-content:center`) et pleine largeur utile (marges 110–130 px). Pas de capture d'écran en fond derrière du texte ; le produit réel est montré dans un panneau dédié (frame 3).
- **negative list:** pas de dégradé violet « IA », pas de faux chrome de navigateur, pas de noir pur, pas de capture de site en filigrane sous du texte, aucun élément décoratif traversant un texte.

## Timeline

| # | Scène | Début | Durée | Fond | Fichier |
|---|-------|-------|-------|------|---------|
| 1 | Hook | 0 | 9.11 | navy | `compositions/frames/01-hook.html` |
| 2 | Douleur | 9.11 | 6.27 | clair | `compositions/frames/02-pain.html` |
| 3 | Produit | 15.38 | 8.38 | navy | `compositions/frames/03-intro.html` |
| 4 | Cycle RP | 23.76 | 8.60 | clair | `compositions/frames/04-cycle.html` |
| 5 | Espaces | 32.36 | 8.26 | clair | `compositions/frames/05-spaces.html` |
| 6 | Tarifs | 40.62 | 9.08 | clair | `compositions/frames/06-pricing.html` |
| 7 | CTA | 49.70 | 8.657 | navy | `compositions/frames/07-cta.html` |

Les bornes viennent de la transcription mot à mot de la voix off
(`media/voice/transcript.json`, Whisper large-v3), pas d'une estimation.

## Frame 1 — Hook (navy)

- voix : « Toujours dix onglets pour un seul festival ? Tableur, mail, badge… et l'imprévu le jour J. »
- eyebrow + titre en deux lignes, centrés ; `dix onglets` en cyan.
- chips **Tableurs / Mails / Badges** à 3.65 / 4.06 / 4.84 — calées sur l'énumération.
- ligne de chute « Et l'imprévu le jour J. » à 5.75, en rose pâle.

## Frame 2 — Douleur (clair)

- voix : « Les accréditations se perdent. Les demandes d'interview s'éparpillent. La newsroom ? Dans un autre dossier. »
- trois lignes numérotées (01/02/03), filet rouge à gauche, entrée par la gauche.
- apparitions à 0.10 / 1.66 / 4.02.

## Frame 3 — Produit (navy) — démo de l'app

- voix : « PR Event 360, une seule plateforme pour vos relations presse événementielles. De l'invitation à la retombée. »
- colonne gauche : logo (0), accroche (2.57), ligne accent « De l'invitation à la retombée » (5.96).
- colonne droite : **capture réelle du tableau de bord** (`assets/ui-dashboard.png`, recadrée depuis `capture/screenshots/scroll-000.png`) dans un panneau arrondi, entrée à 0.85. Zone dédiée : aucun texte par-dessus.

## Frame 4 — Cycle RP (clair)

- voix : « Invitez ! Validez les accréditations, traitez les demandes d'interview, organisez les conférences, générez les badges et collectez la revue de presse. »
- frise horizontale de 6 étapes, rail qui se remplit en continu (6.6 s).
- étapes à 0.30 / 0.98 / 2.28 / 4.01 / 5.52 / 6.78 — une par verbe prononcé.

## Frame 5 — Espaces (clair)

- voix : « Chaque journaliste a son espace sécurisé. Chaque contact production voit seulement ce qui le concerne. Vos équipes ? Jamais perdues. »
- trois cartes de hauteur égale : Journaliste / Production / Équipe RP.
- apparitions à 0.15 / 2.46 / 6.06.

## Frame 6 — Tarifs (clair)

- voix : « 800 euros hors taxe par événement, 20 gigas de stockage, Google Drive inclus. Pack 3 pour l'année ou offre Agence pour dix événements. »
- carte Événement à 0.15, pastille « 20 Go · Google Drive inclus » à 2.45, Pack 3 (mis en avant, badge « Recommandé ») à 4.90, Agence à 6.25.
- l'ordre suit la voix : la pastille stockage arrive **entre** la première et la deuxième carte.

## Frame 7 — CTA (navy)

- voix : « Conforme RGPD, support en français, sans installation. Demandez un accès — et pilotez votre prochain événement à 360 degrés. »
- chips à 0 / 0.55 / 2.25, titre à 4.08, bouton **Demander un accès** à 4.55 (même libellé que le CTA réel de la landing), URL à 5.60, logo à 6.30.
- léger rebond sur `360°` à 7.20, quand la voix le prononce.
