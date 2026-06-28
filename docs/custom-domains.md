# Domaines & sous-domaines (white-label)

Chaque événement peut servir ses **surfaces publiques** (accréditation, espace journaliste,
connexion, newsroom) sous une adresse dédiée, en URLs propres (sans `:eventId`). Deux modèles,
configurables par le client dans le wizard **Configuration** (onglet) ou dans **Paramètres** :

| Modèle | Exemple | Côté client | Côté opérateur |
|---|---|---|---|
| **Sous-domaine plateforme** | `rockinrio.<PLATFORM_BASE_DOMAIN>` | choisit un **identifiant** (slug) — rien d'autre | un **wildcard** `*.<base>` (DNS + TLS) **une seule fois** |
| **Domaine personnalisé** | `presse.mon-festival.com` | crée un **CNAME** | provisionner le **TLS par domaine** |

Le **sous-domaine** est le plus simple (vraiment self-service : aucun DNS/TLS par événement) ;
le **domaine personnalisé** offre le white-label total. Les deux coexistent.

## Comment ça marche (2 couches)

1. **Couche applicative** (intégrée) : un événement porte un `custom_domain`. Le serveur résout
   l'en-tête `Host` → événement (`siteService.resolveEventForHost`, cache mémoire) et **injecte**
   un bloc de données `<script type="application/json" id="__pr_event__">` dans la page (CSP-safe,
   non exécuté). La SPA le lit au démarrage (`client/src/lib/domainEvent.ts`) et passe en **mode
   domaine** : la racine `/` sert l'accréditation de cet événement, `/newsroom`, `/connexion`, etc.
2. **Couche TLS/DNS** (opérationnelle, hors app) : il faut un **certificat HTTPS** pour chaque
   domaine client. Voir « Provisionner le TLS » ci-dessous. Tant que le TLS n'est pas en place, le
   domaine n'est pas joignable en HTTPS (l'app est prête, elle attend juste le certificat).

> **Important** : les clients **n'ont pas accès à l'hébergeur**. Ils ne font qu'un **CNAME** chez
> leur registrar ; l'opérateur saisit le domaine en back-office et provisionne le TLS.

## Procédure (opérateur)

1. **Back-office** → événement → **Paramètres** → carte **« Domaine personnalisé »** : saisir le
   domaine (ex. `presse.mon-festival.com`) → **Enregistrer**. La cible CNAME s'affiche.
2. **Le client** crée chez son registrar un enregistrement **CNAME** :
   `presse.mon-festival.com` → **cible affichée** (`CUSTOM_DOMAIN_TARGET`, par défaut le host du
   service).
3. **Provisionner le TLS** (voir ci-dessous).
4. Revenir sur la carte → **« Vérifier le DNS »** : contrôle que le domaine pointe bien sur la cible
   (badge « Vérifié »). C'est informatif — la vérification DNS ne conditionne pas le service.

## Activer les sous-domaines plateforme (réglage opérateur, une fois)

1. Posséder un domaine de base (ex. `prevent360.app`) et créer un **wildcard DNS** `*.prevent360.app`
   → le service (ou le fallback Cloudflare).
2. Provisionner un **certificat wildcard** `*.prevent360.app` (Railway : ajouter le domaine wildcard
   au service ; ou Cloudflare). Un seul certificat couvre **tous** les sous-domaines.
3. Définir l'env **`PLATFORM_BASE_DOMAIN=prevent360.app`**. Dès lors, tout slug saisi par un client
   (`rockinrio` → `rockinrio.prevent360.app`) est servi automatiquement — **aucune action par
   événement**. Tant que `PLATFORM_BASE_DOMAIN` est absent, les slugs sont mémorisés mais dormants.

## Provisionner le TLS (domaines personnalisés) — deux chemins

| Chemin | Principe | Pour qui |
|---|---|---|
| **Railway (manuel)** | Ajouter le domaine au service Railway (dashboard ou API) → cert Let's Encrypt auto une fois le CNAME en place. | Une **poignée** de domaines |
| **Cloudflare for SaaS** | Mettre Cloudflare devant ; créer un *custom hostname* (API) → TLS émis **par domaine, automatiquement, à l'échelle**. Le client CNAME vers le *fallback hostname* Cloudflare. | Beaucoup de domaines / self-service |

La couche applicative est **identique** dans les deux cas ; seul le provisioning du certificat change.
`CUSTOM_DOMAIN_TARGET` (env) règle la cible CNAME affichée (host Railway, ou fallback Cloudflare).

## Test en local

- **Injection serveur** : `custom_domain` posé sur un event, build du client, serveur lancé, puis
  `curl -H "Host: <domaine>" localhost:4000/` → l'HTML contient le bloc `__pr_event__`.
- **Mode domaine navigateur** : mapper le domaine sur `127.0.0.1` (ex. `custom_domain='127.0.0.1'`)
  et ouvrir `http://127.0.0.1:4000/` → la racine sert l'accréditation de l'événement.

## Sécurité

- Le domaine est **affecté par l'opérateur** (`requireEventEditor`) ; contrainte **UNIQUE** → pas de
  collision/hijack. Le nom injecté est échappé (anti-XSS) ; l'API est **same-origin** par domaine.
