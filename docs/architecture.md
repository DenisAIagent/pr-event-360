# Architecture

## Monorepo

```text
PR Event 360/
├── packages/core/  règles métier pures et types partagés
├── server/         Express, services, repositories, migrations, cron
├── client/         React/Vite, back-office et surfaces publiques
└── docs/           documentation technique et conformité
```

`@pr-event-360/core` est consommé par le client et le serveur. Il ne dépend ni de PostgreSQL ni d’Express.

## Stack

| Couche | Choix |
|---|---|
| Client | React 18, React Router 6, Vite 6, TypeScript |
| Serveur | Node 20+, Express 4, TypeScript, `tsx` |
| Données | PostgreSQL, SQL paramétré avec `pg` |
| Migrations | `node-pg-migrate` |
| Validation | Zod |
| Auth | Argon2, JWT HS256, cookie/CSRF, TOTP, Google Identity |
| Sécurité HTTP | Helmet, CSP, HSTS, CORS, rate limits |
| Médias | Cloudinary, upload navigateur direct signé |
| Paiement | Stripe Checkout et webhooks signés |
| Notifications | Brevo/Twilio, simulation ou live, timeouts 8 s |
| Limitation de débit | express-rate-limit, store Redis partagé si `REDIS_URL` (fail-open mémoire sinon) |
| Observabilité | Sentry optionnel, métriques Prometheus `GET /api/metrics` |
| Tests | Vitest et Playwright |

La version PostgreSQL est gérée par l’environnement d’hébergement ; le développement local utilise `postgres:16-alpine`.

## Couches serveur

```text
HTTP
  routes/             schémas Zod, middlewares, DTO
    admin/            cookie/Bearer, tenant, rôle
    public/           accès libre ou token journaliste
  middleware/         auth, CSRF, validation, erreurs
  services/           orchestration et transactions
  db/repositories/    SQL paramétré, mapping des lignes
  packages/core/      décisions pures
PostgreSQL
```

Le domaine événement est servi par quatre routeurs cohésifs montés sur `/api/admin/events` : `events.ts` (cœur), `eventDomains.ts` (sous-domaines et domaines), `eventLineup.ts` (lieux, participants, conférences) et `eventPipeline.ts` (accréditations, demandes, planning, messages).

Une route ne doit jamais se fier à un `eventId` du client sans appeler `getAccessibleEventOrThrow` ou appliquer une contrainte SQL équivalente.

## Flux d’authentification

### Back-office

```text
login email/Google
  ├─ MFA active → challenge TOTP → session
  └─ admin sans MFA → session restreinte → enrôlement obligatoire

session = pr360_session HttpOnly + pr360_csrf lisible
mutation cookie = cookie CSRF == X-CSRF-Token
```

Le Bearer explicite reste possible pour les clients API et tests. Les droits sont relus en base à chaque requête.

### Espace journaliste

```text
acceptation accréditation
  → token aléatoire envoyé
  → hash + expiration en base
  → /espace/:token

login email/mot de passe
  → nouveau token
  → rotation atomique
  → redirection /espace/:token
```

## Flux conférence

```text
RP crée brouillon
  → ajoute participants/règles
  → publie
  → invite ou ouvre
  → journaliste s’inscrit
  → transaction capacité
      ├─ registered
      ├─ pending
      └─ waitlisted
  → annulation → promotion éventuelle
```

Les tables de conférence sont séparées des `requests`.

## Routes client

| Route | Surface | Authentification |
|---|---|---|
| `/admin/*` | back-office | cookie HttpOnly |
| `/accreditation/:eventId` | formulaire | public |
| `/espace/:token` | espace journaliste | token |
| `/evenement/:eventId/connexion` | login journaliste | public |
| `/newsroom/:eventId` | newsroom | public |
| `/espace-preview/:eventId` | aperçu admin | cookie HttpOnly |

L’aperçu n’utilise pas `localStorage`.

## Réseau et contenu

- l’API est sous `/api` ;
- en production, Express sert `client/dist` et le catch-all SPA ;
- le webhook Stripe reçoit le corps brut avant `express.json` ;
- budget JSON : 6 Mio sous `/api/admin`, 100 Kio ailleurs ;
- `GET /api/health` exécute un `SELECT 1` et répond 503 si PostgreSQL est inaccessible ;
- CSP et sanitisation protègent les contenus riches ;
- SEO des communiqués injecté côté serveur.

## Tâches et effets externes

- cron : récaps, purges RGPD (journalistes, audit, notifications à 12 mois), retombées ;
- chaque cron est protégé par un verrou consultatif PostgreSQL (`pg_try_advisory_lock`) : plusieurs instances peuvent tourner sans exécuter un job en double ;
- emails/SMS best-effort avec timeout explicite de 8 s ;
- uploads directs Cloudinary ;
- webhooks Stripe idempotents ;
- Sentry dormant sans DSN.

## Principes de conception

- événement comme frontière fonctionnelle ;
- organisation comme frontière de tenant ;
- décisions pures testables ;
- transactions sur toute ressource contingentée ;
- aucun secret dans le client ;
- compatibilité des clés API historiques lors de l’adaptation du vocabulaire.
