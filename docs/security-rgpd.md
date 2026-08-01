# Sécurité et RGPD

Dernière mise à jour : 1er août 2026.

## Authentification back-office

- mots de passe Argon2 ;
- JWT HS256, 12 h, `JWT_SECRET` ≥ 32 caractères ;
- JWT dans `pr360_session`, cookie `HttpOnly`, `Secure` en production, `SameSite=Lax` ;
- Bearer explicite accepté pour clients API/tests ;
- aucun stockage de session dans `localStorage` ;
- rôle, compte actif, abonnement, super-admin et changement de mot de passe relus en base ;
- `password_changed_at` révoque les JWT antérieurs ;
- réponses génériques et hash factice contre l’énumération/timing ;
- 10 tentatives de login par 15 minutes ;
- mots de passe : **12 caractères minimum**, 128 maximum (politique unifiée back-office + journaliste).

### CSRF

Pour toute mutation par cookie :

1. le navigateur envoie `pr360_csrf` ;
2. le client le copie dans `X-CSRF-Token` ;
3. le serveur compare à temps constant.

Le Bearer n’est pas envoyé automatiquement par un navigateur tiers. Le webhook Stripe utilise sa propre signature sur corps brut.

### MFA

TOTP obligatoire pour :

- `role = admin` ;
- `is_platform_admin = true`.

Sans MFA active, la session est limitée à `/me`, état/configuration/activation MFA et déconnexion.

Le ré-enrôlement écrit `mfa_pending_secret` sans écraser le secret actif. Le secret préparé n’est promu qu’après validation d’un code ; le changement exige aussi un code courant si la MFA est déjà active.

Google Identity applique la même politique MFA. L’ID token est vérifié côté serveur avec audience et email vérifié.

## Journalistes

### Lien d’espace et session

- 256 bits aléatoires ;
- hash SHA-256 uniquement en base ;
- expiration 7 jours ;
- rotation à l’acceptation, au renvoi du lien, au login par mot de passe **et à l’échange de session** (`POST /api/public/space/session`) ;
- après ouverture du lien magique, cookie HttpOnly `pr360_journalist` ; l’URL est nettoyée (`/espace`) ;
- les appels suivants passent par le segment `/me` (token lu dans le cookie) ;
- lookup par hash et contrôle de l’expiration ;
- `Referrer-Policy: no-referrer` pour ne pas transmettre le token de l’URL.

Un lien expiré est introuvable. Les logs de production n’affichent pas les tokens.

### Mot de passe

- compte scindé par événement ;
- Argon2 ;
- définition initiale seulement via un lien d’espace valide ;
- un lien seul ne permet pas de remplacer un mot de passe existant ;
- changement via reset email : token haché, usage unique, 1 h ;
- reset réussi révoque le lien d’espace ;
- login générique et limité à 10/15 min.

### Doublons

Un index unique partiel empêche deux nouvelles accréditations avec le même email normalisé dans un événement. Les doublons historiques sont conservés hors index.

## Autorisation et isolation

- organisation sur comptes et événements ;
- accès événement validé par `getAccessibleEventOrThrow` ;
- membres limités à `event_members` ;
- réponses 404 pour ne pas divulguer un autre tenant ;
- IDs enfants toujours recoupés avec `event_id` ;
- recherches et exports scopés ;
- intégrations et domaines personnalisés réservés au super-admin ;
- permissions d’écriture de configuration regroupées dans `requireEventEditor`.

### Conférences

- conférence, participant et journaliste du même événement ;
- accréditation acceptée ;
- type d’accréditation autorisé ;
- conférence sur invitation cachée sans invitation ;
- mutation RP réservée aux éditeurs ;
- capacité vérifiée sous transaction/verrou ;
- inscription unique par journaliste ;
- annulation publique limitée au propriétaire du token.

## Entrées, injections et contenu

- schémas Zod pour corps, paramètres significatifs et environnement ;
- requêtes SQL paramétrées ;
- aucun shell construit depuis une entrée HTTP ;
- contenus riches assainis avec `sanitize-html` ;
- CSP Helmet :
  - scripts limités à self et Google Identity ;
  - connexions limitées à API, Cloudinary, Google et Sentry ;
  - frames limitées à Google et YouTube privacy-enhanced ;
  - `object-src 'none'` et `base-uri 'self'` ;
- URLs médias/livestream externes forcées en HTTPS ;
- branding limité à HTTP(S) ou data URLs bitmap ; SVG/HTML/JS interdits ;
- JSON public limité à 100 Kio, admin à 6 Mio.

## Uploads

Le fichier va directement du navigateur vers Cloudinary :

