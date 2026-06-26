# Sécurité & RGPD

## Authentification

- **Mots de passe** hachés avec **argon2** (jamais en clair, jamais loggés).
- **JWT** (`HS256`, expiration 12 h) signé avec `JWT_SECRET`, porte `{ sub, email, role }`.
- À la connexion, un compte **désactivé** (`users.active = false`) est refusé même avec le
  bon mot de passe (message générique). Message d'échec identique « email ou mot de passe
  incorrect » + hachage factice pour ne pas révéler l'existence d'un compte (anti-timing).

## Réinitialisation de mot de passe

- Jeton aléatoire 256 bits ; **seul son hash SHA-256** est stocké (`password_reset_tokens`).
- **Usage unique**, expiration **1 h**, un seul lien actif par compte à la fois.
- Réponse **générique** à la demande (anti-énumération : on ne révèle pas si l'email existe).
- **Rate limiting** : 10 requêtes / 15 min.

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
  newsroom) ; 10 req/15 min sur réinitialisation/invitation.
- **express.json** plafonné à 6 Mo (logos/images en data URL).

## RGPD

- **Consentement explicite obligatoire** à l'accréditation — contrainte applicative
  (`consent` doit valoir `true`, validé par zod côté serveur).
- **Accès tokenisé** : l'espace journaliste est accessible par un **token unique non
  devinable** (256 bits), propre à chaque journaliste.
- **Droit à l'effacement** : suppression en cascade. Supprimer un journaliste retire ses
  demandes/historique ; supprimer un événement purge l'ensemble de ses données
  (`ON DELETE CASCADE` sur toutes les tables rattachées).
- **Minimisation** : seules les données nécessaires au traitement de l'accréditation sont
  demandées.
- **Identifiants de services externes** : uniquement en variables d'environnement ou
  chiffrés en base, jamais en clair dans le code ni en base.
- **Pas de fuite** : les messages d'erreur côté client restent génériques ; le détail
  technique est journalisé côté serveur uniquement.

## Checklist avant mise en production

- [ ] `JWT_SECRET` et `APP_ENCRYPTION_KEY` aléatoires forts (voir [deployment.md](deployment.md)).
- [ ] HTTPS + en-têtes (HSTS) au niveau de l'hébergeur/proxy.
- [ ] `CLIENT_URL` / `PUBLIC_BASE_URL` pointant sur les domaines de production.
- [ ] Expéditeur Brevo **vérifié** et IP du serveur **autorisée** (sinon emails rejetés).
- [ ] Régénérer toute clé ayant pu être exposée.
- [ ] `NOTIFICATIONS_MODE=live` seulement après validation visuelle du parcours.
