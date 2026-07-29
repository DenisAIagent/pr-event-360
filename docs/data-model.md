# Modèle de données

PostgreSQL, UUID générés par `gen_random_uuid()`, clés étrangères et suppressions en cascade. Les migrations sont dans `server/migrations`.

## Enums

| Enum | Valeurs |
|---|---|
| `user_role` | `admin, attache, assistant` |
| `event_type` logique | `music, trade_show, conference, corporate, other`, contrainte CHECK |
| `accreditation_type` | `presse, photo, video` |
| `accreditation_status` | `pas_encore_traite, acceptee, refusee` |
| `request_type` | `interview, photo_report, video_report` |
| `request_status` | `pas_encore_traite, en_cours, transmise_prod, attente_artiste, acceptee, refusee, liste_attente` |
| `press_conference_status` | `draft, published, closed, completed` |
| `press_conference_registration_mode` | `open, approval, invite_only` |
| `press_conference_registration_status` | `invited, pending, registered, waitlisted, declined, checked_in, cancelled` |

## Organisations, comptes et facturation

### `organizations`

Tenant principal :

- `id, name` ;
- `subscription_status`, Stripe customer/subscription ;
- timestamps.

### `users`

- `organization_id → organizations` ;
- `email` unique, nom, rôle, `active` ;
- `password_hash` Argon2 nullable pour Google ;
- `google_id` et `auth_provider` ;
- `is_platform_admin` ;
- `mfa_secret` chiffré, `mfa_pending_secret` chiffré, `mfa_enabled` ;
- `password_changed_at` pour révoquer les sessions ;
- timestamps.

Le secret actif n’est jamais remplacé tant que le code du secret préparé n’a pas été vérifié.

### Jetons d’identité

- `password_reset_tokens` : hash SHA-256, expiration, consommation ;
- `invitations` : équipe, rôle, événements, hash, expiration ;
- `organization_invites` : invitation d’une nouvelle organisation ;
- `journalist_password_resets` : reset du journaliste, usage unique.

Les valeurs brutes ne sont envoyées que dans le lien.

### `pending_signups` et `stripe_events`

`pending_signups` contient l’identité minimale, le fournisseur d’auth, la session Stripe et l’expiration. Il ne contient plus de `password_hash` choisi avant preuve.

`stripe_events(id PRIMARY KEY, type, processed_at)` garantit l’idempotence des webhooks.

### `app_secrets`

Intégrations plateforme chiffrées AES-256-GCM : nom, ciphertext, IV, tag et timestamps.

### `audit_log`

