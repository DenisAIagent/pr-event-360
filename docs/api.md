# Référence API REST

Base : `/api`. Réponses au format enveloppe `{ success, data }` / `{ success, error }`.

## Conventions d'accès

| Marqueur | Signification |
|---|---|
| **public** | Aucune authentification |
| **auth** | JWT Bearer valide requis (`Authorization: Bearer <token>`) |
| **accès événement** | auth + l'utilisateur doit avoir accès à l'événement (admin = tout, sinon membre) |
| **éditeur** | accès événement **et** rôle `admin` ou `attache` (l'`assistant` est en lecture/traitement) |
| **admin** | auth + rôle `admin` |

Le JWT (12 h) porte `{ sub, email, role }`. Obtenu via `POST /api/admin/auth/login`.

## Santé

| Méthode | Chemin | Accès |
|---|---|---|
| GET | `/api/health` | public |

## Authentification — `/api/admin/auth`

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| GET | `/config` | public | `{googleEnabled, googleClientId}` — indique si « Continuer avec Google » est disponible |
| POST | `/google` | public · rate-limité | **Connexion** via ID token Google → `{token, user}` (connexion/liaison) **ou** `{needsSignup:true}` si le compte n'existe pas (inscription via paiement) |
| POST | `/login` | public | `{email, password}` → `{token, user}` **ou** `{mfaRequired, challenge}` si 2FA active. Refusé si l'abonnement de l'organisation est inactif |

> L'inscription n'est plus libre : elle passe par le paiement (voir **Facturation**). La connexion
> (email ou Google) est réservée aux comptes **inscrits et à l'abonnement actif**.
| POST | `/login/mfa` | public · rate-limité | `{challenge, code}` → `{token, user}` (échange du challenge contre un code TOTP) |
| GET | `/mfa/status` | auth | État de la 2FA du compte |
| POST | `/mfa/setup` | auth | Génère un secret TOTP + QR (provisionnement) |
| POST | `/mfa/enable` | auth | Active la 2FA après vérification d'un code |
| POST | `/mfa/disable` | auth | Désactive la 2FA |
| POST | `/register` | auth | Crée un compte (1ᵉʳ compte via seed) |
| POST | `/forgot-password` | public · rate-limité | Réponse générique (anti-énumération) |
| POST | `/reset-password` | public · rate-limité | `{token, password}` (jeton usage unique, 1 h) |
| GET | `/invite?token=` | public · rate-limité | Pré-remplissage de l'acceptation (`{email, role}`) |
| POST | `/accept-invite` | public · rate-limité | `{token, fullName, password}` → crée le compte |

> Rate limiting : 10 requêtes / 15 min sur les routes de réinitialisation/invitation/MFA.
> **2FA (TOTP)** optionnelle par compte : si activée, `login` renvoie un challenge court à
> échanger via `login/mfa` contre un jeton de session.

## Événements & configuration — `/api/admin/events`

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| POST | `/` | éditeur | Créer un événement (sème config, poids, templates) |
| GET | `/` | auth | Liste (admin = tous, sinon événements assignés) |
| GET | `/:eventId` | accès événement | Détail + branding + `customDomain`/`customDomainVerified`/`customDomainTarget` |
| DELETE | `/:eventId` | admin | Supprime l'événement et **toutes** ses données (cascade — RGPD) |
| PUT | `/:eventId/subdomain` | éditeur | `{slug\|null}` — sous-domaine plateforme (`slug.<base>`). Slug validé/réservé, UNIQUE → 409 |
| PUT | `/:eventId/domain` | éditeur | `{domain\|null}` — affecte le domaine personnalisé (UNIQUE → 409 si pris) |
| POST | `/:eventId/domain/verify` | éditeur | Vérifie la résolution DNS (CNAME/A) vers la cible → `{verified, target}` |

> `GET /:eventId` expose aussi `subdomainSlug`, `customDomain`, `customDomainTarget`, `platformBaseDomain`.
| GET | `/:eventId/settings` | accès événement | Config complète (config, médias, poids, templates, branding, récap) |
| PUT | `/:eventId/config` | éditeur | Règles de calcul |
| POST | `/:eventId/media-types` | éditeur | Ajouter un type de média |
| PUT | `/:eventId/type-weights` | éditeur | Multiplicateur par type de demande |
| PUT | `/:eventId/templates` | éditeur | Gabarit email/SMS (langue × déclencheur) |
| PUT | `/:eventId/branding` | éditeur | Logo, couleurs |
| PUT | `/:eventId/deadline` | éditeur | Date de clôture des inscriptions (ISO offset, ou `null`) |
| PUT | `/:eventId/recap` | éditeur | Récapitulatif périodique |
| POST | `/:eventId/recap/test` | éditeur | Envoi immédiat du récap |
| POST | `/:eventId/stages` | éditeur | Ajouter une scène |
| PUT/DELETE | `/:eventId/stages/:stageId` | éditeur | Renommer / supprimer une scène |
| GET | `/:eventId/lineup` | accès événement | Scènes + artistes + créneaux |
| POST | `/:eventId/artists` | éditeur | Ajouter un artiste (+ fenêtres → créneaux + quotas itw/photo/vidéo) |
| PUT/DELETE | `/:eventId/artists/:artistId` | éditeur | Modifier / supprimer un artiste |

## Accréditations & demandes — `/api/admin/events`

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| GET | `/:eventId/accreditations` | accès événement | Liste des journalistes |
| POST | `/:eventId/accreditations/:journalistId/process` | accès événement | `{action: accept\|reject}` |
| DELETE | `/:eventId/accreditations/:journalistId` | accès événement | Supprimer un journaliste et ses données (droit à l'effacement) |
| GET | `/:eventId/requests` | accès événement | File triée par score. Filtres `?type=&status=` |
| POST | `/:eventId/requests/:requestId/status` | accès événement | Changer le statut d'une demande |
| POST | `/:eventId/planning/generate` | éditeur | Attribue les créneaux aux interviews acceptées, par priorité → `{assigned, unscheduled}` |
| GET | `/:eventId/dashboard` | accès événement | KPIs (totaux, par type, liste d'attente, journalistes) |
| GET | `/:eventId/messages` | accès événement | Journal des notifications |

## Médias, newsroom, newsletters — `/api/admin/events`

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| GET | `/:eventId/assets` | accès événement | Médiathèque |
| POST | `/:eventId/assets/sign` | éditeur | Signature d'upload Cloudinary (direct, signé) |
| POST | `/:eventId/assets` | éditeur | Enregistrer un média (après upload ou par lien) |
| DELETE | `/:eventId/assets/:assetId` | éditeur | Supprimer un média |
| GET | `/:eventId/press-releases` | accès événement | Communiqués (tous) |
| POST/PUT/DELETE | `/:eventId/press-releases[/:id]` | éditeur | CRUD communiqué |
| GET | `/:eventId/newsletters` | accès événement | Newsletters |
| POST/PUT | `/:eventId/newsletters[/:id]` | éditeur | Créer / modifier un brouillon |
| DELETE | `/:eventId/newsletters/:id` | éditeur | Supprimer un **brouillon** (les newsletters envoyées sont conservées) |
| POST | `/:eventId/newsletters/:id/send` | éditeur | `{journalistIds[]}` — envoi groupé |
| GET | `/:eventId/recipients` | accès événement | Journalistes (pour la sélection d'envoi) |
| GET | `/:eventId/space-preview` | accès événement | Données d'aperçu de l'espace journaliste |

## Équipe — `/api/admin/team` (admin)

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/` | Comptes (+ events assignés) + invitations en attente |
| POST | `/invite` | `{email, role, eventIds[]}` → invitation par email |
| POST | `/:userId/role` | Changer le rôle (protège le dernier admin) |
| POST | `/:userId/active` | Activer/désactiver (protège le dernier admin) |
| PUT | `/:userId/events` | Remplacer les événements assignés |
| DELETE | `/:userId` | **Supprimer** le compte (réattribue ses événements à l'admin ; pas soi-même, pas le dernier admin) |

## Facturation — `/api/admin/billing` + webhook Stripe

> Inscription **payante** (Stripe, abonnement annuel). Dormant si Stripe non configuré
> (`STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID`). Le compte n'est créé qu'**au paiement validé** (webhook).

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| GET | `/api/admin/billing/config` | public | `{billingEnabled, priceLabel}` |
| POST | `/api/admin/billing/checkout` | public · rate-limité | `{orgName, fullName, email, password}` **ou** `{orgName, googleCredential}` → `{url}` (Stripe Checkout) |
| POST | `/api/stripe/webhook` | public (signé) | Événements Stripe (corps brut, signature vérifiée) : `checkout.session.completed` matérialise l'org + le compte ; `customer.subscription.updated/deleted`, `invoice.payment_failed` mettent à jour le statut |

Onboarding (super-admin) — **invitation à s'inscrire** (accès offert, sans paiement) :
| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| POST | `/api/admin/organizations/invite` | super-admin | `{email}` → `{inviteUrl}` — **lien copiable** à partager soi-même (14 j, usage unique) |
| GET | `/api/admin/auth/org-invite?token=` | public | Pré-remplissage (`{email}`) |
| POST | `/api/admin/auth/org-invite/accept` | public · rate-limité | `{token, orgName, fullName, password}` **ou** `{token, orgName, googleCredential}` → l'invité crée son organisation (active) → `{token, user}` |

Variante directe : `POST /api/admin/organizations` `{orgName, adminEmail}` → crée l'organisation + invite l'admin (l'opérateur nomme l'orga).

Suppression (super-admin) :
| Méthode | Chemin | Description |
|---|---|---|
| DELETE | `/api/admin/organizations/:orgId` | Supprime l'organisation + **toutes** ses données (cascade). Interdit sur sa propre organisation |
| POST | `/api/admin/organizations/delete-account` | `{email}` → supprime le compte ; si seul membre de son org → supprime l'org entière. Libère l'email |

## Intégrations — `/api/admin/settings` (super-admin plateforme)

> Ressources **partagées** (clés Brevo/Twilio/Cloudinary) : réservées au super-admin plateforme
> (`is_platform_admin`). Invisibles des admins d'organisation.


| Méthode | Chemin | Description |
|---|---|---|
| GET | `/` | État des réglages (source db/env/none, secrets masqués) |
| PUT | `/` | Carte clé→valeur (valeur vide = retour au `.env`). Chiffré AES-256-GCM |

## Recherche globale — `/api/admin/search`

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| GET | `/?q=` | auth | Recherche journalistes (nom/email/média) + événements, **limitée aux événements accessibles** à l'utilisateur. `< 2` caractères → résultat vide. Alimente le champ de recherche du header. |

## Surfaces publiques

### Accréditation — `/api/public`

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/events/:eventId` | Données du formulaire (branding, types de média, deadline, `registrationClosed`) |
| POST | `/events/:eventId/accreditations` | Soumettre une demande (consentement RGPD obligatoire) |

### Espace journaliste — `/api/public/space`

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/:token` | Profil + lineup + demandes (avec cible & créneau attribué) + `hasPassword` (token unique ; accréditation acceptée requise) |
| POST | `/:token/requests` | Soumettre une demande d'interview/reportage |
| POST | `/:token/password` | Définir/remplacer le mot de passe d'espace (authentifié par le token, min. 8 car.) |

### Compte journaliste (email + mot de passe) — `/api/public/journalist`

Accès **par événement**. Le login renvoie le token d'espace ; le client redirige vers
`/espace/:token`. Le lien magique tokenisé reste valable en parallèle.

| Méthode | Chemin | Accès | Description |
|---|---|---|---|
| POST | `/login` | public · rate-limité | `{eventId, email, password}` → `{token, firstName}` (erreur générique sinon) |
| POST | `/forgot-password` | public · rate-limité | `{eventId, email}` → réponse générique ; envoie un lien de réinitialisation |
| POST | `/reset-password` | public · rate-limité | `{token, password}` (jeton SHA-256 usage unique, 1 h) |

> Rate limiting : 10 requêtes / 15 min sur `/api/public/journalist/*`.

### Newsroom — `/api/public/newsroom`

| Méthode | Chemin | Description |
|---|---|---|
| GET | `/:eventId` | Communiqués publiés + médias + branding + deadline |
