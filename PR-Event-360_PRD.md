# PRD — PR Event 360

**Version :** 2.0

**Auteur :** Denis Adam

**Dernière mise à jour :** 18 juillet 2026

**Statut :** version implémentée et déployée

## 1. Vision

PR Event 360 est une plateforme SaaS de relations presse événementielles. Elle centralise l’accréditation, les demandes individuelles, les conférences de presse, le planning, les communications, la newsroom et la collecte des retombées.

Le produit s’adresse à plusieurs familles d’événements :

| Type | Libellé produit | Participants | Lieux |
|---|---|---|---|
| `music` | Festival / concert | artistes | scènes |
| `trade_show` | Salon / foire | exposants | espaces |
| `conference` | Conférence / séminaire | intervenants | salles |
| `corporate` | Événement corporate | porte-paroles | espaces |
| `other` | Autre événement | participants | espaces |

Le vocabulaire de l’interface s’adapte au type choisi. Le modèle technique conserve les noms historiques `artists` et `stages` afin de préserver les migrations et intégrations existantes.

### Problèmes résolus

- demandes reçues par email et tableurs difficiles à prioriser ;
- quotas et créneaux traités manuellement ;
- formats presse décidés tardivement ;
- absence de vue unique entre accréditation, interview, conférence et retombées ;
- communications multilingues et relances chronophages ;
- risque de mélange entre organisations ou événements.

### Proposition de valeur

1. **Centraliser** les journalistes, demandes, conférences et contenus dans un espace par événement.
2. **Aider à décider** grâce au score, aux quotas et aux listes d’attente, sans décision automatisée au sens de l’article 22 du RGPD.
3. **Rester flexible** : une conférence de presse peut être créée plus tard, lorsque le RP connaît réellement le format.
4. **Sécuriser** les accès, les données et la séparation entre tenants.
5. **Mesurer** la couverture après l’événement.

## 2. Personas et rôles

| Persona | Rôle produit | Besoin |
|---|---|---|
| Administrateur d’organisation | `admin` | équipe, événements, suppression et configuration |
| Attaché de presse | `attache` | configurer et piloter les opérations presse |
| Assistant presse | `assistant` | consulter et traiter les accréditations/demandes autorisées |
| Opérateur de la plateforme | `is_platform_admin` | organisations, intégrations, domaines et avis |
| Journaliste / photographe / vidéaste | public | accréditation, demandes, conférence, ressources et retombées |

La matrice détaillée se trouve dans [docs/roles-permissions.md](docs/roles-permissions.md).

## 3. Périmètre livré

### Gestion des événements

- création guidée avec choix obligatoire du type ;
- informations, langues, apparence, lieux, participants, quotas, date de clôture et récapitulatifs ;
- organisation et événement comme frontières de données ;
- sous-domaine plateforme et domaine personnalisé ;
- libellés contextuels dans le back-office et les surfaces publiques.

### Accréditations

- formulaire public FR/EN/PT/ES ;
- consentement RGPD obligatoire ;
- type presse, photo ou vidéo ;
- date limite et compte à rebours ;
- prévention des doublons par `(event_id, lower(email))` ;
- acceptation/refus et envoi d’un lien personnel à l’acceptation.

### Demandes individuelles

- interview, reportage photo ou reportage vidéo ;
- cible obligatoire : participant de l’événement ;
- score de priorité configurable ;
- quotas par participant ;
- liste d’attente et promotion ;
- génération transactionnelle du planning d’interviews.

### Conférences de presse

- création possible à tout moment par un éditeur de l’événement ;
- participants multiples, lieu, horaires, description, capacité, embargo et lien de diffusion HTTPS ;
- modes `open`, `approval` et `invite_only` ;
- états `draft`, `published`, `closed` et `completed` ;
- éligibilité par type d’accréditation ;
- invitations ciblées ;
- inscription journaliste, validation, liste d’attente, check-in, annulation et promotion ;
- notifications multilingues.

### Newsroom et communications

- médiathèque Cloudinary ;
- communiqués brouillon/publié avec SEO et Open Graph ;
- newsletters ciblées ;
- journal des messages ;
- récapitulatifs quotidiens ou hebdomadaires.

### Revue de presse

