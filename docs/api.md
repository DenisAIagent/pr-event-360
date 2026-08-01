# Référence API REST

Base : `/api`. Réponses : `{ success: true, data }` ou `{ success: false, error }`.

## Accès

| Marqueur | Condition |
|---|---|
| public | aucune authentification |
| auth | cookie `pr360_session` ou Bearer explicite |
| accès événement | auth + événement accessible dans le tenant |
| éditeur | rôle `admin` ou `attache` + accès événement |
| admin | rôle `admin` |
| super-admin | `is_platform_admin=true` |

Pour une mutation authentifiée par cookie, envoyer `X-CSRF-Token` avec la valeur du cookie `pr360_csrf`. Le Bearer explicite n’est pas soumis au CSRF.

Le JWT dure 12 h. Les routes ne renvoient pas le JWT au JavaScript : elles posent le cookie HttpOnly. Rôle, activation, abonnement, statut plateforme, révocation du mot de passe et obligation MFA sont contrôlés en base.

Les limites de débit utilisent un store Redis partagé lorsque `REDIS_URL` est défini (compteurs cohérents entre instances) ; sinon elles retombent sur la mémoire du processus.

## Santé et métriques

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/api/health` | public | `SELECT 1` PostgreSQL, 503 si inaccessible |
| GET | `/api/metrics` | `Authorization: Bearer METRICS_TOKEN` (404 en prod sans secret) | compteurs Prometheus ; aucune PII |

## Authentification — `/api/admin/auth`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/login` | public, 10/15 min | email/mot de passe ; session ou challenge MFA |
| POST | `/login/mfa` | public, 10/15 min | `{challenge, code}` ; ouvre la session |
| GET | `/me` | auth | utilisateur courant + `mfaSetupRequired` |
| POST | `/logout` | cookie CSRF | efface session et CSRF |
| GET | `/config` | public | disponibilité Google |
| POST | `/google` | public, limité | login Google vérifié ; MFA identique au login classique |
| GET | `/mfa/status` | auth | état TOTP |
| POST | `/mfa/setup` | auth | prépare un secret ; `currentCode` requis lors d’un ré-enrôlement |
| POST | `/mfa/enable` | auth | promeut le secret préparé après preuve TOTP |
| POST | `/mfa/disable` | auth | exige un code courant |
| POST | `/register` | admin | crée un `attache` ou `assistant` dans l’organisation |
| POST | `/forgot-password` | public, limité | réponse générique |
| POST | `/reset-password` | public, limité | token usage unique, mot de passe min. 8 |
| GET | `/invite?token=…` | public, limité | prévisualise une invitation d’équipe |
| POST | `/accept-invite` | public, limité | crée le compte invité |
| GET | `/org-invite?token=…` | public, limité | prévisualise une invitation d’organisation |
| POST | `/org-invite/accept` | public, limité | crée l’organisation et ouvre la session |

MFA obligatoire pour `admin` et super-admin : une session sans enrôlement n’accède qu’à `me`, aux routes MFA et à `logout`.

## Événements — `/api/admin/events`

### Création

`POST /`, accès éditeur :

```json
{
  "name": "Tech Summit",
  "eventType": "conference",
  "location": "Lisbonne",
  "startDate": "2026-09-10",
  "endDate": "2026-09-11",
  "languages": ["fr", "en"],
  "config": {
    "itwDurationMin": 20,
    "itwBufferMin": 5
  }
}
```

`eventType` : `music | trade_show | conference | corporate | other`.

### Routes générales

| Méthode | Route | Accès | Description |
|---|---|---|---|
| POST | `/` | éditeur | crée l’événement et ses valeurs par défaut |
| GET | `/` | auth | événements accessibles |
| GET | `/:eventId` | accès événement | détail, branding et domaines |
| DELETE | `/:eventId` | admin | suppression en cascade |
| GET | `/:eventId/settings` | accès événement | configuration complète |
| PUT | `/:eventId/config` | éditeur | durées, quotas, âge et règles photo |
| PUT | `/:eventId/photo-rules` | éditeur | règlement photo/vidéo |
| POST | `/:eventId/media-types` | éditeur | poids d’un type de média |
| PUT | `/:eventId/type-weights` | éditeur | multiplicateur d’une demande |
| PUT | `/:eventId/templates` | éditeur | gabarit langue/déclencheur/canal |
| PUT | `/:eventId/branding` | éditeur | logo, fond et couleurs |
| PUT | `/:eventId/deadline` | éditeur | clôture ISO avec offset ou `null` |
| PUT | `/:eventId/recap` | éditeur | `none | daily | weekly` |
| POST | `/:eventId/recap/test` | éditeur | envoi immédiat |

### Lieux et participants

Les noms techniques restent `stages` et `artists` quel que soit le profil.

