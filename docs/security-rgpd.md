# Sécurité & RGPD

## Authentification

- **Mots de passe** hachés avec **argon2** (jamais en clair, jamais loggés) — back-office **et**
  comptes journalistes.
- **JWT** (`HS256`, expiration 12 h) signé avec `JWT_SECRET`, porte `{ sub, email, role, organizationId }`
  (le statut super-admin est relu en base à chaque requête, pas porté par le jeton).
- À la connexion, un compte **désactivé** (`users.active = false`) est refusé même avec le
  bon mot de passe (message générique). Message d'échec identique « email ou mot de passe
  incorrect » + hachage factice pour ne pas révéler l'existence d'un compte (anti-timing).
- **2FA (TOTP)** optionnelle par compte back-office : si activée, le login renvoie un challenge
  court échangé contre un code à 6 chiffres avant l'émission du jeton (`mfa_secret`/`mfa_enabled`).
- **« Continuer avec Google »** (optionnel, dormant sans `GOOGLE_CLIENT_ID`) : l'ID token Google est
  **vérifié côté serveur** (signature + audience), l'email doit être **vérifié par Google**. Un compte
  existant au même email est **lié** automatiquement (Google garantit l'email). Les comptes Google n'ont
  pas de mot de passe (`password_hash` NULL, `auth_provider='google'`) ; la connexion par mot de passe
  les refuse. L'ID client Google est **public** (pas un secret) ; aucun secret OAuth n'est manipulé (flux GIS).

### Comptes journalistes (par événement)

L'espace journaliste reste accessible par **token magique** ; en plus, le journaliste peut
définir un **mot de passe** (depuis son espace, après acceptation) et se reconnecter par
**email + mot de passe** (scopé à l'événement). Login à erreur **générique** + hachage factice
anti-timing ; le login renvoie le token d'espace. `POST /api/public/journalist/*` est
rate-limité (10 / 15 min). Les deux modes d'accès coexistent (rétro-compatibilité).

## Réinitialisation de mot de passe

Même mécanique pour le back-office (`password_reset_tokens`) et les journalistes
(`journalist_password_resets`) :

- Jeton aléatoire 256 bits ; **seul son hash SHA-256** est stocké.
- **Usage unique**, expiration **1 h**, un seul lien actif par compte à la fois.
- Réponse **générique** à la demande (anti-énumération : on ne révèle pas si l'email existe).
- **Rate limiting** : 10 requêtes / 15 min.
- L'email de réinitialisation dépend du fournisseur (Brevo) ; le lien magique reste un secours.

## Invitations

- Même schéma : jeton aléatoire, hash SHA-256 stocké, expiration **7 jours**, usage unique.
- Le compte n'est matérialisé qu'à l'acceptation.

## Gestion des secrets

Deux niveaux :

1. **Variables d'environnement** (`.env`, jamais committé) : `DATABASE_URL`, `JWT_SECRET`,
   `APP_ENCRYPTION_KEY`, clés Brevo/Twilio/Cloudinary par défaut.
2. **Réglages chiffrés en base** (`app_secrets`) gérés par l'admin via l'UI Intégrations :
   - Chiffrement **AES-256-GCM** ; clé maîtresse `APP_ENCRYPTION_KEY` (32 octets base64),
     présente uniquement dans l'environnement.
   - Résolution **DB d'abord, `.env` en repli**. Les secrets sont **masqués** à l'affichage
     (8 puces + 4 derniers caractères).
   - Sans `APP_ENCRYPTION_KEY`, la gestion en base est désactivée (repli `.env`).

**Uploads Cloudinary** : signature générée côté serveur (la clé secrète ne quitte jamais
le back-end) ; le navigateur téléverse en direct avec une signature à durée de vie courte.

## En-têtes & réseau

- **helmet** : en-têtes de sécurité par défaut (nosniff, frameguard, etc.).
- **CORS** restreint à `CLIENT_URL`.
- **Rate limiting** : 30 req/min sur les surfaces publiques (accréditation, espace,
  newsroom) ; 10 req/15 min sur réinitialisation/invitation/MFA et sur le login journaliste.
- **express.json** plafonné à 6 Mo (logos/images en data URL).

## Isolation multi-locataire

- Chaque client est une **organisation** ; `users`/`events` portent `organization_id`. Toutes les
  listes et accès sont **scopés à l'organisation** de l'utilisateur (équipe, événements, recherche).
- L'accès à un événement d'une autre organisation renvoie **404** (pas de fuite d'existence), via
  `getAccessibleEventOrThrow`. Les enfants (journalistes, demandes, médias…) en héritent.
- L'assignation d'événements à un membre **valide** que chaque événement appartient à l'organisation
  (anti-fuite via `event_members`).
- **Intégrations partagées** (clés API) = plateforme, réservées au super-admin ; jamais exposées aux
  admins d'organisation.

## RGPD

- **Consentement explicite obligatoire** à l'accréditation — contrainte applicative
  (`consent` doit valoir `true`, validé par zod côté serveur).
- **Accès tokenisé** : l'espace journaliste est accessible par un **token unique non
  devinable** (256 bits), propre à chaque journaliste.
- **Droit à l'effacement** : suppression en cascade. Supprimer un journaliste retire ses
  demandes/historique **et ses retombées** (`press_coverage`) ; supprimer un événement ou une
  organisation purge l'ensemble de ses données (`ON DELETE CASCADE` sur toutes les tables rattachées).
- **Limitation de conservation** : purge de rétention automatique (planificateur, 03:30) des
  journalistes > 12 mois après la fin de leur événement.
- **Autorisation d'exploitation des médias** : le dépôt d'une photo/vidéo dans la revue de presse
  exige une **double autorisation** (archivage + usage promotionnel), horodatée, en écho au règlement
  accepté à l'accréditation.
- **Minimisation** : seules les données nécessaires au traitement de l'accréditation sont
  demandées.
- **Dossier de conformité** : registre des traitements, DPA, procédures droits/violation, AIPD, TIA
  dans [`docs/rgpd/`](rgpd/). Éditeur : **MDMC OÜ** (Estonie, UE).
- **Identifiants de services externes** : uniquement en variables d'environnement ou
  chiffrés en base, jamais en clair dans le code ni en base.
- **Pas de fuite** : les messages d'erreur côté client restent génériques ; le détail
  technique est journalisé côté serveur uniquement.

## Checklist avant mise en production

- [ ] `JWT_SECRET` et `APP_ENCRYPTION_KEY` aléatoires forts (voir [deployment.md](deployment.md)).
- [ ] HTTPS + en-têtes (HSTS) au niveau de l'hébergeur/proxy.
- [ ] `CLIENT_URL` / `PUBLIC_BASE_URL` pointant sur les domaines de production.
- [ ] Expéditeur Brevo **vérifié**. ⚠️ Sur un hébergeur à **IP de sortie dynamique** (Railway
      la change à chaque déploiement), **désactiver** la fonctionnalité « IP autorisées » de
      Brevo plutôt que d'en lister une — sinon les emails sont rejetés après chaque déploiement.
- [ ] Régénérer toute clé ayant pu être exposée.
- [ ] `NOTIFICATIONS_MODE=live` seulement après validation visuelle du parcours.
