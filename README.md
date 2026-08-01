# PR Event 360

**Votre orchestrateur de relations presse.** PR Event 360 centralise les accréditations, demandes d’interview et de reportage, conférences de presse, ressources médias et retombées pour les festivals, concerts, salons, foires, conférences, séminaires et événements corporate.

L’**événement** est l’entité racine. Chaque événement appartient à une organisation et ses journalistes, participants, demandes, conférences et contenus sont isolés des autres tenants.

Documentation :

- [Documentation technique](docs/README.md)
- [PRD produit](PR-Event-360_PRD.md)
- [Design system](PR%20Event%20360%20Design%20System/readme.md)

## Stack

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite 6, TypeScript |
| Backend | Node.js 20+, Express 4, TypeScript |
| Base de données | PostgreSQL, `pg`, `node-pg-migrate` |
| Authentification | Argon2, JWT en cookie HttpOnly, CSRF double-submit, TOTP |
| Services optionnels | Brevo, Twilio, Cloudinary, Stripe, Google Identity, Sentry |
| Hébergement actuel | Railway |

Le monorepo utilise les workspaces npm :

- `packages/core` : règles métier pures — profils d’événement, score, quotas, créneaux, listes d’attente et décisions d’inscription aux conférences ;
- `server` : API REST, services, repositories SQL, tâches planifiées et migrations ;
- `client` : back-office et surfaces publiques multilingues FR/EN/PT/ES.

## Démarrage local

Prérequis : Node.js 20+, npm et Docker, ou une base PostgreSQL accessible.

```bash
cp .env.example .env
npm install
npm run db:up
npm run migrate:up
```

Lancer l’API et le client dans deux terminaux :

```bash
npm --workspace server run dev
npm --workspace client run dev
```

- Client : `http://localhost:5173` par défaut, ou le port suivant si celui-ci est occupé.
- API : `http://localhost:4000`
- Santé : `GET http://localhost:4000/api/health`

## Vérifications

```bash
npm test
npm --workspace server run test
npm --workspace server run typecheck
npm --workspace client run typecheck
npm run build
```

## Capacités principales

- cinq profils d’événement : musique, salon/foire, conférence/séminaire, corporate et autre ;
- vocabulaire adapté au profil, sans casser le contrat API historique `artists`/`stages` ;
- accréditations, équipe multi-rôle, score de priorité, quotas et planning d’interviews ;
- conférences de presse créées lorsque le format est confirmé, avec inscription ouverte, sur validation ou sur invitation ;
- capacité transactionnelle, liste d’attente et promotion automatique ;
- espace journaliste par lien personnel ou email/mot de passe, newsroom, médias et revue de presse ;
- domaines dédiés, sous-domaines plateforme, branding et contenus multilingues ;
- facturation Stripe et création du compte après confirmation du paiement ;
- sécurité multi-tenant, MFA obligatoire pour les administrateurs et super-administrateurs.

## Déploiement

La production est disponible sur [pr-event-360-production-a23e.up.railway.app](https://pr-event-360-production-a23e.up.railway.app/).

La commande `npm start` attend PostgreSQL, applique les migrations, initialise l’administrateur de bootstrap si configuré, puis démarre l’API et sert le build du client.

Consulter le [guide de déploiement](docs/deployment.md) avant toute mise en production ou restauration.

## Sécurité et données personnelles

- le JWT back-office n’est pas stocké dans `localStorage` : il est placé dans `pr360_session`, cookie `HttpOnly`, `Secure` en production et `SameSite=Lax` ;
- les mutations par cookie exigent `X-CSRF-Token` ;
- la MFA TOTP est obligatoire pour les comptes `admin` et les super-admins plateforme ;
- les liens d’espace journaliste sont aléatoires, valables 7 jours, rotatifs ; échangés contre un cookie JWT `pr360_jspace` (l’URL est nettoyée) ; seul le hash SHA-256 du bearer est conservé en base ;
- les mots de passe sont hachés par Argon2 (12 caractères minimum) ;
- export JSON art. 15/20 et suppressions en cascade (art. 17) ; purge automatique 12 mois.

Voir [Sécurité & RGPD](docs/security-rgpd.md) et le [dossier de conformité](docs/rgpd/).
