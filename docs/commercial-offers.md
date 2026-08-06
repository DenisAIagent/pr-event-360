# Offres commerciales PR Event 360

Dernière mise à jour : 2026-08-06.

## Positionnement

PR Event 360 vend un **environnement complet** de relations presse événementielles (accréditations, invitations, journalistes, équipes, badges, documents, exports) — pas seulement du stockage ou un accès logiciel générique.

**Règle principale :** 800 € HT par événement, 20 Go de stockage, Google Drive inclus.  
Les remises portent sur le **volume d’événements**, pas sur le retrait de fonctionnalités.

## Offres de lancement

| Offre | Prix HT | Crédits | Stockage | Checkout |
|---|---:|---:|---|---|
| Événement | 800 € | 1 | 20 Go | Stripe payment |
| Pack 3 | 2 100 € | 3 (12 mois) | 20 Go / evt | Stripe payment |
| Agence | 6 000 € / an | 10 / an | 20 Go / evt | Stripe subscription |
| Événement agence + | 450 € | +1 | 20 Go | Stripe payment |
| Média Plus | +200 € / evt | — | 100 Go | Stripe payment |
| Google Drive | Inclus | — | Chez le client | — |
| Sync avancée / Vidéo | Sur devis | — | Variable | Devis |

## Implémentation technique

### Catalogue

Source de vérité partagée : `@pr-event-360/core` → `commercialOffers.ts`.

### Données

Migration `1700000000054_commercial-plans-credits` :

- `organizations.commercial_plan`, `event_credits_balance` (NULL = illimité legacy/comped), `event_credits_expire_at`, `billing_source`
- `events.storage_quota_bytes`, `media_plus`, `credit_consumed`
- `pending_signups.plan_code`
- table `billing_ledger`

### Règles métier

1. **Création d’événement** : consomme 1 crédit si `event_credits_balance` n’est pas NULL ; sinon illimité (legacy/comped).
2. **Événement archivé** : ne restaure pas de crédit (pas de « recyclage » de licence).
3. **Inscription Stripe** : matérialise l’org + solde de crédits selon le plan.
4. **Invitation super-admin** : plan `comped`, crédits illimités.
5. **Achat compte existant** : `POST /api/admin/billing/purchase`.

### Configuration Stripe (super-admin ou env)

**Recommandé :** super-admin → **Intégrations → Stripe** (valeurs chiffrées en base, priment sur l’env, sans redéploiement Railway).

**Alternative / bootstrap :** variables d’environnement Railway :

```bash
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_EVENT=     # ou STRIPE_PRICE_ID en repli
STRIPE_PRICE_PACK3=
STRIPE_PRICE_AGENCY=    # mode subscription
STRIPE_PRICE_AGENCY_EXTRA=
STRIPE_PRICE_MEDIA_PLUS=
APP_ENCRYPTION_KEY=     # requis pour enregistrer les clés depuis l’UI
```

Priorité de résolution : **surcharge UI (DB) > environnement**.

### API

| Méthode | Chemin | Auth | Rôle |
|---|---|---|---|
| GET | `/api/admin/billing/config` | public | catalogue |
| POST | `/api/admin/billing/checkout` | public | inscription + `planId` |
| GET | `/api/admin/billing/status` | oui | solde crédits |
| POST | `/api/admin/billing/purchase` | admin org | achat complémentaire |

### UI

- Landing `#pricing` : 3 cartes (Événement, Pack 3, Agence)
- `/admin/abonnement` : sélection d’offre + checkout
- `/admin/facturation` : solde + achats (admin org)

## Migration

```bash
cd server && npm run migrate:up
```

Les organisations existantes restent en `commercial_plan=legacy` avec crédits **illimités** (grandfather).
