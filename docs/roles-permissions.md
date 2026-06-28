# Rôles & permissions

## Multi-locataire (organisations)

L'application est **multi-locataire** : chaque client est une **organisation** (`organizations`)
isolée. `users` et `events` portent un `organization_id` ; toutes les listes sont scopées à
l'organisation de l'utilisateur. Un client s'inscrit en **self-service** (`POST /api/admin/auth/signup`)
→ création de l'organisation + son compte **admin**.

- **Isolation étanche** : un utilisateur ne voit/atteint que les données de SON organisation. Tenter
  d'accéder à un événement d'une autre organisation renvoie **404** (sans révéler son existence).
- **Super-admin plateforme** (`users.is_platform_admin`) : l'opérateur. Seul à gérer les **intégrations
  partagées** (clés Brevo/Twilio/Cloudinary, `/api/admin/settings`), non bloqué par le scoping.
- Les rôles ci-dessous (`admin/attache/assistant`) s'entendent **au sein d'une organisation**
  (« admin » = admin de SON organisation).

## Trois niveaux d'accès (`user_role`)

| Rôle | Portée |
|---|---|
| **admin** | Tout : tous les événements, gestion des comptes (équipe), réglages d'intégration (clés API), changement de rôles |
| **attache** (attaché de presse) | Gère à fond les événements **assignés** : config, lineup, branding, médias, communiqués, newsletters, traitement |
| **assistant** | Sur les événements **assignés** : consultation + traitement des demandes/accréditations. **Pas** d'édition de config, lineup, branding, ni de clés API |

## Appartenance aux événements

L'accès à un événement est régi par la table `event_members` :

- **admin** → accède à **tous** les événements (aucune ligne nécessaire).
- **attache / assistant** → accèdent uniquement aux événements où ils sont **membres**.
- Le créateur d'un événement en devient automatiquement membre.

```ts
// getAccessibleEventOrThrow(eventId, user)
admin            → accès direct
autre rôle       → exige une ligne event_members (sinon 403)
```

## Matrice (résumé)

| Action | admin | attache | assistant |
|---|:--:|:--:|:--:|
| Voir les événements assignés | tous | ✅ | ✅ |
| Créer un événement | ✅ | ✅ | — |
| Éditer config / lineup / branding / médias / CP / newsletters | ✅ | ✅ | — |
| Traiter accréditations & demandes | ✅ | ✅ | ✅ |
| Lire la file / le tableau de bord | ✅ | ✅ | ✅ |
| Gérer l'équipe (inviter, rôles, désactiver) | ✅ | — | — |
| Gérer les clés API (Intégrations) | ✅ | — | — |

Application côté serveur (le JWT porte `organizationId` + `isPlatformAdmin`) :
- `requireAuth` → JWT valide.
- `requireRole('admin')` → `/api/admin/team` (scopé à l'organisation de l'admin).
- `requirePlatformAdmin` → `/api/admin/settings` (intégrations partagées, super-admin uniquement).
- `requireEventEditor` → routes d'édition (admin ou attache).
- `getAccessibleEventOrThrow` → **isolation organisation** (404 si autre org) **puis** appartenance,
  sur toute route `/:eventId`. Les enfants d'un événement (journalistes, demandes, médias…) en héritent.
- **Équipe** : `getTeam`, invitations, changement de rôle/activation, assignation d'événements sont
  scopés à l'organisation (un admin ne touche que les comptes/événements de SON org).
- **Recherche globale** (`/api/admin/search`) : héritée du scoping (ne renvoie que l'org de l'utilisateur).

Côté front : la navigation et les onglets sont masqués selon le rôle ; le serveur reste
la source de vérité (un `assistant` qui force une route d'édition reçoit `403`).

## Cycle de vie d'un compte

1. **Bootstrap** : le 1ᵉʳ compte est créé via le script `seed` ; la migration 015 promeut
   le compte propriétaire historique en `admin`.
2. **Invitation** (admin) : `POST /team/invite` `{email, role, eventIds[]}` → email avec
   lien `/admin/accept-invite?token=…` (valable 7 jours). Le compte n'est créé qu'à
   l'acceptation (le collaborateur choisit son mot de passe).
3. **Rôle / activation** : modifiables par un admin. Garde-fou : impossible de
   rétrograder ou désactiver le **dernier admin actif**.
4. **Désactivation** : `users.active = false` → connexion refusée même avec le bon mot de passe.

> Un changement de rôle ne prend effet qu'à la **reconnexion** : le rôle est figé dans
> le JWT au moment du login.
