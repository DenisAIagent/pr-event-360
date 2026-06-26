# PR Event 360 — Design System

A SaaS brand and UI system for **PR Event 360**, the platform for managing press
relations around events: media contacts, invitations, follow-ups, accreditations,
media coverage and reporting — "vos relations presse événementielles, à 360°".

The identity is **navy-dominant, digital-blue accent, generous white**: professional,
structured, fluid, and tech-premium without being cold. The audience is communication
teams, PR agencies, event organisers and marketing departments.

---

## Sources

This system was assembled from the materials the user provided. You may not have access
to all of them, but they are recorded here for provenance:

- **Brand charter** — "Charte graphique · PR Event 360" (full text supplied in the brief):
  positioning, logo rules, colour palette, typography, UI style, dashboards, tone of voice.
- **Logo** — official lockup supplied as `uploads/ChatGPT Image 26 juin 2026…png`, cleaned
  and recoloured into the variants in `assets/`.
- **Attached repo (not accessible):** `https://github.com/DenisAIagent/pr-event-360` — the
  GitHub App is not installed on that org, so it returned 404. **If you have access, install
  the importer and re-attach it** to align components with the real production code.
- **Reference codebase used for product structure:** `https://github.com/Mounjago/PressPilot`
  — a sibling press-relations SaaS by the same author (different visual identity: black/green
  Poppins). Its **"RP" workspace** (Tableau de bord · Communiqués · Événements · Dossiers de
  presse · Contacts) maps directly onto PR Event 360's domain and informed the app UI kit's
  information architecture and KPI/dashboard patterns. Explore it for deeper screen reference.

---

## Content fundamentals

**Language:** French (B2B, vouvoiement implied — speak to "vos" équipes, "vos" événements).
**Voice:** expert, clear, direct, corporate, reassuring, time-saving.

- **Lead with action verbs:** Centralisez · Pilotez · Automatisez · Suivez · Mesurez ·
  Optimisez · Coordonnez. Headlines are imperative and benefit-led.
- **Casing:** Sentence case everywhere except short uppercase overlines and the brand lockup.
  Never SHOUT in body copy.
- **Numbers are the proof.** Big figures carry the message — "247 journalistes invités",
  "68 % de taux de réponse", "42 accréditations validées". Render key figures in digital blue.
- **No hype.** Avoid: Révolutionnez · Disruptez · Magique · Incroyable · "Le futur de…".
  The tone reassures professionals; it does not oversell.
- **No emoji.** Status and meaning come from badges, fine-line icons and colour — never emoji.
- **Microcopy** is short and factual: "Dernière relance il y a 2 jours", "À relancer".

Brand signatures / baselines: *Connect · Communicate · Celebrate* (institutional),
*Connecter · Informer · Rayonner* (FR), *Les RP événementielles, parfaitement orchestrées.*

---

## Visual foundations

- **Colour.** Navy `#07142F` (text, nav, premium surfaces) + digital blue `#1598D3` (accent
  only — buttons, links, key figures, the "360"). Recommended balance **60 % white/light ·
  25 % navy · 10 % blue · 5 % functional**. Functional colours (green `#2FBF71`, orange
  `#F5A623`, red `#E24D4D`) are reserved for statuses. Blue must never become a dominant fill.
- **Type.** **Inter** for product, web and documents; **Manrope** as the premium display
  alternative (used here for headings). Weights: Light 300 (large premium titles), Regular 400
  (body), Medium 500 (buttons/menus), SemiBold 600 (key titles). Body is 16–18px at 150%
  line-height in slate `#4A5568`. The logo lockup uses wide tracking (~0.18em), thin geometric
  letters — never a playful or rounded face.
- **Backgrounds.** White and very light grey `#F5F7FA`; no busy textures, no flashy gradients.
  At most a soft light-to-white wash on a hero, or concentric "360" rings on navy CTA bands.
- **Cards.** White fill, hairline `#E6ECF2` border, **very light** shadow, 16px radius, 24px
  padding. The brand prefers borders + whitespace over heavy elevation.
