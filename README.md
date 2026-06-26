# PR Event 360

Plateforme de gestion des accréditations presse en festival : accréditations, interviews, captations photo/vidéo. L'**événement** est l'entité racine — isolation totale entre festivals.

📚 **Documentation technique complète : [`docs/`](docs/README.md)** — architecture, modèle de données, API, logique métier, rôles, sécurité/RGPD, déploiement, fonctionnalités.

## Stack

| Couche | Choix |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Node.js + Express + TypeScript (REST) |
| Base de données | PostgreSQL (SQL brut + `node-pg-migrate`) |
| Auth back-office | JWT + hash argon2 |
| Email / SMS | Brevo / Twilio — **démarrage en simulation** |
| Hébergement cible | Railway |

Monorepo npm workspaces :

- `packages/core` — moteur métier **pur** (créneaux, score, quotas, liste d'attente), testable isolément, sans dépendance DB/HTTP.
- `server` — API REST, repositories, services, migrations.
- `client` — formulaires publics multilingues (FR/EN/PT/ES) + back-office.

## Prérequis

- Node.js ≥ 20
- Docker (PostgreSQL local) — ou une instance PostgreSQL accessible

## Démarrage

```bash
# 1. Variables d'environnement (jamais committées)
cp .env.example .env

# 2. Dépendances (résout les 3 workspaces)
npm install

# 3. Base de données locale
npm run db:up            # docker compose up -d

# 4. Migrations
npm run migrate:up       # applique le schéma
npm run migrate:down     # revient en arrière d'une migration (réversibilité)

# 5. Tests du moteur métier (Module 1)
npm test
```

## Feuille de route (par module, validée avant passage au suivant)

0. **Scaffold + schéma PostgreSQL** ✅ (ce dépôt)
1. Moteur métier pur + tests (génération de créneaux, score, quotas, promotion)
2. API REST (routes publiques tokenisées + back-office JWT)
3. Formulaires publics multilingues
4. Back-office (file triée par score, filtres, KPIs, config, lineup)
5. Notifications en simulation, puis branchement Brevo/Twilio

## Sécurité & RGPD

- Identifiants des services externes **uniquement** en variables d'environnement (`.env`, jamais committé).
- Accès au formulaire de demandes par **token unique non devinable** par journaliste.
- Consentement RGPD explicite obligatoire (contrainte en base) ; droit à l'effacement par suppression en cascade ; purge possible à la clôture de l'événement.
