# Déploiement & environnement

Cible : **Railway** (ou tout hébergeur Node + PostgreSQL). Les variables d'environnement
sont validées au démarrage du serveur (`config/env.ts`, zod) → **fail-fast** si une valeur
requise manque ou est invalide.

## Variables d'environnement

| Variable | Requis | Défaut | Rôle |
|---|:--:|---|---|
| `DATABASE_URL` | ✅ | — | Connexion PostgreSQL |
| `JWT_SECRET` | ✅ | — | Signature des JWT (≥ 32 caractères ; fort en prod) |
| `APP_ENCRYPTION_KEY` | — | — | Clé maîtresse AES-256-GCM (32 octets base64) pour les clés API en base |
| `NODE_ENV` | — | `development` | `development` / `test` / `production` |
| `PORT` | — | `4000` | Port d'écoute de l'API |
| `PUBLIC_BASE_URL` | — | `http://localhost:4000` | URL publique du back-end |
| `CLIENT_URL` | — | `http://localhost:5173` | URL du front (CORS + liens) |
| `CUSTOM_DOMAIN_TARGET` | — | host de `PUBLIC_BASE_URL` | Cible CNAME affichée aux clients pour les [domaines personnalisés](custom-domains.md) |
| `PLATFORM_BASE_DOMAIN` | — | — | Domaine de base des [sous-domaines self-service](custom-domains.md) (`slug.<base>`). Nécessite un wildcard DNS+TLS |
| `NOTIFICATIONS_MODE` | — | `simulation` | `simulation` (rien envoyé) / `live` |
| `EMAIL_PROVIDER` | — | `brevo` | Fournisseur email |
| `SMS_PROVIDER` | — | `twilio` | `twilio` / `brevo` |
| `BREVO_API_KEY` | live | — | Clé API Brevo (email/SMS) |
| `BREVO_SENDER_EMAIL` | live | — | Adresse expéditeur **vérifiée** dans Brevo (l'adresse ne change jamais) |
| `BREVO_SENDER_NAME` | — | `PR Event 360` | Nom d'expéditeur **de repli** — le nom affiché des emails d'événement est « *{Événement}* Press Team » |
| `BREVO_SMS_SENDER` | — | `PREvent` | Émetteur SMS (≤ 11 car.) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | si Twilio | — | SMS Twilio |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | médias | — | Stockage Cloudinary |
| `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` | facturation | — | Abonnement Stripe (inscription payante) — dormant si absent |
| `SENTRY_DSN` | — | — | Suivi des erreurs **serveur** (Sentry) — dormant si absent |
| `VITE_SENTRY_DSN` | — | — | Suivi des erreurs **client** (Sentry, embarqué au **build**) — dormant si absent |

> Les clés Brevo/Twilio/Cloudinary peuvent aussi être saisies (chiffrées) via l'UI
> **Intégrations** (admin), qui prime sur le `.env`. Voir [security-rgpd.md](security-rgpd.md).

### Générer les secrets

```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
# APP_ENCRYPTION_KEY (exactement 32 octets)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Build

```bash
npm install                              # tous les workspaces
npm --workspace packages/core run build  # (si build séparé) — sinon consommé en source
npm --workspace server run build         # tsc --noEmit (vérification de types)
npm --workspace client run build         # tsc --noEmit && vite build → client/dist
```

Démarrage en production :

```bash
npm --workspace server run start:prod    # migrate:deploy → bootstrap:admin → start
# (ou, si les migrations sont déjà appliquées) :
npm --workspace server run start         # tsx src/index.ts
```

> `start:prod` **applique les migrations en attente** puis démarre — c'est la commande
> lancée par Railway à chaque déploiement (le schéma est donc toujours à jour).

Le front (`client/dist`) est servi en statique (CDN / hébergeur front) et tape l'API via
`/api` (proxifié en dev par Vite, à configurer en prod selon l'hébergeur).

## Migrations

À appliquer **avant** de démarrer une nouvelle version :

```bash
npm run migrate:up        # applique les migrations en attente
npm run migrate:down      # rollback d'une migration
```

Le 1ᵉʳ compte admin se crée via le seed :

```bash
SEED_EMAIL=… SEED_PASSWORD=… SEED_NAME=… npm --workspace server run seed
```

## Passage en « live » (envois réels)

1. Renseigner les clés Brevo (et Twilio si SMS), ou les saisir via **Intégrations**.
2. Côté Brevo : **vérifier l'expéditeur**. ⚠️ La fonctionnalité « IP autorisées »
   (`Sécurité → IP autorisées`) bloque les envois depuis une IP inconnue ; or l'**IP de sortie
   de Railway change à chaque déploiement**. Sur ce type d'hébergeur, **désactiver** cette
   fonctionnalité (plutôt que d'y lister une IP qui sera invalidée au prochain déploiement),
   sinon les envois sont acceptés par l'API mais **rejetés silencieusement** à la livraison.
3. Passer `NOTIFICATIONS_MODE=live` une fois le parcours validé en simulation.
4. Pour les médias : créer un compte Cloudinary et renseigner les 3 clés.

## Scripts utiles (racine)

```bash
npm run db:up / db:down          # PostgreSQL local via docker compose
npm run migrate:up / :down / :redo
npm test                         # tests du moteur métier (packages/core)
npm --workspace server run test  # tests serveur (Vitest)
```

## Sauvegardes (base de données)

Un workflow GitHub Actions (`.github/workflows/db-backup.yml`) fait un `pg_dump` **quotidien**
de la production et stocke l'archive comme **artefact GitHub** (hors Railway — survit à une
réinitialisation du service Postgres).

**Activation (une fois)** : GitHub → Settings → Secrets → Actions → secret
`BACKUP_DATABASE_URL` = la **chaîne publique** Railway (`DATABASE_PUBLIC_URL`, host `*.proxy.rlwy.net`).
Puis l'onglet **Actions** → « Sauvegarde base de données » → **Run workflow** pour tester.

**Restauration** : télécharger l'artefact, puis
```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backup-AAAAMMJJ-HHMMSS.dump
```

> ⚠️ Une réinitialisation du Postgres Railway (recréation du service / changement de `DATABASE_URL`)
> vide la base : les migrations reconstruisent le **schéma** au déploiement, mais **pas les données**.
> Garder une sauvegarde externe à jour est la seule protection.
