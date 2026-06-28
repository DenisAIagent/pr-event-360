# Rôles & permissions

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

Application côté serveur :
- `requireAuth` → JWT valide.
- `requireRole('admin')` → routes `/api/admin/team` et `/api/admin/settings`.
- `requireEventEditor` → routes d'édition (admin ou attache).
- `getAccessibleEventOrThrow` → isolation par appartenance sur toute route `/:eventId`.
- La **recherche globale** (`/api/admin/search`) applique le même périmètre : un non-admin ne
  trouve que les journalistes/événements de ses événements assignés.

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
