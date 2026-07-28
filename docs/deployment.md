# Déploiement et exploitation

## Production actuelle

- URL : [https://pr-event-360-production-a23e.up.railway.app/](https://pr-event-360-production-a23e.up.railway.app/)
- hébergeur : Railway ;
- santé : `GET /api/health` ;
- dernier déploiement vérifié avec la migration `0044_press-conferences`.

La région effective des services Railway/PostgreSQL doit être confirmée dans le dashboard avant toute affirmation RGPD.

## Variables d’environnement

### Requises

| Variable | Usage |
|---|---|
| `DATABASE_URL` | PostgreSQL |
| `JWT_SECRET` | JWT, ≥ 32 caractères |
| `PUBLIC_BASE_URL` | URL canonique et liens |
| `CLIENT_URL` | origine CORS et liens front |

`NODE_ENV` vaut `production` en production ; `PORT` est généralement injecté par Railway.

### Recommandées

| Variable | Usage |
|---|---|
| `APP_ENCRYPTION_KEY` | 32 octets base64, secrets DB |
| `ADMIN_EMAIL/PASSWORD/NAME` | bootstrap idempotent |
| `SENTRY_DSN` | erreurs serveur |
| `VITE_SENTRY_DSN` | erreurs client au build |

### Optionnelles

- Google : `GOOGLE_CLIENT_ID` ;
- Stripe : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` ;
- domaines : `CUSTOM_DOMAIN_TARGET`, `PLATFORM_BASE_DOMAIN` ;
- Brevo : `BREVO_API_KEY`, expéditeur et SMS ;
- Twilio : SID, token et numéro ;
- Cloudinary : cloud, clé, secret et preset signé.

Voir [.env.example](../.env.example).

## Secrets

```bash
openssl rand -hex 32
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

La première commande convient à `JWT_SECRET`. La seconde produit `APP_ENCRYPTION_KEY`.

## Build et tests avant déploiement

```bash
npm ci
npm test
npm --workspace server run test
npm --workspace server run typecheck
npm --workspace client run typecheck
npm run build
```

`npm run build` produit `client/dist`. Le serveur de production sert ce dossier.

## Commande de démarrage

```bash
npm start
```

Elle exécute `server start:prod` :

1. attend PostgreSQL ;
2. exécute `node-pg-migrate up` ;
3. lance le bootstrap admin si les variables existent ;
4. démarre Express.

Une migration échouée empêche le service de démarrer.

## Déploiement Railway

1. créer le service applicatif depuis le dépôt ;
2. ajouter PostgreSQL ;
3. renseigner les variables ;
4. utiliser `npm run build` comme build et `npm start` comme start si Railway ne les détecte pas ;
5. déployer ;
6. vérifier les logs de migrations ;
7. appeler `/api/health` ;
8. ouvrir login, accréditation, espace, conférence et newsroom ;
9. vérifier cookies Secure/HttpOnly, CSP et HSTS.

## Stripe

Le webhook doit viser :

```text
https://<domaine>/api/stripe/webhook
```

Renseigner le secret de signature associé. Tester au moins :

- checkout terminé ;
- duplication du même événement ;
- prix inattendu ;
- abonnement supprimé ;
- paiement échoué.

## Cloudinary

Créer un preset :

- signé, jamais unsigned ;
- `max_file_size` ≤ 209715200 ;
- formats conformes à [security-rgpd.md](security-rgpd.md#uploads).

Le serveur refuse de signer si le preset distant ne respecte pas ces règles.

## Notifications

1. garder `NOTIFICATIONS_MODE=simulation` ;
2. valider les gabarits et le journal Messages ;
3. vérifier l’expéditeur Brevo ;
4. configurer SMS si nécessaire ;
5. passer à `live`.

Une liste d’IP Brevo incompatible avec l’IP de sortie dynamique de Railway peut bloquer les envois ; privilégier une configuration adaptée à l’hébergeur.

## Migrations et rollback

Local :

```bash
npm run migrate:up
npm run migrate:down
```

Avant production :

- sauvegarder ;
- tester la chaîne complète sur une base vide ;
- tester la migration sur une copie ;
- déployer l’application compatible ;
- ne rollbacker qu’après vérification de l’impact sur les données.

La migration `0041` supprime le token journaliste brut après hashage. Son rollback recrée une colonne mais ne peut pas récupérer les valeurs brutes historiques.

## Sauvegardes

Le workflow `.github/workflows/db-backup.yml` effectue un `pg_dump` quotidien si `BACKUP_DATABASE_URL` est configuré dans les secrets GitHub.

Test de restauration :

```bash
pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" backup.dump
```

Ne pas restaurer directement en production pour un test. Utiliser une base isolée, appliquer les contrôles de comptage, puis détruire l’environnement de test.

## Runbook de vérification

```bash
curl -fsS https://<domaine>/api/health
```

Puis contrôler :

- migrations `0001` à `0044` ;
- login + MFA admin ;
- création d’un événement de chaque type ;
- création/publication d’une conférence ;
- inscription, liste d’attente, annulation et promotion ;
- refus d’un accès entre tenants ;
- upload d’un type permis et rejet d’un type interdit ;
- webhook Stripe idempotent ;
- tâches cron et simulation des notifications.

## Incident ou rollback

1. geler les écritures si l’intégrité est menacée ;
2. conserver logs et identifiants de déploiement ;
3. désactiver `live` pour les notifications si nécessaire ;
4. rollback applicatif seulement si le schéma reste compatible ;
5. restaurer depuis une sauvegarde vérifiée si données corrompues ;
6. appliquer la [procédure de violation](rgpd/procedure-violation.md) si des données personnelles sont concernées.
