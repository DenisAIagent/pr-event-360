# Documentation technique — PR Event 360

État de la documentation : **29 juillet 2026**. Elle décrit la version actuellement déployée, incluant les profils d’événement, les conférences de presse, la pagination des grandes listes, le store de limitation de débit Redis optionnel et les métriques Prometheus.

PR Event 360 gère les relations presse des festivals et concerts, mais aussi des salons, foires, conférences, séminaires, lancements et événements corporate. Le profil choisi à la création adapte les libellés visibles tout en conservant un modèle technique commun.

## Sommaire

| Document | Contenu |
|---|---|
| [architecture.md](architecture.md) | Monorepo, stack, couches et flux d’exécution |
| [features.md](features.md) | Parcours et fonctionnalités par surface |
| [business-logic.md](business-logic.md) | Profils d’événement, quotas, planning et conférences |
| [data-model.md](data-model.md) | Tables, relations, enums et migrations |
| [api.md](api.md) | Référence des endpoints REST |
| [roles-permissions.md](roles-permissions.md) | Rôles, permissions et isolation des tenants |
| [security-rgpd.md](security-rgpd.md) | Authentification, sessions, uploads et RGPD |
| [deployment.md](deployment.md) | Configuration, build, Railway, sauvegarde et rollback |
| [custom-domains.md](custom-domains.md) | Sous-domaines et domaines personnalisés |
| [commercial-offers.md](commercial-offers.md) | Offres, crédits événement, Stripe Price IDs |
| [rgpd/](rgpd/) | Registre, DPA, procédures, AIPD et transferts |
| [security-audit-2026-08-05.md](security-audit-2026-08-05.md) | Audit sécurité (2026-08-05) |

Documents complémentaires :

- [PRD](../PR-Event-360_PRD.md)
- [README du dépôt](../README.md)
- [Design system](../PR%20Event%20360%20Design%20System/readme.md)

## Démarrage rapide

```bash
cp .env.example .env
npm install
npm run db:up
npm run migrate:up
npm --workspace server run dev
```

Dans un second terminal :

```bash
npm --workspace client run dev
```

## Architecture résumée

```text
React/Vite
  ├─ back-office ── cookie HttpOnly + CSRF ──┐
  └─ surfaces publiques ─ lien/token ────────┤
                                              ▼
                                       Express /api
                                   routes → services → SQL
                                              │
                           @pr-event-360/core │ PostgreSQL
                                              ▼
                     Brevo · Twilio · Cloudinary · Stripe
```

## Sources de vérité

En cas d’écart :

1. les migrations de `server/migrations` définissent le schéma ;
2. les schémas Zod des routes définissent le contrat HTTP ;
3. les services définissent les règles transactionnelles ;
4. `packages/core` définit les décisions métier pures ;
5. cette documentation explique le comportement attendu.

## Commandes de contrôle

```bash
npm test
npm --workspace server run test
npm --workspace server run typecheck
npm --workspace client run typecheck
npm run build
```
