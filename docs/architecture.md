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
| Base de données | PostgreSQL 16 · SQL brut (`pg`) · migrations `node-pg-migrate` |
| Auth back-office | JWT (`jsonwebtoken`) · hash de mot de passe `argon2` |
| Validation | `zod` (entrées HTTP, variables d'environnement) |
| Sécurité HTTP | `helmet` · `express-rate-limit` · CORS |
| Email / SMS | Brevo · Twilio — démarrage en **mode simulation** |
| Stockage médias | Cloudinary (upload direct signé) |
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
       └─ requireAuth            (vérifie le JWT Bearer → req.user)
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
| `/espace-preview/:eventId` | Aperçu de l'espace (back-office) | JWT (lu depuis localStorage) |
| `/newsroom/:eventId` | Espace presse public | Libre |

## Notifications : abstraction de fournisseur

L'envoi (email/SMS) passe par une interface `EmailProvider` / `SmsProvider`. Le
fournisseur actif est résolu à l'exécution selon la configuration **effective**
(réglages chiffrés en base, sinon variables d'environnement) :

- `NOTIFICATIONS_MODE=simulation` → fournisseur factice : rien n'est envoyé, le message
  est journalisé/persisté pour visualisation (onglet Messages).
- `NOTIFICATIONS_MODE=live` → Brevo (email), Twilio ou Brevo (SMS).

Voir [business-logic.md](business-logic.md#notifications) et
[security-rgpd.md](security-rgpd.md#gestion-des-secrets).
