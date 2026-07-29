# Logique métier

Les décisions déterministes vivent dans `packages/core`. Le serveur ajoute les lectures SQL, transactions, contrôles d’accès et notifications.

## Profils d’événement

`EVENT_PROFILES` associe chaque `event_type` à ses libellés. `music` est le repli pour les événements historiques. Le type ne change pas les clés techniques :

- `artists` = artistes, exposants, intervenants, porte-paroles ou participants ;
- `stages` = scènes, espaces ou salles.

Les règles de demandes, quotas et conférences sont communes.

## Accréditation et accès

1. Soumission publique avec consentement → `journalists.acc_status = pas_encore_traite`.
2. Acceptation par l’équipe → émission d’un token 256 bits, email du lien.
3. Seul le hash SHA-256 et l’expiration à 7 jours sont stockés.
4. Tout renvoi du lien ou login par mot de passe fait tourner le token et invalide l’ancien.
5. Le mot de passe initial peut être créé depuis un lien valide.
6. S’il existe déjà, le changement exige un reset email, usage unique, 1 h ; le reset révoque le lien d’espace.

L’index partiel `uniq_journalists_event_email` empêche les doublons nouveaux par événement sans supprimer les doublons historiques.

## Score de priorité

```text
score = mediaWeight × requestTypeMultiplier
      + min(fullWaitingHours × ageBonusPerHour, ageBonusCap)
```

- calcul à la volée ;
- poids et multiplicateurs propres à l’événement ;
- tri décroissant ;
- aide au classement seulement, décision humaine.

## Demandes individuelles

Les types sont `interview`, `photo_report` et `video_report`. Un `artistId` de l’événement est toujours requis.

### Quotas

| Type | Limite | Occupation |
|---|---|---|
| Interview | quota participant ou défaut événement | `transmise_prod`, `attente_artiste`, `acceptee` |
| Photo | quota participant, `NULL` = illimité | reportages photo acceptés |
| Vidéo | quota participant, `NULL` = illimité | reportages vidéo acceptés |

Quota plein à la soumission → `liste_attente`. Quand une place se libère, la demande en attente au meilleur score, pour le même participant et le même type, est promue.

### Créneaux

Les fenêtres sont découpées selon `itw_duration_min + itw_buffer_min`. Le journaliste ne choisit pas un slot. `planningService` trie les interviews acceptées par score et affecte les slots les plus tôt, dans une transaction.

## Conférences de presse

### Cycle de vie

| Statut | Visibilité | Inscription |
|---|---|---|
| `draft` | back-office uniquement | fermée |
| `published` | journalistes éligibles | ouverte avant le début |
| `closed` | visible | fermée |
| `completed` | visible | fermée |

Une conférence `invite_only` n’est visible que si le journaliste possède déjà une inscription ou une invitation.

### Décision d’inscription

Ordre des règles :

1. vérifier que la conférence et le journaliste appartiennent au même événement ;
2. exiger une accréditation acceptée et un type autorisé ;
3. exiger `published` et une date de début future ;
4. verrouiller la conférence dans une transaction ;
5. appliquer `decidePressConferenceRegistration` :
   - déjà `registered`/`checked_in` : idempotent ;
   - `invite_only` sans `invited` : refus ;
   - `approval` sans invitation : `pending` ;
   - capacité atteinte : `waitlisted` ;
   - sinon : `registered`.

`registered` et `checked_in` occupent la capacité. `capacity = NULL` signifie illimité ; `0` place toute inscription autorisée en attente.

### Annulation et promotion

- une invitation déclinée devient `declined` ;
- les autres annulations deviennent `cancelled` ;
- si un statut occupé libère une place, la première ligne `waitlisted` est promue `registered` dans la même transaction ;
- une décision admin vers `registered` est ramenée à `waitlisted` si la capacité est pleine.

### Indépendance des workflows

Une conférence :

- peut être créée après la période d’accréditation ;
- peut associer plusieurs participants ;
- ne ferme pas automatiquement les formulaires individuels ;
- ne transforme ni ne supprime une `request` ;
- possède ses propres statuts et notifications.

## Notifications

Déclencheurs principaux :

- accréditation reçue, acceptée, refusée ;
- demande reçue, acceptée, refusée ;
- invitation conférence ;
- inscription, demande en attente et liste d’attente conférence ;
- promotion de liste d’attente ;
- demande de retombées ;
- récapitulatifs et newsletters.

Les gabarits sont multilingues. Un échec fournisseur est persisté mais ne rollback pas l’action métier. En `simulation`, aucun message externe n’est envoyé.

L’envoi d’une newsletter passe par une transition atomique `draft → sending` : deux déclenchements concurrents ne produisent qu’un seul envoi, le second est refusé.

## Tâches planifiées

Fuseau : Europe/Paris. Chaque tâche s’exécute sous verrou consultatif PostgreSQL (`pg_try_advisory_lock`) : plusieurs instances peuvent tourner sans doublonner un envoi ou une purge.

| Cron | Tâche |
|---|---|
| `0 8 * * *` | récapitulatif quotidien |
| `0 8 * * 1` | récapitulatif hebdomadaire |
| `30 3 * * *` | purge journalistes 12 mois après la fin |
| `45 3 * * *` | purge du journal d’audit au-delà de 12 mois |
| `0 9 * * *` | demande de retombées à fin + délai |
| `15 4 * * *` | purge du journal des notifications au-delà de 12 mois |

## Revue de presse

- invitation envoyée une seule fois via `coverage_request_sent_at` ;
- URLs HTTPS ;
- upload signé et limité ;
- upload média exige `archive_consent` et `promo_consent` ;
- suppression possible par le journaliste ou modération par un éditeur.

## Facturation

- le checkout ne conserve pas un hash de mot de passe choisi avant preuve ;
- Stripe Checkout porte une référence vers `pending_signups` ;
- session, prix, email et métadonnées sont vérifiés avant matérialisation ;
- l’événement Stripe est enregistré dans `stripe_events` pour l’idempotence ;
- un compte email reçoit un flux d’activation/réinitialisation après paiement ;
- un compte Google utilise une identité Google vérifiée.