- **Borders & dividers.** Thin lines (`#E6ECF2` / `#D8E0EA`) reinforce structure and the
  dashboard/SaaS feel. Horizontal rules are a deliberate motif.
- **Radii.** Buttons 8–12px, cards 16px, pills 999px (badges). Soft, never bubbly.
- **Shadows.** Subtle, navy-tinted (`rgba(7,20,47,…)`). A digital-blue glow is allowed only on
  the primary CTA.
- **Motion.** Restrained and functional — 120–320ms, standard ease. Gentle fades, lifts and
  underline slides. No bounces, no infinite decorative loops.
- **Hover / press.** Hover lifts cards 2px and deepens the shadow a notch; nav items lighten.
  Buttons translate down 1px on press. Focus shows a soft digital-blue ring.
- **Imagery (when used).** Professional event photography — conferences, salons, cocktails
  presse, badges, comms teams in action. Clean, bright, lightly cool-toned; optional navy
  overlay at 20–40 %. Avoid nightlife, generic call-center, over-colourful startup stock.
- **Shape motifs.** The **360 circle** (frame key figures, cycles, workflows) and **connected
  dots** (journalists, media, guests) — used sparingly so it never reads "social network".

---

## Iconography

- **System:** [Lucide](https://lucide.dev) — fine line icons, ~1.5–1.75px stroke, lightly
  rounded corners. This exactly matches the charter's icon spec and is what the reference
  codebase (PressPilot) uses. Loaded from CDN in the kits:
  `https://unpkg.com/lucide@latest/dist/umd/lucide.min.js`.
- **Colour:** navy by default, digital blue for accent/active states. Icon tiles use a
  `#EAF7FC` blue-tint background with a blue glyph.
- **Key glyphs** (charter → Lucide): contact média `users` · invitation `mail` · relance
  `bell-ring` · accréditation `badge-check` · communiqué `file-text` · planning `calendar` ·
  reporting `bar-chart-3` · couverture média `newspaper` · dashboard `layout-dashboard` ·
  notification `bell` · export `download`.
- **No emoji, no hand-drawn SVG icons.** Use Lucide for everything; the only bespoke SVGs in
  the kits are data visualisations (line chart, donut, progress bars).

---

## Index

**Foundations (root)**
- `styles.css` — the single entry point consumers link. `@import` lines only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `fonts.css`, `base.css`.
- `assets/` — logo variants: `logo-pr-event-360.png` (full, transparent), `…-reversed.png`
  (for navy/dark), `…-white.png` (monochrome), `…-icon.png` / `…-icon-reversed.png` (the 360 mark).

**Specimen cards** (`guidelines/*.card.html`) — Colors, Type, Spacing, Brand groups.

**Components** (`components/<group>/`) — namespace `window.PREvent360DesignSystem_…`:
- `core/` — **Button**, **Badge**, **Card**, **Avatar**
- `forms/` — **Input**
- `data/` — **KpiCard**
- `navigation/` — **Tabs**

**UI kits** (`ui_kits/<product>/index.html`)
- `app/` — the PR Event 360 SaaS application: sidebar, dashboard (KPIs + charts), contacts
  presse table, événements. Interactive nav.
- `website/` — the marketing landing page: hero, KPI band, features, navy CTA, footer.

**`SKILL.md`** — makes this system usable as a downloadable Claude Skill.

---

## Using it

Consumers link one file — `styles.css` — and read components from the compiled bundle:

```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
<script>
  const { Button, Badge, Card, KpiCard, Input, Tabs, Avatar } = window.PREvent360DesignSystem_82909b;
</script>
```

Prefer the semantic CSS variables (`--text-primary`, `--surface-card`, `--accent`, …) over raw
hex so themes stay consistent.

> **Caveat — fonts:** Inter & Manrope load from Google Fonts via `tokens/fonts.css`. If you need
> an offline/self-hosted build, replace that `@import` with local `@font-face` rules and ship
> the binaries.
