# Rôles, permissions et tenants

## Frontières d’accès

1. **Plateforme** : opérée par `is_platform_admin`.
2. **Organisation** : propriétaire de comptes et d’événements.
3. **Événement** : frontière de données métier.
4. **Journaliste** : ne voit que son propre espace et ses propres inscriptions.
5. **Contact production** : ne voit que les demandes visant les artistes qu'il représente, et n'y porte qu'un avis consultatif.

Un JWT prouve l’identité mais ne suffit pas : rôle, activation, abonnement, organisation, statut plateforme et MFA sont relus en base.

## Rôles

| Rôle | Description |
|---|---|
| `admin` | administre son organisation et son équipe |
| `attache` | configure et pilote les événements accessibles |
| `assistant` | consulte et traite les opérations, sans configuration |
| super-admin | `is_platform_admin=true`, opérations plateforme |

`admin` et super-admin doivent activer la MFA. Les rôles `attache` et `assistant` peuvent l’activer sans obligation.

## Accès aux événements

- admin : tous les événements de son organisation ;
- attaché/assistant : événements de `event_members` ;
- super-admin : peut changer de contexte d’organisation via les routes prévues ;
- un événement d’un autre tenant est traité comme introuvable.

## Matrice

| Action | Assistant | Attaché | Admin | Super-admin |
|---|:---:|:---:|:---:|:---:|
| Lister ses événements | oui | oui | oui | oui |
| Consulter dashboard, lineup, demandes | oui | oui | oui | oui |
| Traiter accréditations/demandes | oui | oui | oui | oui |
| Créer/configurer un événement | non | oui | oui | oui |
| Modifier lieux/participants/quotas | non | oui | oui | oui |
| Créer/publier une conférence | non | oui | oui | oui |
| Inviter et modifier une inscription conférence | non | oui | oui | oui |
| Générer le planning | non | oui | oui | oui |
| Gérer médias, contenus, newsletters | non | oui | oui | oui |
| Supprimer un événement | non | non | oui | oui |
| Gérer l’équipe de l’organisation | non | non | oui | oui |
| Choisir un sous-domaine plateforme | non | oui | oui | oui |
| Affecter/vérifier un domaine personnalisé | non | non | non | oui |
| Gérer intégrations partagées | non | non | non | oui |
| Gérer organisations et avis modérés | non | non | non | oui |

Les listes d’inscriptions et conférences sont consultables par un membre ayant accès à l’événement ; leurs mutations exigent `requireEventEditor`.

## Middlewares

| Middleware | Garantie |
|---|---|
| `requireAuth` | session/Bearer valide, compte actif, abonnement actif, droits courants, CSRF et MFA |
| `requireRole('admin')` | rôle organisation requis |
| `requireEventEditor` | `admin` ou `attache` |
| `requirePlatformAdmin` | drapeau plateforme courant |
| `getAccessibleEventOrThrow` | événement dans le tenant et les assignations |

## Protections métier

- impossible de supprimer ou désactiver le dernier admin ;
- impossible de se supprimer soi-même via la gestion d’équipe ;
- réattribution des événements lors de la suppression d’un membre ;
- assignations limitées aux événements de l’organisation ;
- domaine personnalisé réservé au super-admin ;
- participants, journalistes et conférences sont revérifiés contre le même `event_id` ;
- recherche globale limitée aux événements accessibles.

## Journaliste

Le token résout un seul `journalist_id`. Les routes publiques dérivent ensuite `event_id` et les dossiers d’upload depuis cette ligne, plutôt que d’accepter un tenant fourni par le client.

Pour une conférence :

- accréditation acceptée obligatoire ;
- type d’accréditation autorisé ;
- conférence du même événement ;
- conférence sur invitation invisible sans invitation ;
- le journaliste ne peut annuler que sa propre inscription.

## Contact production

Acteur externe, sans compte ni ligne `users`. Le jeton résout un seul
`production_contacts.id`, d'où découlent l'événement et le périmètre d'artistes
(`production_contact_artists`) — jamais fournis par le client.

- ne voit que les demandes visant ses artistes rattachés ;
- la liste d'attente lui est masquée (mécanique interne de quota) ;
- ni coordonnées du journaliste, ni score de priorité ;
- son avis est **consultatif** : il n'écrit que dans `request_reviews` et ne
  modifie ni statut, ni quota, ni liste d'attente. La décision reste à
  l'attaché de presse.
