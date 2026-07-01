# Logique métier

Le cœur déterministe vit dans `packages/core` (fonctions **pures**, sans DB ni HTTP,
l'instant courant étant toujours injecté → testables sans infrastructure). Le serveur
fournit les comptages SQL et orchestre les effets de bord.

## Parcours journaliste (de bout en bout)

```
1. Accréditation     Le journaliste ouvre /accreditation/:eventId, remplit le formulaire
                     (consentement RGPD obligatoire). → ligne `journalists` (acc_status = pas_encore_traite)
2. Traitement        L'attaché accepte/refuse dans l'onglet Accréditations.
                     À l'acceptation : génération d'un `token` unique + email contenant
                     le lien personnel /espace/:token.
3. Accès             Le journaliste accède à son espace par le lien magique, OU se connecte
                     par email + mot de passe (compte par événement, défini depuis l'espace).
4. Espace            Il consulte le lineup, soumet ses demandes (interview ou reportage
                     photo/vidéo, toujours ↔ un artiste), suit leur statut, voit son
                     planning d'interviews et accède à la newsroom. → lignes `requests`
5. File / traitement L'attaché traite les demandes (file triée par score, par artiste,
                     ou planning par créneau) et déclenche la génération du planning.
                     Notifications à chaque étape.
6. Revue de presse   Après l'événement (fin + délai de publication choisi à l'inscription :
                     J+3 / J+8 / J+30), le journaliste reçoit un email l'invitant à déposer ses
                     retombées (liens/photos/vidéos) dans son espace → lignes `press_coverage`.
```

## Score de priorité

Calculé à la volée (jamais stocké), paramétrable par événement.

```
Score = (poids du type de média) × (multiplicateur du type de demande) + bonus d'ancienneté

bonus d'ancienneté = min( heures_pleines_d'attente × ageBonusPerHour , ageBonusCap )
```

- **Poids du type de média** : configuré dans `media_types` (ex. TV nationale = 100,
  presse nationale = 80, web/blog = 20).
- **Multiplicateur du type de demande** : `request_type_weights` (ex. interview 1.5,
  reportage vidéo 1.3, reportage photo 1.0).
- **Bonus d'ancienneté** : +`ageBonusPerHour` (défaut 1) par **heure pleine** d'attente,
  plafonné à `ageBonusCap` (défaut 24) → une vieille demande remonte sans jamais
  doubler indéfiniment les autres.

Implémentation : `packages/core/src/scoring/priorityScore.ts`. La file
(`GET /:eventId/requests`) trie par score **décroissant**.

## Quotas

Deux quotas, vérifiés à partir de comptages SQL (`checkQuota`,
`packages/core/src/quotas/checkQuota.ts`) :

Tous les quotas sont portés par l'**artiste** (c'est lui qui décide combien d'interviews,
de photographes dans le pit et de vidéastes il accepte) :

| Quota | Plafond | « Places utilisées » comptées |
|---|---|---|
| Interviews par artiste | `artists.itw_quota` sinon `event_configs.default_itw_quota` | demandes d'interview **accordées** (`transmise_prod`, `attente_artiste`, `acceptee`) |
| Photographes par artiste | `artists.photo_quota` (`NULL` ⇒ illimité) | reportages photo **acceptés** sur l'artiste |
| Vidéastes par artiste | `artists.video_quota` (`NULL` ⇒ illimité) | reportages vidéo **acceptés** sur l'artiste |

