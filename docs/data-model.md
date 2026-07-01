# Modèle de données

PostgreSQL (16 en local via docker, **18 en production Railway**). Schéma géré par migrations
versionnées (`server/migrations/`), appliquées avec `node-pg-migrate`. Clés primaires en `uuid`
(`gen_random_uuid()`, extension `pgcrypto`).

## Types ENUM

| Type | Valeurs |
|---|---|
| `lang_code` | `fr, en, pt, es` |
| `accreditation_type` | `presse, photo, video` |
| `accreditation_status` | `pas_encore_traite, acceptee, refusee` |
| `request_type` | `interview, photo_report, video_report` |
| `request_status` | `pas_encore_traite, en_cours, transmise_prod, attente_artiste, acceptee, refusee, liste_attente` |
| `user_role` | `admin, attache, assistant` |

## Relations (vue d'ensemble)

```
users ──┐ (owner)
        ▼
      events ─┬─ event_configs (1-1)  (+ règles photo : photo_rule, onsite_contract, photo_terms)
              ├─ request_type_weights (1-N)
              ├─ media_types (1-N)
              ├─ stages ─── artists ─── artist_windows ─── interview_slots
              ├─ journalists ─┬─ requests ─── request_status_history
              │               ├─ journalist_password_resets
              │               └─ press_coverage (retombées / revue de presse)
              ├─ email_templates · notifications
              ├─ event_branding (1-1) · event_recap (1-1)
              ├─ event_members (N-N users↔events)
              ├─ event_assets · press_releases (SEO) · newsletters · press_coverage
              └─ (accreditation_deadline : colonne de events)

organizations ─┬─ users ─── events        (multi-locataire ; + Stripe : subscription_status…)
               └─ org_invites · pending_signups (onboarding : invitation / inscription payante)

users ── password_reset_tokens
users ── invitations (invited_by)
app_reviews (avis produit ; user_id / organization_id nullable, modéré)
app_secrets (global, non lié à un événement)
```

> **Cascade** : toutes les tables rattachées à un événement utilisent
> `ON DELETE CASCADE`. Supprimer un événement purge l'intégralité de ses données
> (exigence RGPD de clôture — voir [security-rgpd.md](security-rgpd.md)).

## Tables

### Comptes & accès

**`organizations`** — **locataire** (un client = une organisation isolée). `id, name, slug (unique),
stripe_customer_id, stripe_subscription_id, subscription_status (défaut `active`), current_period_end, created_at`.
> Les colonnes Stripe portent l'état d'abonnement : un `subscription_status` inactif bloque la connexion des comptes de l'org.
> Multi-locataire : `users` et `events` portent un `organization_id`. Un admin ne voit que SON
> organisation. `users.is_platform_admin` = super-admin opérateur (intégrations partagées + supervision).
> Voir [roles-permissions.md](roles-permissions.md).