Journal des actions du back-office (acteur, action, cible, date). Purge quotidienne au-delà de 12 mois (voir [business-logic.md](business-logic.md#tâches-planifiées)).

## Événements

### `events`

- `organization_id → organizations` ;
- propriétaire, nom, lieu, dates et langues ;
- `event_type` avec défaut `music` ;
- clôture des accréditations ;
- `custom_domain`, état de vérification et `subdomain_slug` ;
- timestamps.

### Configuration

- `event_configs` : durée/buffer d’interview, quota par défaut, bonus d’âge, règles photo ;
- `event_branding` : logo, couleurs et image de fond ;
- `media_types` : libellé et poids ;
- `request_type_weights` : multiplicateur ;
- `email_templates` : langue, déclencheur, canal, sujet et corps ;
- `event_recaps` : fréquence et destinataires ;
- `event_members` : assignation des non-admins.

## Lieux, participants et planning

Les noms SQL historiques sont conservés :

- `stages(event_id, name)` : scène, salle ou espace ;
- `artists(event_id, stage_id, name, itw_quota, photo_quota, video_quota)` : participant ;
- `artist_windows` : jour, début et fin ;
- `interview_slots` : créneaux générés et disponibilité.

Les FK comprenant `event_id` ou les contrôles service empêchent d’associer un participant à un autre événement.

## Journalistes et demandes

### `journalists`

Champs principaux :

- `event_id`, identité, email, téléphone, média, type de média, audience, référence ;
- langue et type d’accréditation ;
- statut d’accréditation, engagement et consentement ;
- délai de publication et date d’envoi de la demande de retombées ;
- `password_hash` ;
- `token_hash` unique partiel et `token_expires_at` ;
- `dedup_enforced` ;
- timestamps.

Le token brut historique a été supprimé. `uniq_journalists_event_email` porte sur `(event_id, lower(email)) WHERE dedup_enforced`. Les doublons historiques sont conservés avec `dedup_enforced=false`.

### `requests` et `request_history`

Une demande :

- appartient à `event_id` et `journalist_id` ;
- possède `type` et `artist_id NOT NULL` ;
- référence éventuellement un `slot_id` et conserve un message ;
- porte le statut courant ;
- a un historique horodaté avec auteur et note.

`stage_id` reste un champ de compatibilité historique mais la cible métier actuelle est le participant.

## Conférences de presse

### `press_conferences`

| Colonne | Rôle |
|---|---|
| `id` | UUID |
| `event_id` | tenant événement, cascade |
| `title, description` | contenu |
| `starts_at, ends_at` | horaires ; fin > début |
| `venue` | lieu libre |
| `capacity` | `NULL` illimité, sinon ≥ 0 |
| `registration_mode` | ouverte, validation ou invitation |
| `status` | cycle de vie |
| `allowed_accreditation_types[]` | presse/photo/vidéo |
| `embargo_until` | embargo facultatif |
| `livestream_url` | URL HTTPS validée par l’API |
| timestamps | création et mise à jour |

### `press_conference_participants`

Table de jointure :

- `conference_id → press_conferences ON DELETE CASCADE` ;
- `artist_id → artists ON DELETE CASCADE` ;
- PK composite.

Le service n’insère que les participants du même événement.

### `press_conference_registrations`

- PK `(conference_id, journalist_id)`, donc inscription idempotente ;
- `status` ;
- `source_request_id` optionnel et `ON DELETE SET NULL` ;
- timestamps.

Index par conférence/statut et par journaliste. `registered` et `checked_in` sont les statuts occupés.

## Contenus et communications

- `media_assets` : type, URL HTTPS, miniature, MIME, taille et source ;
- `press_releases` : titre, HTML assaini, statut, slug SEO, description et couverture ;
- `newsletters` : brouillon/envoyé et contenu ;
- `notifications` : canal, fournisseur, statut et métadonnées ;
- `event_branding` et gabarits associés.

## Retombées et avis

- `press_coverage` : journaliste, catégorie, URL, upload, titre, consentements et timestamps ;
- `app_reviews` : note, citation, consentement public et statut de modération.

La suppression d’un journaliste supprime ses demandes, inscriptions de conférence et retombées.

## Relations principales

```text
organizations
├── users
└── events
    ├── event_members → users
    ├── stages
    ├── artists → stages
    │   ├── artist_windows
    │   └── interview_slots
    ├── journalists
    │   ├── requests → artists / interview_slots
    │   ├── press_coverage
    │   └── press_conference_registrations
    └── press_conferences
        ├── press_conference_participants → artists
        └── press_conference_registrations → journalists
```

## Migrations

Les migrations `0001` à `0036` construisent le socle : événements, demandes, auth, équipe, contenus, domaines, organisations, Google, Stripe, SEO, avis et couverture.

Durcissements et extensions récentes :

| N° | Migration | Effet |
|---:|---|---|
| 0037 | `password-changed-at` | révocation des JWT après changement |
| 0038 | `journalist-unique-email` | unicité par événement sans perte historique |
| 0039 | `stripe-events` | idempotence webhook |
| 0040 | `mfa-pending-secret` | ré-enrôlement TOTP sûr |
| 0041 | `journalist-access-token` | hash + expiration, suppression token brut |
| 0042 | `pending-signup-hardening` | aucun mot de passe avant preuve Stripe |
| 0043 | `event-type` | cinq profils d’événement |
| 0044 | `press-conferences` | conférences, participants et inscriptions |
| 0045 | `mfa-totp-replay-guard` | anti-rejeu des codes TOTP |
| 0046 | `audit-log` | journal d’audit des actions admin |

`start:prod` applique toute migration en attente avant de démarrer l’application.
