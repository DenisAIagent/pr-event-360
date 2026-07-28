# Domaines et sous-domaines

Chaque événement peut exposer ses surfaces publiques sur une adresse dédiée.

| Modèle | Exemple | Permission |
|---|---|---|
| Sous-domaine plateforme | `summit.<PLATFORM_BASE_DOMAIN>` | éditeur de l’événement |
| Domaine personnalisé | `presse.exemple.com` | super-admin plateforme |

Le domaine personnalisé est une opération plateforme, car son activation implique DNS, TLS et routage partagé.

## Sous-domaine plateforme

1. configurer un wildcard DNS `*.<base>` vers le service ;
2. provisionner le certificat wildcard ;
3. définir `PLATFORM_BASE_DOMAIN` sans protocole ;
4. l’éditeur choisit un slug via `PUT /api/admin/events/:eventId/subdomain`.

Le slug :

- est normalisé en minuscules ;
- accepte lettres ASCII, chiffres et tirets ;
- est unique ;
- refuse `www`, `admin`, `api`, `app`, `mail`, `static`, `assets` et `cdn`.

Sans `PLATFORM_BASE_DOMAIN`, le slug est conservé mais dormant.

## Domaine personnalisé

1. le super-admin saisit le domaine via `PUT /api/admin/events/:eventId/domain` ;
2. le client crée un CNAME vers `CUSTOM_DOMAIN_TARGET` ;
3. l’opérateur provisionne le TLS ;
4. le super-admin appelle `POST /:eventId/domain/verify` ;
5. le statut vérifié reflète la résolution CNAME, ou la correspondance A/AAAA avec la cible.

Le domaine :

- ne contient ni protocole ni chemin ;
- est normalisé ;
- est unique ;
- ne peut être un host réservé de la plateforme ;
- est invalidé dans le cache après modification.

## Routage

`siteService` résout le `Host` vers un événement avec cache. Pour une page publique :

1. le serveur injecte `__pr_event__` sous forme de JSON non exécutable ;
2. la SPA active le mode domaine ;
3. `/` sert l’accréditation ;
4. `/connexion` et `/newsroom` n’exigent plus l’ID dans l’URL.

Les routes `/api`, `/admin` et autres préfixes privés ne sont jamais remappées à partir d’un domaine client.

## TLS

- faible volume : ajouter chaque domaine au service Railway et attendre le certificat ;
- volume important : Cloudflare for SaaS ou solution équivalente.

La vérification DNS applicative ne remplace pas le certificat.

## Sécurité

- mutation domaine réservée au super-admin ;
- collision empêchée en base/service ;
- hôtes de la plateforme exclus ;
- `Host` normalisé et port supprimé ;
- valeurs injectées échappées ;
- URLs canoniques construites en HTTPS ;
- aucun domaine client ne permet de prendre le contrôle d’une route admin/API.

## Test local

```bash
curl -H "Host: presse.exemple.test" http://localhost:4000/
```

Vérifier la présence de `__pr_event__` et l’absence de données sensibles. Pour un test navigateur, mapper temporairement le domaine vers `127.0.0.1` et utiliser un environnement isolé.

## Dépannage

| Symptôme | Vérification |
|---|---|
| DNS non vérifié | CNAME/A, propagation, `CUSTOM_DOMAIN_TARGET` |
| erreur certificat | domaine ajouté au proxy/hébergeur |
| mauvais événement | unicité, cache invalidé, `Host` réel |
| API inaccessible | CORS, origine `CLIENT_URL`, reverse proxy |
| sitemap incorrect | `PUBLIC_BASE_URL` et état de publication |