| Méthode | Route | Accès |
|---|---|---|
| POST | `/:eventId/stages` | éditeur |
| PUT/DELETE | `/:eventId/stages/:stageId` | éditeur |
| GET | `/:eventId/lineup` | accès événement |
| POST | `/:eventId/artists` | éditeur |
| PUT/DELETE | `/:eventId/artists/:artistId` | éditeur |

Un participant accepte `itwQuota`, `photoQuota`, `videoQuota` et des fenêtres `{day,startTime,endTime}` à la création.

### Conférences de presse

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/:eventId/press-conferences` | accès événement | conférences enrichies des participants/comptages |
| POST | `/:eventId/press-conferences` | éditeur | crée |
| PUT | `/:eventId/press-conferences/:conferenceId` | éditeur | remplace les champs et participants |
| DELETE | `/:eventId/press-conferences/:conferenceId` | éditeur | supprime en cascade |
| GET | `/:eventId/press-conferences/:conferenceId/registrations` | accès événement | inscriptions et journalistes |
| POST | `/:eventId/press-conferences/:conferenceId/invitations` | éditeur | `{journalistIds[]}`, max. 500 |
| PUT | `/:eventId/press-conferences/:conferenceId/registrations/:journalistId` | éditeur | `{status}` |

Corps de création/mise à jour :

```json
{
  "title": "Point presse de clôture",
  "description": "Fréquentation et bilan.",
  "startsAt": "2026-07-20T16:00:00.000Z",
  "endsAt": "2026-07-20T17:00:00.000Z",
  "venue": "Salle presse",
  "capacity": 80,
  "registrationMode": "approval",
  "status": "published",
  "allowedAccreditationTypes": ["presse", "photo", "video"],
  "embargoUntil": null,
  "livestreamUrl": "https://video.example.test/live",
  "participantIds": []
}
```

- mode : `open | approval | invite_only` ;
- statut conférence : `draft | published | closed | completed` ;
- statut inscription : `invited | pending | registered | waitlisted | declined | checked_in | cancelled` ;
- `livestreamUrl` doit utiliser HTTPS ;
- `endsAt` doit être postérieur à `startsAt`.

### Accréditations, demandes et planning

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/:eventId/accreditations` | accès événement | sans `passwordHash`, no-store |
| POST | `/:eventId/accreditations/:journalistId/process` | accès événement | `accept | reject` |
| POST | `/:eventId/accreditations/:journalistId/access-link/resend` | éditeur | rotation et renvoi |
| DELETE | `/:eventId/accreditations/:journalistId` | éditeur | effacement RGPD |
| GET | `/:eventId/accreditations/:journalistId/export` | éditeur | export JSON art. 15/20 |
| GET | `/:eventId/exports/accreditations.csv` | accès événement | CSV journalistes (Excel FR) |
| GET | `/:eventId/exports/requests.csv` | accès événement | CSV demandes (`?type=&status=`) |
| GET | `/:eventId/exports/planning.csv` | accès événement | CSV planning interviews |
| GET | `/:eventId/exports/coverage.csv` | accès événement | CSV retombées |
| GET | `/:eventId/exports/bilan` | accès événement | JSON agrégé bilan presse |
| GET | `/:eventId/assignees` | accès événement | membres assignables |
| PATCH | `/:eventId/requests/:requestId/assign` | accès événement | `{ userId: uuid \| null }` |
| GET | `/:eventId/requests/:requestId/timeline` | accès événement | historique + notes |
| POST | `/:eventId/requests/:requestId/notes` | accès événement | `{ body }` note interne |

`GET …/requests` accepte aussi `?assignedTo=me|unassigned|<uuid>`.
| GET | `/:eventId/requests?type=&status=&limit=` | accès événement | file triée, filtres en SQL, `limit` 1000 par défaut (max 5000) |
| POST | `/:eventId/requests/:requestId/status` | accès événement | `{status,note?}` ; liste d’attente non assignable |
| POST | `/:eventId/planning/generate` | éditeur | `{assigned,unscheduled}` |
| GET | `/:eventId/dashboard` | accès événement | KPIs |
| GET | `/:eventId/messages?limit=&before=` | accès événement | notifications paginées `{ items, nextCursor }` ; `limit` 100 par défaut (max 200), curseur keyset `before` |

### Médias, newsroom et communications