- délai déclaré J+3, J+8 ou J+30 ;
- demande automatique de retombées ;
- dépôt d’URLs HTTPS ou de médias ;
- consentements d’archivage et d’usage promotionnel pour les uploads ;
- suivi, relance et modération.

### Multi-tenant et abonnement

- organisations isolées ;
- membres assignés aux événements ;
- abonnement Stripe ;
- compte matérialisé seulement après paiement confirmé ou invitation valide ;
- super-administration séparée.

## 4. Décision produit : demandes individuelles et conférences

Une conférence de presse n’est **pas** une variante créée au moment de l’accréditation. Le RP peut ignorer à cette étape si une star, un intervenant ou un festival choisira ce format.

Règles retenues :

1. L’accréditation reste générique et ne demande pas au RP de choisir prématurément entre interview et conférence.
2. Les demandes individuelles restent disponibles selon les règles habituelles ; le produit ne cache pas automatiquement le formulaire sous prétexte qu’un participant serait « conférence uniquement ».
3. Quand la conférence est confirmée, le RP crée et publie une conférence distincte.
4. La conférence apparaît dans l’espace des journalistes éligibles. Pour `invite_only`, elle n’apparaît qu’aux journalistes invités.
5. Le bouton sert à **s’inscrire** ou à demander une place, pas seulement à afficher une information.
6. La création d’une conférence ne supprime, ne transforme et n’accepte jamais automatiquement une demande individuelle existante.
7. Le RP garde le contrôle des demandes individuelles : leur statut suit la machine à états habituelle.

Cette séparation permet par exemple d’organiser :

- une conférence avec une star en remplacement opérationnel de plusieurs interviews, sans altérer l’historique ;
- une conférence de fin de festival pour annoncer la fréquentation ;
- un point presse corporate ou institutionnel ;
- une session collective avec plusieurs intervenants ou exposants.

## 5. Parcours

### Journaliste

1. Ouvre le formulaire d’accréditation de l’événement.
2. Choisit sa langue, renseigne son profil et donne son consentement.
3. Reçoit une confirmation de réception.
4. Après acceptation, reçoit un lien personnel valable 7 jours.
5. Consulte son espace, crée si besoin un mot de passe initial, puis soumet des demandes individuelles.
6. Consulte l’onglet « Conférences de presse » :
   - `open` : inscription directe si une place est disponible ;
   - `approval` : demande placée en attente de validation ;
   - `invite_only` : accès uniquement après invitation.
7. Peut annuler sa participation ; une personne en attente est promue si une place occupée se libère.
8. Consulte son planning, la newsroom et dépose ses retombées.

Une connexion réussie par email/mot de passe émet un **nouveau** lien d’espace et invalide le précédent. Un mot de passe déjà défini n’est pas remplaçable par le seul lien d’espace : le journaliste utilise « mot de passe oublié ».

### Attaché de presse

1. Crée l’événement et choisit son type.
2. Configure les lieux, participants, quotas, règles et branding.
3. Traite les accréditations.
4. Pilote les demandes individuelles et génère le planning.
5. Lorsque le format est confirmé, crée une conférence, choisit son mode et la publie.
6. Invite éventuellement des journalistes, traite les demandes d’inscription et effectue le check-in.
7. Publie les ressources, communique et suit les retombées.

## 6. Règles métier

### Score des demandes

```text
score =
  poids du type de média
  × multiplicateur du type de demande
  + min(heures d’attente × bonus horaire, plafond)
```

Le score ordonne la file ; la décision reste humaine.

### Quotas individuels

- interview : quota participant, sinon quota par défaut de l’événement ;
- photo et vidéo : quota participant, `NULL` signifie illimité ;
- si le quota est atteint à la soumission, statut `liste_attente` ;
- quand une place se libère, meilleure demande du même participant et du même type promue.

### Planning

Les créneaux sont générés depuis les fenêtres des participants. Le journaliste ne choisit pas son créneau : le système attribue les interviews acceptées par score décroissant, dans une transaction.

### Capacité d’une conférence

Les statuts `registered` et `checked_in` occupent une place. Le contrôle de capacité est fait dans une transaction avec verrou de la conférence :

- capacité disponible : `registered` ;
- capacité atteinte : `waitlisted` ;
- mode sur validation sans invitation : `pending` ;
- mode invitation sans invitation valide : refus ;
- annulation d’une place occupée : promotion de la première personne en attente.

