# PR Event 360

**Votre orchestrateur de relations presse.** Plateforme de gestion des accréditations presse en festival : accréditations, interviews, captations photo/vidéo, newsroom et revue de presse. L'**événement** est l'entité racine — isolation totale entre festivals.

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

## Capacités (modules livrés)

0. **Scaffold + schéma PostgreSQL** ✅
1. **Moteur métier pur + tests** ✅ — génération de créneaux, score de priorité, quotas, promotion
2. **API REST** ✅ — surfaces publiques tokenisées + back-office JWT (2FA TOTP optionnelle)
3. **Formulaires publics multilingues** ✅ — accréditation, espace journaliste, newsroom (FR/EN/PT/ES)
4. **Back-office** ✅ — coquille rail + recherche globale, file en grille triée par score, KPIs,
   configuration guidée, lineup & créneaux, génération de planning, médias/newsroom/communications, équipe
5. **Notifications** ✅ — simulation puis branchement Brevo/Twilio ; récapitulatifs périodiques
6. **Comptes journalistes** ✅ — accès par lien magique **ou** email + mot de passe (par événement),
   mot de passe oublié, planning personnel, ressources presse
7. **Multi-locataire** ✅ — chaque client = une **organisation** isolée (events/équipe/données),
   inscription **payante** (Stripe) ou sur invitation, super-admin plateforme. White-label : domaine perso + sous-domaine par event
8. **Newsroom SEO** ✅ — communiqués à URL dédiée, balises meta/Open Graph rendues serveur, `sitemap.xml`/`robots.txt`, image de couverture, export PDF
9. **Revue de presse** ✅ — collecte automatique des retombées après l'événement (délai J+3/8/30 choisi à l'inscription), dépôt liens/médias avec autorisation, classement par média + suivi des envois
10. **Avis produit** ✅ — notation de l'app en back-office + modération super-admin + témoignages dynamiques sur la landing

> Détails et endpoints : [`docs/`](docs/README.md). Notifications : nom d'expéditeur = « *{Événement}* Press Team » ; langue détectée du navigateur.

## Sécurité & RGPD

- Identifiants des services externes **uniquement** en variables d'environnement (`.env`, jamais committé).
- Accès au formulaire de demandes par **token unique non devinable** par journaliste.
- Consentement RGPD explicite obligatoire (contrainte en base) ; droit à l'effacement par suppression en cascade ; purge possible à la clôture de l'événement.