- `resolveInterviewQuota(artistQuota, defaultQuota)` : quota d'interview spécifique, sinon défaut.
- `hasRoom = used < limit`. Photo/vidéo sans quota défini (`NULL`) ⇒ **illimité** (aucune liste d'attente).

## Liste d'attente & promotion

- À la **soumission** d'une demande, si le quota concerné est déjà atteint, la demande
  est placée automatiquement en `liste_attente` (statut système, non assignable à la main).
- Quand une place se **libère** (un statut accordé repasse en refusé/non traité), le
  service de promotion fait remonter la **meilleure** demande en attente pour le **même
  artiste et le même type** (interview / photo / vidéo), selon le score
  (`packages/core/src/waitlist/promote.ts`).

## Créneaux & génération du planning

Depuis les **fenêtres de disponibilité** d'un artiste (`artist_windows`) et la config
(`itw_duration_min`, `itw_buffer_min`), le moteur génère des `interview_slots`
contigus (durée + battement) — `packages/core/src/slots/generateSlots.ts`.

Le journaliste **ne choisit pas** son créneau : c'est le système qui attribue, **par
priorité**. Le bouton **« Générer le planning »** (`POST /:eventId/planning/generate`,
`planningService`) regroupe les interviews **acceptées** par artiste, les trie par score
décroissant, et assigne le meilleur score au créneau le plus tôt, etc. — de façon
transactionnelle. Retour : `{ assigned, unscheduled }`. Chaque journaliste retrouve alors
son créneau dans son espace (« Mon planning ») ; le back-office l'affiche dans la vue
**planning par créneau** (chronologique, jour J).

## Notifications

Déclencheurs (`trigger_key`, gabarits d'événement) : `accreditation_received` /
`accreditation_accepted` / `accreditation_rejected`, `request_received` / `request_accepted` /
`request_rejected`, et `coverage_request` (collecte des retombées). Les récapitulatifs
(`daily_recap`/`weekly_recap`), `newsletter`, la réinitialisation de mot de passe et l'invitation
sont hors gabarits d'événement.

- **Gabarits** : `email_templates` par (événement × langue × déclencheur × canal),
  avec valeurs par défaut multilingues (fr/en/pt/es) semées à la création.
- **Variables** (`{{clé}}`) : `{{firstName}}`, `{{event}}`, `{{link}}`, `{{type}}` (libellé du type
  de demande), `{{artist}}`, `{{slot}}` (créneau attribué), `{{reportage}}` (règles/autorisation
  photo), `{{delay}}` (délai de publication, revue de presse). Une variable inconnue → chaîne vide,
  avec nettoyage typographique (espaces français préservés).
- **Nom d'expéditeur** : dérivé de l'événement — `eventSenderName(name)` = « *{name}* Press Team ».
  L'**adresse** d'envoi reste l'expéditeur Brevo vérifié (`BREVO_SENDER_EMAIL`) ; seul le nom affiché change.
- **Best-effort** : `sendNotification` ne lève jamais — une panne fournisseur ne casse
  pas le flux métier ; l'échec est journalisé et la notification persistée en `failed`
  (visible dans l'onglet Messages).
- **Mode simulation** (défaut) : rien n'est envoyé, tout est persisté pour visualisation.

### Tâches planifiées (`node-cron`, fuseau Europe/Paris)

| Cron | Tâche |
|---|---|
| `0 8 * * *` | Récapitulatifs **quotidiens** aux destinataires configurés |
| `0 8 * * 1` | Récapitulatifs **hebdomadaires** (lundi) |
| `30 3 * * *` | **Purge de rétention RGPD** : suppression des journalistes > 12 mois après l'événement |
| `0 9 * * *` | **Collecte des retombées** : email `coverage_request` aux accrédités dont `fin + délai de publication` est atteint |

## Revue de presse (collecte des retombées)

Après l'événement, la plateforme sollicite les accrédités acceptés pour constituer une **revue de
presse classée par catégorie de média**.

- **Envoi par journaliste, idempotent** : `listJournalistsForCoverageRequest()` sélectionne les
  accrédités `acceptee` dont `coverage_request_sent_at IS NULL` **et** `end_date + publish_delay_days`
  est dépassé ; après envoi, `touchJournalistCoverageSent(id)` horodate `journalists.coverage_request_sent_at`
  (pas de renvoi). Le **délai** (`publish_delay_days`, défaut 8) est choisi à l'inscription (3/8/30 j).
- **Dépôt** (espace journaliste) : lien externe **ou** média uploadé (Cloudinary, signature tokenisée
  `POST /:token/assets/sign`). Pour un **upload**, l'**autorisation d'archivage + usage promotionnel**
  est obligatoire (`archive_consent` **et** `promo_consent`, sinon 400) — écho au règlement accepté à
  l'accréditation. Catégories : presse écrite, web, TV, radio, réseaux sociaux, YouTube, podcast,
  photo, vidéo, autre.
- **Relance manuelle** (back-office) : `remindCoverage(eventId, journalistId?)` — un journaliste précis,
  ou par défaut tous les accrédités acceptés qui n'ont encore rien déposé.
- **Suivi** : `coverageStatsByEvent(eventId)` alimente le tableau « qui a contribué / en attente ».

## Clôture des inscriptions

`events.accreditation_deadline` (optionnel). Au-delà, le formulaire public renvoie
`registrationClosed = true` ; le front affiche un compte à rebours puis bascule en
« inscriptions closes ». Le même indicateur protège la soumission côté serveur.
