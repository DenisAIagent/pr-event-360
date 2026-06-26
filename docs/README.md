# Documentation technique — PR Event 360

Plateforme de gestion des accréditations presse en festival : accréditations, demandes
d'interviews et de reportages, newsroom, communications, gestion d'équipe.

> L'**événement** est l'entité racine. Isolation totale entre festivals : chaque donnée
> (journalistes, demandes, médias, communiqués…) appartient à un événement.

## Sommaire

| Document | Contenu |
|---|---|
| [architecture.md](architecture.md) | Monorepo, stack, découpage en couches, cycle de vie d'une requête |
| [data-model.md](data-model.md) | Tables PostgreSQL, relations, migrations |
| [api.md](api.md) | Référence des endpoints REST (back-office + surfaces publiques) |
| [business-logic.md](business-logic.md) | Score de priorité, quotas, liste d'attente, notifications, parcours journaliste |
| [roles-permissions.md](roles-permissions.md) | Rôles, appartenance aux événements, contrôle d'accès |
| [security-rgpd.md](security-rgpd.md) | Authentification, secrets chiffrés, RGPD, en-têtes, rate limiting |
| [deployment.md](deployment.md) | Variables d'environnement, build, migrations, déploiement Railway |
| [features.md](features.md) | Tour des surfaces (formulaire public, espace journaliste, newsroom, back-office…) |

## Démarrage rapide

```bash
cp .env.example .env        # variables d'environnement (jamais committées)
npm install                 # 3 workspaces : packages/core, server, client
npm run db:up               # PostgreSQL local (docker compose) — ou Postgres existant
npm run migrate:up          # applique le schéma
npm test                    # tests du moteur métier (packages/core)
```

Lancer en développement :

```bash
npm --workspace server run dev    # API sur http://localhost:4000
npm --workspace client run dev    # Front sur http://localhost:5173
```

## Vue d'ensemble

```
┌──────────────────────┐      ┌──────────────────────┐      ┌────────────────┐
│  Client (React/Vite) │ ───▶ │  Server (Express)    │ ───▶ │  PostgreSQL    │
│  - formulaires public│ REST │  - routes /api/*     │  SQL │                │
│  - back-office /admin │◀──── │  - services / repos  │◀──── │                │
└──────────────────────┘      │  - moteur @core      │      └────────────────┘
                              └──────────┬───────────┘
                                         │ I/O externes (mode « live »)
                                         ▼
                        Brevo (email/SMS) · Twilio (SMS) · Cloudinary (médias)
```