- signature générée côté serveur ;
- dossier imposé `pr-event-360/<eventId>` ;
- preset obligatoirement signé (`unsigned=false`) ;
- le serveur vérifie chez Cloudinary que `max_file_size <= 209715200` ;
- formats signés : JPG/JPEG, PNG, WebP, GIF, AVIF, MP4, MOV, WebM, M4V et PDF ;
- SVG, HTML, JavaScript et exécutables exclus ;
- l’enregistrement du média revalide URL HTTPS et taille ≤ 200 Mio ;
- clé secrète Cloudinary jamais envoyée au client.

## SSRF et domaines

- le client ne choisit pas une URL arbitraire à télécharger côté serveur pour les médias ;
- vérification Cloudinary vers un endpoint fixe ;
- vérification DNS limitée au domaine normalisé et à la cible configurée ;
- hôtes réservés et domaines de la plateforme exclus ;
- le routage par `Host` ne s’applique pas aux routes privées/API ;
- données injectées dans le HTML échappées et sérialisées en JSON non exécutable.

## Facturation

- corps brut et signature `STRIPE_WEBHOOK_SECRET` ;
- vérification du prix, de la session et des métadonnées ;
- `stripe_events` empêche le retraitement ;
- aucun hash de mot de passe conservé dans `pending_signups` ;
- compte créé après preuve de paiement ou invitation valide.

## Secrets

### Environnement

`DATABASE_URL`, `JWT_SECRET`, `APP_ENCRYPTION_KEY`, Stripe et fournisseurs ne sont jamais committés.

### Base

Les clés configurées dans l’UI :

- sont réservées au super-admin ;
- sont chiffrées AES-256-GCM ;
- utilisent une clé maître de 32 octets base64 ;
- sont masquées à l’affichage ;
- retombent sur l’environnement si la valeur DB est absente.

Les tokens de reset, invitation et espace sont hashés.

## En-têtes et réseau

- HSTS 1 an, sous-domaines et preload ;
- CSP, nosniff et protections Helmet ;
- CORS sur l’origine exacte `CLIENT_URL` avec credentials ;
- confiance limitée à un proxy en production ;
- surfaces publiques 30 req/min ;
- auth sensible 10 req/15 min ;
- compteurs de limitation partagés via Redis si `REDIS_URL` est défini (cohérents entre instances, fail-open si Redis injoignable avec journalisation d’alerte), sinon en mémoire par processus ;
- `REQUIRE_REDIS=true` refuse le démarrage sans Redis (recommandé multi-instance) ;
- `GET /api/metrics` protégé par `METRICS_TOKEN` (Bearer) ; 404 en production sans secret ;
- appels sortants Brevo/Twilio bornés par un timeout de 8 s ;
- erreurs internes masquées en production.

## RGPD

- information + base art. 6.1.b pour le dossier d’accréditation (case informative, pas consentement fourre-tout) ;
- balancing test IL documenté pour les communications transactionnelles ([rgpd/balancing-test-interet-legitime.md](rgpd/balancing-test-interet-legitime.md)) ;
- score de priorité sans décision automatisée finale ;
- droit à l’effacement par cascade ;
- **export JSON art. 15/20** (espace journaliste + back-office) ;
- suppression d’un journaliste : demandes, conférences et retombées ;
- suppression événement/organisation : données rattachées ;
- purge automatique des journalistes 12 mois après la fin de l’événement ;
- purge des journaux d’audit et de notifications au-delà de 12 mois ;
- double consentement pour médias uploadés dans la revue de presse ;
- Sentry client avec `sendDefaultPii=false` ;
- rétention backups documentée ([rgpd/sauvegardes-retention.md](rgpd/sauvegardes-retention.md)) ;
- dossiers opérationnels dans [rgpd/](rgpd/).

## Checklist de production

- [ ] secrets forts et différents par environnement ;
- [ ] `ADMIN_*` vidés après bootstrap ;
- [ ] `METRICS_TOKEN` défini en production ;
- [ ] `REDIS_URL` (+ `REQUIRE_REDIS=true` si multi-instance) ;
- [ ] HTTPS et URLs publiques cohérentes ;
- [ ] compte bootstrap protégé et MFA activée ;
- [ ] migrations exécutées sur une sauvegarde testée ;
- [ ] preset Cloudinary signé et borné ;
- [ ] webhook Stripe configuré et testé ;
- [ ] expéditeur Brevo vérifié ;
- [ ] `NOTIFICATIONS_MODE=live` seulement après validation ;
- [ ] régions/DPA des sous-traitants confirmés ;
- [ ] test d’accès croisé entre deux tenants ;
- [ ] sauvegarde et restauration vérifiées.