**`users`** — comptes back-office.
`id, organization_id → organizations, email (unique), password_hash (argon2, **nullable** si Google),
google_id (unique, nullable), auth_provider (`password`|`google`, défaut `password`), full_name,
role (user_role), active (bool), is_platform_admin (bool), mfa_secret (TOTP, chiffré), mfa_enabled (bool), created_at`
> `auth_provider='google'` ⇒ pas de mot de passe (connexion par mot de passe refusée). Voir [security-rgpd.md](security-rgpd.md#authentification).

**`org_invites`** — invitation d'un client à s'inscrire (accès offert, sans paiement), émise par le super-admin.
`id, email, token_hash (unique), invited_by → users (SET NULL), expires_at, accepted_at, created_at` (14 j, usage unique).

**`pending_signups`** — inscription payante en attente de validation Stripe (matérialisée en organisation + compte au webhook).
`id, email, org_name, full_name, password_hash (nullable), google_id (nullable), auth_provider, stripe_session_id, created_at, expires_at`

**`app_reviews`** — avis produit (notation de l'app par un attaché), modéré avant affichage public.
`id, user_id → users (SET NULL), organization_id → organizations (SET NULL), author_name, author_role, author_org,
rating (int 1–5, CHECK), quote, consent_public (bool), status (`pending`|`approved`|`rejected`), created_at, reviewed_at`
> Un avis unique par utilisateur (index partiel). Seuls les avis `approved` **et** `consent_public` alimentent les témoignages de la landing.

**`event_members`** — assignation collaborateur ↔ événement (PK composite `event_id,user_id`).
Un admin accède à tout sans ligne ici ; les autres rôles n'accèdent qu'aux événements où
ils sont membres.

**`invitations`** — invitation d'un collaborateur (compte créé à l'acceptation).
`id, email, role, event_ids (uuid[]), token_hash, invited_by → users, expires_at, accepted_at`

**`password_reset_tokens`** — réinitialisation de mot de passe.
`id, user_id → users, token_hash (SHA-256), expires_at, used_at` (usage unique).

**`app_secrets`** — réglages d'intégration chiffrés (clés API). Global.
`key (PK), value_encrypted (AES-256-GCM), updated_by → users, updated_at`

### Événement & configuration

**`events`** — entité racine (rattachée à une organisation).
`id, organization_id → organizations, owner_user_id → users, name, location, start_date, end_date, languages (lang_code[]),
accreditation_deadline, custom_domain (unique, nullable), custom_domain_verified (bool),
subdomain_slug (unique, nullable), created_at`
> `custom_domain` (domaine perso) et `subdomain_slug` (sous-domaine plateforme) : white-label,
> voir [custom-domains.md](custom-domains.md).

**`event_configs`** — paramètres de calcul (1 par événement).
`itw_duration_min, itw_buffer_min, default_itw_quota, photo_quota_per_stage, age_bonus_per_hour, age_bonus_cap,
photo_rule (text), onsite_contract (bool, défaut false), photo_terms (text)`
> `photo_quota_per_stage` est **legacy** : depuis la migration 021, les quotas photo/vidéo
> sont portés par l'**artiste** (`artists.photo_quota` / `video_quota`), plus par la scène.
> `photo_rule` / `onsite_contract` / `photo_terms` (migration 031) : **règles photo & autorisation**
> affichées dans l'espace journaliste et jointes à l'email d'acceptation de reportage (variable `{{reportage}}`).

**`request_type_weights`** — multiplicateur de score par type de demande.
**`media_types`** — types de média + poids (TV nationale, presse, web…), utilisés dans le score.
**`event_branding`** — logo, couleur d'accent, fond, texte, image de fond (data URL ou URL).
**`event_recap`** — récapitulatif périodique (`frequency: none|daily|weekly`, `recipients[]`, `last_sent_at`).

### Lineup

**`stages`** — scènes (`event_id, name`).
**`artists`** — `event_id, name, stage_id → stages, itw_quota, photo_quota, video_quota`.
C'est l'**artiste** qui porte ses quotas : interviews (`itw_quota`, sinon défaut de l'événement),
photographes (`photo_quota`) et vidéastes (`video_quota`). `NULL` ⇒ illimité (photo/vidéo) ou
défaut (interview).
**`artist_windows`** — fenêtres de disponibilité d'un artiste (`day, start_time, end_time`).
**`interview_slots`** — créneaux d'interview générés depuis les fenêtres (`day, start_time, end_time`).

### Journalistes & demandes

**`journalists`** — un journaliste accrédité (ou en attente) pour un événement.
`id, event_id, token (unique, accès à l'espace), first_name, last_name, email, phone, media,
media_type_id → media_types, audience, prev_article, lang, accreditation_type, acc_status,
commit_publish (bool), consent (bool, RGPD), password_hash (argon2, nullable),
publish_delay_days (int, défaut 8 — J+3/8/30 choisi à l'inscription), coverage_request_sent_at (idempotence de la collecte), created_at`
> Email **non unique** (un journaliste = une ligne par événement). `password_hash` est défini
> après acceptation pour permettre la connexion email + mot de passe (voir `journalist_password_resets`).

**`journalist_password_resets`** — réinitialisation du mot de passe d'espace.
`id, journalist_id → journalists, token_hash (SHA-256), expires_at, used_at` (usage unique, 1 h).

**`requests`** — demande d'un journaliste. **Cible toujours un artiste** (`artist_id NOT NULL`).
`id, event_id, journalist_id → journalists, type (request_type), artist_id, slot_id, stage_id,
message, status (request_status), created_at`
- `interview` → artiste (+ `slot_id` attribué par la génération de planning)
- `photo_report` / `video_report` → artiste (quotas photo/vidéo portés par l'artiste)

**`request_status_history`** — historique des changements de statut.
`request_id → requests, status, changed_at, changed_by → users, note`

### Communications & médias

**`email_templates`** — gabarit par (événement × langue × déclencheur × canal). `subject, body`.
**`notifications`** — journal des envois (email/SMS), y compris en simulation.
`event_id, journalist_id, channel, trigger_key, lang, to_address, subject, body, provider, status, created_at`
**`event_assets`** — médiathèque. `kind (photo|video|logo|press_kit|other), title, url, thumbnail_url, mime, bytes, source (upload|link), sort`
**`press_releases`** — communiqués. `title, body_html, published_at, status (draft|published),
slug, seo_description, cover_image_url` — le triplet SEO (migration 033) : `(event_id, slug)` **unique**,
sert l'URL dédiée + les balises meta/OG injectées côté serveur (voir [features.md](features.md), [api.md](api.md#seo-rendu-serveur-hors-api)).
**`newsletters`** — communications HTML. `subject, body_html, status (draft|sent), recipient_count, sent_at`
**`press_coverage`** — **retombées** déposées par un journaliste (revue de presse, migration 035).
`id, event_id → events (CASCADE), journalist_id → journalists (CASCADE), media_category,
is_upload (bool), url, thumbnail_url, title, archive_consent (bool), promo_consent (bool), created_at`
> `is_upload=true` (photo/vidéo hébergée sur Cloudinary) ⇒ `archive_consent` **et** `promo_consent` requis.

## Migrations

Ordre chronologique (`server/migrations/1700000000NNN_*.ts`) :

```
001 init-extensions-enums      013 password-reset-tokens
002 users                      014 user-role-admin        (ALTER TYPE … ADD VALUE, hors transaction)
003 events-config-weights      015 event-members          (+ backfill, bootstrap admin)
004 stages-artists-windows-slots  016 invitations         (+ users.active)
005 journalists                017 app-secrets
006 requests-history           018 newsroom-newsletters
007 email-templates            019 user-mfa               (2FA TOTP : mfa_secret, mfa_enabled)
008 notifications              020 stage-quotas
009 event-branding             021 report-quotas-on-artist (quotas photo/vidéo → artists ;
010 branding-text-color            requests.artist_id NOT NULL)
011 branding-bg-image          022 journalist-password    (journalists.password_hash)
012 deadline-and-recap         023 journalist-password-resets
                               024 events-custom-domain   (events.custom_domain + verified)
                               025 event-subdomain        (events.subdomain_slug)
                               026 organizations          (multi-locataire : organizations +
                                   organization_id sur users/events/invitations + backfill + super-admin)
                               027 google-auth            (users.google_id/auth_provider ; password_hash nullable)
                               028 billing                (organizations.stripe_* + table pending_signups)
                               029 org-invites            (invitations d'inscription super-admin)
                               030 request-notif-detail   (données : templates demande + {{type}}/{{artist}})
                               031 photo-rules            (event_configs.photo_rule/onsite_contract/photo_terms)
                               032 request-received-detail(données : template accusé de réception)
                               033 press-release-seo      (press_releases.slug/seo_description/cover_image_url)
                               034 app-reviews            (avis produit + modération)
                               035 press-coverage         (retombées + events.coverage_request_sent_at)
                               036 coverage-per-journalist(journalists.publish_delay_days/coverage_request_sent_at ;
                                   DROP events.coverage_request_sent_at → idempotence par journaliste)
```

```bash
npm run migrate:up        # applique les migrations en attente
npm run migrate:down      # revient d'une migration (réversibilité)
npm run migrate:redo      # down + up de la dernière
```