| Méthode | Route | Accès |
|---|---|---|
| GET/POST | `/:eventId/assets` | accès / éditeur |
| POST | `/:eventId/assets/sign` | éditeur |
| DELETE | `/:eventId/assets/:assetId` | éditeur |
| GET/POST | `/:eventId/press-releases` | accès / éditeur |
| PUT/DELETE | `/:eventId/press-releases/:id` | éditeur |
| GET/POST | `/:eventId/newsletters` | accès / éditeur |
| PUT/DELETE | `/:eventId/newsletters/:id` | éditeur |
| POST | `/:eventId/newsletters/:id/send` | éditeur |
| GET | `/:eventId/recipients` | accès événement |
| GET | `/:eventId/space-preview` | accès événement, cookie session |
| GET | `/:eventId/coverage` | accès événement |
| POST | `/:eventId/coverage/remind` | éditeur |
| DELETE | `/:eventId/coverage/:id` | éditeur |

Les URLs de média enregistrées doivent être HTTPS. Les bytes déclarés sont bornés à 200 Mio.

### Domaines

| Méthode | Route | Accès | Description |
|---|---|---|---|
| PUT | `/:eventId/subdomain` | éditeur | `{slug|null}` |
| PUT | `/:eventId/domain` | super-admin | `{domain|null}` |
| POST | `/:eventId/domain/verify` | super-admin | contrôle CNAME/A |

## Équipe — `/api/admin/team`

Toutes les routes exigent `admin`.

| Méthode | Route | Description |
|---|---|---|
| GET | `/` | membres et invitations |
| POST | `/invite` | invite email/rôle/événements |
| POST | `/:userId/role` | change le rôle |
| POST | `/:userId/active` | active/désactive |
| PUT | `/:userId/events` | remplace les assignations |
| DELETE | `/:userId` | supprime avec protections du dernier admin |
| POST/DELETE | routes d’invitations | renvoi/suppression selon l’UI |

## Facturation et organisations

### `/api/admin/billing`

| Méthode | Route | Accès | Description |
|---|---|---|---|
| GET | `/config` | public | activation et prix |
| POST | `/checkout` | public, limité | crée Stripe Checkout |
| POST | `/api/stripe/webhook` | signature Stripe | traite paiement/abonnement |

Le checkout email ne stocke pas le mot de passe envoyé avant preuve. Le webhook vérifie la session et le prix, est idempotent via `stripe_events`, puis lance l’activation du compte.

### `/api/admin/organizations`

Super-admin uniquement : liste, création directe, invitation d’organisation, changement de contexte, suppression d’organisation et suppression de compte.

## Intégrations — `/api/admin/settings`

Super-admin uniquement :

- `GET /` : source db/env/none et secrets masqués ;
- `PUT /` : valeurs chiffrées AES-256-GCM, vide = repli vers l’environnement.

## Recherche et avis

- `GET /api/admin/search?q=…` : auth, résultats limités aux événements accessibles ;
- `GET/POST /api/admin/review` : avis de l’utilisateur ;
- `GET /api/admin/reviews` et `POST /:id/status` : modération super-admin ;
- `GET /api/public/reviews` : avis approuvés avec consentement.

## Surfaces publiques

### Accréditation — `/api/public`

| Méthode | Route |
|---|---|
| GET | `/events/:eventId` |
| POST | `/events/:eventId/accreditations` |

La réponse GET inclut `eventType`. La soumission exige le consentement et refuse les doublons.

### Espace journaliste — `/api/public/space`

Le segment `:token` accepte soit le bearer du lien magique, soit `me` (session cookie `pr360_journalist`).

| Méthode | Route | Description |
|---|---|---|
| POST | `/session` | échange le lien magique → cookie HttpOnly + rotation du jeton |
| POST | `/logout` | efface le cookie de session journaliste |
| GET | `/:token` | événement, profil, lineup, demandes, conférences, règles et retombées |
| GET | `/:token/export` | export JSON art. 15/20 |
| POST | `/:token/requests` | cible participant obligatoire |
| POST | `/:token/press-conferences/:conferenceId/register` | inscrit/demande une place |
| DELETE | `/:token/press-conferences/:conferenceId/registration` | annule ou décline |
| POST | `/:token/password` | **première définition uniquement**, min. 12 |
| POST | `/:token/coverage` | dépose une retombée |
| DELETE | `/:token/coverage/:id` | retire sa retombée |
| POST | `/:token/assets/sign` | upload scindé par événement |

### Compte journaliste — `/api/public/journalist`

| Méthode | Route | Description |
|---|---|---|
| POST | `/login` | `{eventId,email,password}` → session cookie (pas de token dans le corps) |
| POST | `/forgot-password` | réponse générique |
| POST | `/reset-password` | token 1 h, révoque le token d’espace |

Rate limit : 10 requêtes / 15 min.

### Newsroom — `/api/public/newsroom`

- `GET /:eventId` : contenus publiés, médias, branding ;
- `GET /:eventId/cp/:slug` : communiqué public.

## SEO hors API

- `GET /robots.txt` ;
- `GET /sitemap.xml` ;
- communiqué rendu par le catch-all SPA avec balises injectées ;
- en mode domaine, URLs sans `eventId`.
