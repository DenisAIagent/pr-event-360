---
name: pr-event-360-design
description: Use this skill to generate well-branded interfaces and assets for PR Event 360, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

PR Event 360 is a SaaS for managing event press relations (media contacts, invitations,
follow-ups, accreditations, coverage, reporting). The identity is navy-dominant with a
digital-blue accent, generous white, Inter/Manrope type, fine-line Lucide icons, and a
360-circle + connected-dots motif. Tone: expert, clear, direct, French, action-verb-led,
no hype, no emoji.

Key files:
- `styles.css` — link this; it `@import`s all tokens and fonts.
- `tokens/` — colour, type, spacing, radius CSS custom properties (prefer the semantic aliases).
- `assets/` — logo variants (full, reversed, white, icon).
- `components/` — Button, Badge, Card, Avatar, Input, KpiCard, Tabs (read each `.prompt.md`).
- `ui_kits/app` & `ui_kits/website` — full screen recreations to copy from.
- `guidelines/*.card.html` — visual specimens for colour, type, spacing, brand.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and create
static HTML files for the user to view. If working on production code, copy assets and read the
rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or
design, ask a few questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.