La répétition d’une inscription est idempotente.

### Visibilité d’une conférence

- `draft` : invisible du public ;
- `published` : visible et inscriptions ouvertes ;
- `closed` ou `completed` : visible, inscriptions fermées ;
- `invite_only` : invisible pour un journaliste sans inscription/invitation ;
- type d’accréditation non autorisé : visible le cas échéant, mais non éligible.

## 7. Modèle fonctionnel

```text
ORGANIZATION
├── USERS
└── EVENTS
    ├── EVENT_CONFIG / BRANDING / TEMPLATES
    ├── STAGES                    ← lieux, libellé contextualisé
    ├── ARTISTS                   ← participants, libellé contextualisé
    │   ├── WINDOWS
    │   └── INTERVIEW_SLOTS
    ├── JOURNALISTS
    │   ├── REQUESTS
    │   ├── PRESS_COVERAGE
    │   └── PRESS_CONFERENCE_REGISTRATIONS
    ├── PRESS_CONFERENCES
    │   └── PRESS_CONFERENCE_PARTICIPANTS
    ├── MEDIA_ASSETS / PRESS_RELEASES
    └── NEWSLETTERS / NOTIFICATIONS
```

Le schéma détaillé se trouve dans [docs/data-model.md](docs/data-model.md).

## 8. Exigences non fonctionnelles

### Sécurité

- cookie de session HttpOnly, Secure en production, SameSite=Lax ;
- protection CSRF double-submit pour les mutations par cookie ;
- JWT HS256 12 h et secret d’au moins 32 caractères ;
- droits, activation, statut plateforme, abonnement et MFA relus en base ;
- MFA obligatoire pour `admin` et super-admin ;
- mots de passe Argon2 ;
- tokens aléatoires, hashés et expirants ;
- validation Zod, requêtes SQL paramétrées, CSP, HSTS et rate limiting ;
- isolation stricte par organisation et événement ;
- upload direct signé, formats et taille bornés.

### Confidentialité

- consentement explicite ;
- minimisation ;
- suppression en cascade ;
- purge automatique à 12 mois après l’événement ;
- absence de PII par défaut dans Sentry ;
- journalisation sans tokens en production.

### Fiabilité

- migrations réversibles ;
- webhooks Stripe idempotents ;
- transactions pour quotas/capacités ;
- notifications best-effort sans rollback du métier ;
- sauvegarde externe PostgreSQL.

## 9. Critères d’acceptation

1. Le type d’événement est obligatoire à la création et les libellés s’adaptent.
2. Un événement historique sans valeur explicite reste `music`.
3. Un utilisateur ne peut accéder qu’aux événements de son organisation et à ses assignations.
4. Une conférence en brouillon est invisible aux journalistes.
5. Une conférence sur invitation n’est visible et accessible qu’aux invités.
6. Une conférence sur validation produit `pending` jusqu’à décision du RP.
7. Une capacité pleine produit `waitlisted` sans sur-réservation concurrente.
8. Une annulation libérant une place promeut la première inscription en attente.
9. Une conférence ne modifie pas les demandes individuelles.
10. Les liens d’espace ne sont jamais stockés en clair et expirent après 7 jours.
11. Le changement de mot de passe back-office invalide les anciennes sessions.
12. Les comptes privilégiés sans MFA ne peuvent atteindre que l’enrôlement et la déconnexion.

## 10. Hors périmètre actuel

- billetterie grand public ;
- logistique technique de scène ou de stand ;
- comptabilité complète ;
- vidéoconférence hébergée par PR Event 360 : seul un lien HTTPS externe peut être référencé ;
- conversion automatique d’interviews en inscription à une conférence ;
- accès dédié des productions/participants ;
- export self-service complet des données personnelles.

## 11. Indicateurs produit

- délai moyen de traitement d’une accréditation ;
- taux d’acceptation et de liste d’attente ;
- taux d’inscription et de présence aux conférences ;
- taux de remplissage par conférence ;
- interviews planifiées / non planifiées ;
- taux de contribution à la revue de presse ;
- volume et catégorie des retombées ;
- incidents d’isolation ou de sécurité : objectif zéro.

---

Documents d’implémentation : [fonctionnalités](docs/features.md), [logique métier](docs/business-logic.md), [API](docs/api.md), [sécurité](docs/security-rgpd.md).
