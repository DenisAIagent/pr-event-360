# Architecture

## Monorepo (npm workspaces)

```
pr-event-360/
├── packages/core/   Moteur métier PUR (aucune dépendance DB/HTTP), testable isolément
├── server/          API REST Express + repositories + services + migrations
└── client/          Front React + Vite (formulaires publics multilingues + back-office)
```

Le partage de types/logique se fait via `@pr-event-360/core`, consommé en TypeScript
source par le serveur et le client.

## Stack

| Couche | Choix |
|---|---|
| Frontend | React 18 · Vite 6 · TypeScript · React Router |
| Backend | Node ≥ 20 · Express 4 · TypeScript · `tsx` (dev) |
| Base de données | PostgreSQL (16 local / **18 prod Railway**) · SQL brut (`pg`) · migrations `node-pg-migrate` |
| Auth back-office | JWT (`jsonwebtoken`) · hash `argon2` · 2FA TOTP · Google Identity (optionnel) |
| Validation | `zod` (entrées HTTP, variables d'environnement) |
| Sécurité HTTP | `helmet` · `express-rate-limit` · CORS |
| Email / SMS | Brevo · Twilio — démarrage en **mode simulation** |
| Stockage médias | Cloudinary (upload direct signé) |
| Facturation | Stripe (abonnement, webhook) — dormant si non configuré |
| Planification | `node-cron` (récaps, purge RGPD, collecte des retombées) |
| Tests | Vitest (`packages/core`, `server`) |

## Découpage en couches (serveur)

```
routes/        Validation (zod) + auth + délégation. Aucune logique métier.
  admin/*      Back-office (JWT requis)
  public/*     Surfaces publiques (token journaliste ou accès libre)
services/      Logique métier, orchestration, transactions
db/
  repositories/  Accès SQL (une fonction = une requête), mapping snake_case → camelCase
  pool.ts        Pool pg + helper withTransaction
config/env.ts  Chargement + validation des variables d'environnement (fail-fast)
http/          AppError, enveloppe de réponse, asyncHandler
middleware/    requireAuth, requireRole, requireEventEditor, validateBody, errorHandler
lib/           jwt, argon2 wrappers, tokens, crypto (AES-256-GCM)
```

**Le moteur `@pr-event-360/core`** contient la logique pure et déterministe :
génération de créneaux d'interview, calcul du score de priorité, vérification des
quotas, promotion de la liste d'attente. Il ne connaît ni la base ni HTTP → testable
sans infrastructure (voir [business-logic.md](business-logic.md)).

## Cycle de vie d'une requête (back-office)

```
Requête HTTP
  └─ helmet / CORS / express.json
  └─ Router /api/admin/...
       └─ requireAuth            (vérifie session/Bearer + droits courants → req.user)
       └─ requireRole / requireEventEditor   (selon la route)
       └─ validateBody(schema)   (zod → req.body typé, sinon ZodError)
       └─ asyncHandler(handler)
            └─ getAccessibleEventOrThrow(eventId, user)   (isolation par événement)
            └─ service métier  →  repository  →  SQL
  └─ sendData(res, data)         (enveloppe { success, data })
  └─ errorHandler                (AppError/ZodError → JSON propre, pas de fuite interne)
```

## Enveloppe de réponse

Toutes les réponses suivent un format unique :

```json
{ "success": true,  "data": <payload> }
{ "success": false, "error": "message lisible", "details": <optionnel> }
```

Le client (`client/src/lib/api.ts`) déballe cette enveloppe et lève une `ApiError`
typée (status + message) en cas d'échec.

## Routage front

| Préfixe | Surface | Accès |
|---|---|---|
| `/admin/*` | Back-office (français) | JWT (login) |
| `/accreditation/:eventId` | Formulaire public d'accréditation (multilingue) | Libre |
| `/espace/:token` | Espace journaliste | Token unique non devinable |
| `/evenement/:eventId/connexion` | Connexion journaliste (email + mot de passe) | Libre |
| `/evenement/:eventId/mot-de-passe-oublie` · `/reinitialiser` | Réinitialisation du mot de passe journaliste | Libre / jeton |
| `/espace-preview/:eventId` | Aperçu de l'espace (back-office) | JWT (lu depuis localStorage) |
| `/newsroom/:eventId` | Espace presse public | Libre |
| `/newsroom/:eventId/:slug` | Communiqué (URL dédiée SEO, `<head>` rendu serveur) | Libre |

### Domaines personnalisés (white-label)

Servi sous le domaine d'un client, le serveur résout l'en-tête `Host` → événement
(`siteService.resolveEventForHost`) et **injecte** un bloc `<script type="application/json"
id="__pr_event__">` dans l'HTML (CSP-safe, non exécuté). La SPA le lit au démarrage
(`lib/domainEvent.ts`) et passe en **mode domaine** : les surfaces publiques sont à la **racine**
(`/`, `/newsroom`, `/connexion`…), l'`eventId` venant du contexte injecté. Détails :
[custom-domains.md](custom-domains.md).

## Notifications : abstraction de fournisseur

L'envoi (email/SMS) passe par une interface `EmailProvider` / `SmsProvider`. Le
fournisseur actif est résolu à l'exécution selon la configuration **effective**
(réglages chiffrés en base, sinon variables d'environnement) :

- `NOTIFICATIONS_MODE=simulation` → fournisseur factice : rien n'est envoyé, le message
  est journalisé/persisté pour visualisation (onglet Messages).
- `NOTIFICATIONS_MODE=live` → Brevo (email), Twilio ou Brevo (SMS).

Voir [business-logic.md](business-logic.md#notifications) et
[security-rgpd.md](security-rgpd.md#gestion-des-secrets).
