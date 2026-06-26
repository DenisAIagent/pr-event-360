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
3. Espace            Le journaliste consulte le lineup et soumet ses demandes
                     (interview ↔ artiste, reportage ↔ scène). → lignes `requests`
4. File / traitement L'attaché traite les demandes (file triée par score, par artiste,
                     par scène, ou planning par créneau). Notifications à chaque étape.
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

| Quota | Plafond | « Places utilisées » comptées |
|---|---|---|
| Interviews par **artiste** | `artists.itw_quota` sinon `event_configs.default_itw_quota` | demandes d'interview **accordées** (`transmise_prod`, `attente_artiste`, `acceptee`) |
| Photographes par **scène** | `event_configs.photo_quota_per_stage` | reportages photo **acceptés** sur la scène |

- `resolveInterviewQuota(artistQuota, defaultQuota)` : quota spécifique de l'artiste, sinon défaut.
- `hasRoom = used < limit`. Le reportage **vidéo** n'a pas de quota dédié.

## Liste d'attente & promotion

- À la **soumission** d'une demande, si le quota concerné est déjà atteint, la demande
  est placée automatiquement en `liste_attente` (statut système, non assignable à la main).
- Quand une place se **libère** (un statut accordé repasse en refusé/non traité), le
  service de promotion fait remonter la **meilleure** demande en attente pour ce même
  artiste / cette même scène (`packages/core/src/waitlist/promote.ts`), selon le score.

## Génération des créneaux d'interview

Depuis les **fenêtres de disponibilité** d'un artiste (`artist_windows`) et la config
(`itw_duration_min`, `itw_buffer_min`), le moteur génère des `interview_slots`
contigus (durée + battement) — `packages/core/src/slots/generateSlots.ts`. Le
journaliste choisit un créneau ; le **planning par créneau** du back-office les trie
chronologiquement (jour J).

## Notifications

Déclencheurs (`trigger_key`) : réception/acceptation/refus d'accréditation,
réception/acceptation/refus de demande, récapitulatifs (`daily_recap`/`weekly_recap`),
`newsletter`, plus réinitialisation de mot de passe et invitation (hors gabarits
d'événement).

- **Gabarits** : `email_templates` par (événement × langue × déclencheur × canal),
  avec valeurs par défaut multilingues semées à la création.
- **Variables** : `{{firstName}}`, `{{event}}`, etc.
- **Best-effort** : `sendNotification` ne lève jamais — une panne fournisseur ne casse
  pas le flux métier ; l'échec est journalisé et la notification persistée en `failed`
  (visible dans l'onglet Messages).
- **Mode simulation** (défaut) : rien n'est envoyé, tout est persisté pour visualisation.
- **Récapitulatifs** : un planificateur (`node-cron`, fuseau Europe/Paris) envoie les
  récaps quotidiens (08:00) et hebdomadaires (lundi 08:00) aux destinataires configurés.

## Clôture des inscriptions

`events.accreditation_deadline` (optionnel). Au-delà, le formulaire public renvoie
`registrationClosed = true` ; le front affiche un compte à rebours puis bascule en
« inscriptions closes ». Le même indicateur protège la soumission côté serveur.
