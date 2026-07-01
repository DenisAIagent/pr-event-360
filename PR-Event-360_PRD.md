# PRD — PR Event 360

**Product Requirements Document**
**Version :** 1.0 (MVP)
**Auteur :** Denis Adam
**Date :** Juin 2026
**Statut :** Spécification validée — prêt pour développement

---

## 1. Vision produit

### 1.1 Résumé exécutif

**PR Event 360** est une plateforme SaaS de gestion des accréditations presse en festival et événement. Elle permet aux attachés de presse et équipes presse de centraliser, traiter et suivre l'intégralité du cycle de vie des demandes journalistes : accréditations, interviews, captations photo et vidéo — du premier formulaire public jusqu'à la confirmation d'acceptation, avec notifications automatiques par email et SMS.

L'outil remplace les workflows fragmentés (emails dispersés, tableurs partagés, relances manuelles) par un pipeline unique, traçable et multilingue, structuré autour de l'**événement comme entité racine** : chaque festival possède sa propre configuration, son lineup, ses quotas et ses règles de priorité, sans aucun mélange entre événements.

### 1.2 Problème résolu

Un attaché de presse en festival fait face à un afflux massif et simultané de demandes hétérogènes, dans un contexte de forte contrainte (places limitées en pit photo, créneaux d'interview rares, prod artiste lente à répondre, presse internationale). Les outils actuels ne gèrent ni les quotas, ni la priorisation par type de média, ni le suivi granulaire du statut de chaque demande, ni la communication multilingue. Résultat : surcharge, erreurs de double-booking, demandes oubliées, et impossibilité de mesurer les retombées presse.

### 1.3 Proposition de valeur

PR Event 360 apporte trois bénéfices différenciants :

1. **Centralisation et traçabilité** — toutes les demandes dans un back-office unique, chacune suivie étape par étape avec un historique complet de ses statuts.
2. **Automatisation intelligente** — quotas appliqués automatiquement, liste d'attente auto-promue, score de priorité calculé par type de média, créneaux d'interview générés automatiquement, notifications email/SMS déclenchées à chaque transition de statut.
3. **Portée internationale** — formulaires publics et communications en français, anglais, portugais et espagnol, dans la langue choisie par chaque journaliste.

### 1.4 Cibles utilisateurs

| Persona | Rôle | Besoins principaux |
|---|---|---|
| **Attaché de presse principal** | Administre l'événement, valide les accréditations, traite les demandes prioritaires | Vue d'ensemble, filtrage, priorisation, contrôle total de la config |
| **Assistant·e presse** | Traite les demandes, met à jour les statuts | Accès au pipeline de traitement sans droits de configuration |
| **Prod artiste** (v1.5+) | Répond aux demandes d'interview la concernant | Vue restreinte aux demandes transmises |
| **Journaliste / Photographe / Vidéaste** | Demande accréditation puis interviews/reportages | Formulaires publics simples, multilingues, suivi de ses demandes |

---

## 2. Périmètre fonctionnel

### 2.1 Inclus dans le MVP (v1)

- Gestion d'événements (création, configuration paramétrable par event)
- Formulaire public de demande d'accréditation (multilingue FR/EN/PT/ES)
- Intégration en base de données et confirmation automatique de réception
- Traitement des accréditations (acceptation / refus) par le back-office
- Génération de liens uniques tokenisés par journaliste après acceptation
- Formulaire public de demandes (interviews, reportages photo, reportages vidéo)
- Sélecteur d'artistes alimenté par le lineup prérempli
- Génération automatique des créneaux d'interview (durée + buffer paramétrables)
- Système de quotas (interviews par artiste, photographes par scène)
- Liste d'attente automatique et promotion au meilleur score quand une place se libère
- Score de priorité pondéré et paramétrable par type de média et type de demande
- Back-office de traitement : filtrage par type, tri par priorité
- Suivi de statut à 6 états avec historique horodaté par demande
- Templates d'emails éditables, par langue, avec variables
- Notifications email et SMS à chaque transition clé

### 2.2 Reporté en v1.5

- Badge PDF avec QR code unique et check-in jour-J par scan
- Planning visuel des créneaux d'interview (vue calendrier)
- Détection de conflits d'agenda (journaliste ou artiste double-booké)

### 2.3 Reporté en v2

- Dashboard des retombées presse (collecte des liens d'articles, portée cumulée, ratio accréditations/publications)
- Multi-festival avancé avec tableau de bord inter-événements
- Communication bidirectionnelle complète (contre-propositions de créneaux)
- Rôle prod artiste avec accès dédié

### 2.4 Hors périmètre

- Billetterie grand public
- Gestion de la logistique technique scène (son, lumière)
- Comptabilité et facturation

---

## 3. Architecture de l'information

### 3.1 Hiérarchie des entités

L'**événement** est l'entité racine. Tout en dépend par un `event_id`, garantissant l'isolation totale entre festivals.

```
EVENT (entité racine)
│
├── CONFIG (paramétrable, propre à chaque event)
│     ├── Durée d'interview · Buffer entre interviews
│     ├── Quota interviews par artiste (défaut)
│     ├── Quota photographes par scène
│     ├── Langues actives
│     ├── Pondération des médias (score de priorité)
│     ├── Multiplicateurs par type de demande
│     └── Templates d'emails (par langue)
│
├── STAGES (scènes de l'événement)
│
├── ARTISTS (lineup)
│     └── Tranches de disponibilité → créneaux auto-générés
│
├── JOURNALISTS (demandeurs accrédités ou non)
│     └── Lien unique tokenisé
│
└── REQUESTS (demandes)
      ├── Accréditation
      ├── Interview (→ artiste + créneau)
      └── Reportage photo / vidéo (→ scène)
            └── Historique de statuts horodaté
```

### 3.2 Modèle de données

**Event**

| Champ | Type | Description |
|---|---|---|
| `id` | string (PK) | Identifiant unique |
| `name` | string | Nom de l'événement |
| `location` | string | Lieu |
| `dates` | string | Dates de l'événement |
| `languages` | string[] | Langues actives (sous-ensemble de fr/en/pt/es) |
| `config` | object | Configuration paramétrable (voir ci-dessous) |

**Event.config**

| Champ | Type | Description |
|---|---|---|
| `itwDuration` | int | Durée d'une interview, en minutes |
| `itwBuffer` | int | Temps tampon entre deux interviews, en minutes |
| `defaultItwQuota` | int | Quota d'interviews par défaut par artiste |
| `photoQuotaPerStage` | int | Quota de photographes par scène |
| `mediaWeights` | map<string,int> | Poids de priorité par type de média |
| `typeWeights` | map<string,float> | Multiplicateur de priorité par type de demande |
| `emailTemplates` | map<string,object> | Templates par langue et par événement déclencheur |

**Stage**

| Champ | Type | Description |
|---|---|---|
| `id` | string (PK) | Identifiant |
| `eventId` | string (FK) | Événement de rattachement |
| `name` | string | Nom de la scène |

**Artist**

| Champ | Type | Description |
|---|---|---|
| `id` | string (PK) | Identifiant |
| `eventId` | string (FK) | Événement de rattachement |
| `name` | string | Nom de l'artiste |
| `stageId` | string (FK) | Scène principale |
| `itwQuota` | int | Quota d'interviews spécifique (sinon valeur par défaut de l'event) |
| `windows` | object[] | Tranches de disponibilité interview (jour, début, fin) |
| `slots` | object[] | Créneaux générés automatiquement depuis les tranches |

**Journalist**

| Champ | Type | Description |
|---|---|---|
| `id` | string (PK) | Identifiant |
| `eventId` | string (FK) | Événement de rattachement |
| `token` | string | Lien unique tokenisé (généré à l'acceptation) |
| `firstName`, `lastName` | string | Identité |
| `email`, `phone` | string | Coordonnées (phone pour SMS) |
| `media` | string | Nom du média / rédaction |
| `mediaType` | string | Type de média (détermine le poids de priorité) |
| `audience` | string | Audience / tirage (aide à la décision) |
| `prevArticle` | string | Lien d'un article précédent (validation de légitimité) |
| `lang` | string | Langue de communication |
| `accreditationType` | enum | press / photo / video |
| `accStatus` | enum | Statut de l'accréditation |
| `commitPublish` | bool | Engagement à créditer et envoyer la publication |
| `consent` | bool | Consentement RGPD |

**Request**

| Champ | Type | Description |
|---|---|---|
| `id` | string (PK) | Identifiant |
| `eventId` | string (FK) | Événement de rattachement |
| `journalistId` | string (FK) | Demandeur |
| `type` | enum | interview / photoReport / videoReport |
| `artistId` | string (FK, nullable) | Artiste visé (interviews) |
| `slotId` | string (nullable) | Créneau souhaité (interviews) |
| `stageId` | string (FK, nullable) | Scène visée (reportages) |
| `message` | string | Précisions du demandeur |
| `status` | enum | Statut courant (voir machine à états) |
| `createdAt` | timestamp | Date de soumission |
| `history` | object[] | Historique horodaté des changements de statut |

### 3.3 Choix technique : base relationnelle

Le modèle est fortement relationnel : un journaliste a plusieurs demandes, une demande cible un artiste ou une scène, chaque entité porte un historique, et l'intégrité référentielle compte (la suppression d'un artiste ne doit pas casser les demandes liées). **PostgreSQL** est recommandé plutôt qu'une base documentaire, qui obligerait à dupliquer ou recoder cette logique.

---

## 4. Parcours utilisateurs et flux

### 4.1 Flux nominal complet

```
[Formulaire public d'accréditation]
        │
        ▼
[Enregistrement en base · statut accréditation = "Pas encore traité"]
        │
        ▼
[Email automatique de confirmation de réception]
        │
        ▼
[Back-office : l'attaché traite → Acceptée / Refusée]
        │
   ┌────┴─────┐
   ▼          ▼
Refusée    Acceptée
   │          │
   ▼          ▼
[Email]   [Email d'acceptation + lien unique tokenisé]
              │
              ▼
[Formulaire public de demandes — sélecteur d'artistes alimenté par le lineup]
              │
              ▼
[Soumission interview / reportage photo / reportage vidéo]
              │
        ┌─────┴──────┐
        ▼            ▼
   Quota OK      Quota atteint
        │            │
        ▼            ▼
"Pas encore     "Liste d'attente"
   traité"          (auto)
        │
        ▼
[Email de confirmation de réception de la demande]
        │
        ▼
[Back-office : traitement, filtrage par type, tri par priorité]
        │
        ▼
[Transitions de statut → notifications email/SMS aux étapes clés]
```

### 4.2 Parcours journaliste (côté public)

1. Le journaliste accède au formulaire d'accréditation dans sa langue.
2. Il renseigne identité, coordonnées, média, type de média, type d'accréditation, et coche l'engagement de publication et le consentement RGPD.
3. À la soumission, il reçoit immédiatement un email de confirmation de réception.
4. Une fois son accréditation acceptée, il reçoit un email avec un lien unique et sécurisé vers le formulaire de demandes.
5. Via ce lien, il sélectionne un type de demande, un artiste (issu du lineup) et un créneau, ou une scène pour un reportage.
6. Il reçoit une confirmation de réception de chaque demande et peut suivre l'état de ses demandes depuis le formulaire.

### 4.3 Parcours attaché de presse (back-office)

1. **Création de l'événement** : nom, lieu, dates, langues, puis configuration (durées, quotas, pondérations, templates).
2. **Construction du lineup** : ajout des artistes avec leurs scènes et tranches de disponibilité ; les créneaux d'interview sont générés automatiquement.
3. **Traitement des accréditations** : acceptation ou refus, avec génération automatique du lien tokenisé à l'acceptation.
4. **Traitement des demandes** : consultation de la file triée par score de priorité, filtrage par type (accréditation, interview, reportage) selon l'urgence, mise à jour du statut de chaque demande.
5. **Suivi** : chaque demande affiche son statut courant et son historique ; les KPI donnent une vue d'ensemble.

---

## 5. Spécifications fonctionnelles détaillées

### 5.1 Gestion des événements

L'attaché peut créer plusieurs événements. Chaque événement est totalement isolé : ses artistes, journalistes, demandes et sa configuration ne sont jamais visibles depuis un autre événement. Toute la configuration est éditable à tout moment et s'applique aux nouveaux calculs (la modification de la durée d'interview régénère les créneaux des artistes ajoutés ensuite).

### 5.2 Formulaire d'accréditation

Formulaire public, accessible sans authentification, affiché dans la langue sélectionnée. Champs : prénom, nom, email, téléphone, média, type de média, audience/tirage, lien d'article précédent, type d'accréditation (presse / photo / vidéo), engagement de publication, consentement RGPD. La soumission requiert au minimum le prénom, l'email et le consentement RGPD. Elle crée le journaliste avec le statut « Pas encore traité » et déclenche l'email de confirmation de réception.

### 5.3 Liens uniques tokenisés

À l'acceptation d'une accréditation, le système génère un token unique, non devinable, propre au journaliste. Le lien menant au formulaire de demandes intègre ce token, ce qui sécurise l'accès (chaque journaliste n'accède qu'à son propre espace), rend l'accès traçable, et évite tout partage générique non maîtrisé.

### 5.4 Lineup et génération automatique des créneaux

L'attaché ajoute chaque artiste avec une ou plusieurs tranches de disponibilité (jour, heure de début, heure de fin). Le système génère automatiquement les créneaux d'interview en découpant chaque tranche selon la durée d'interview augmentée du buffer configurés pour l'événement. Exemple : une disponibilité de 14h00 à 16h00, avec interviews de 15 minutes et buffer de 5 minutes, produit des créneaux à 14h00, 14h20, 14h40, etc. Ces créneaux alimentent le sélecteur du formulaire de demandes.

### 5.5 Quotas et liste d'attente

Deux quotas sont gérés. Le **quota d'interviews par artiste** plafonne le nombre d'interviews accordées (statuts acceptée, transmise prod ou en attente artiste). Le **quota de photographes par scène** plafonne le nombre de reportages photo acceptés sur une même scène. Lorsqu'une demande arrive et que le quota correspondant est atteint, elle est automatiquement placée en « Liste d'attente » au lieu d'entrer dans la file de traitement. Lorsqu'une place se libère (désistement, refus), la demande en liste d'attente au meilleur score de priorité est éligible à la promotion.

### 5.6 Système de priorisation

Chaque demande reçoit un score de priorité calculé ainsi :

```
Score = (poids du type de média) × (multiplicateur du type de demande) + (bonus d'ancienneté)
```

Le poids du type de média et le multiplicateur du type de demande sont entièrement paramétrables par événement. Le bonus d'ancienneté ajoute un point par heure d'attente, plafonné à 24, pour qu'une demande ancienne ne soit jamais indéfiniment dépassée. La file du back-office est triée par score décroissant, tout en restant filtrable manuellement par type pour respecter les priorités de traitement propres à l'attaché.

**Exemple de configuration et de calcul :**

| Type de média | Poids |
|---|---|
| TV nationale | 100 |
| Presse nationale | 80 |
| Radio | 60 |
| Presse régionale | 40 |
| Web / Blog | 20 |

| Type de demande | Multiplicateur |
|---|---|
| Interview | × 1,5 |
| Reportage vidéo | × 1,3 |
| Reportage photo | × 1,0 |

Une interview demandée par une TV nationale obtient 100 × 1,5 = 150, traitée avant une accréditation de blog à 20 × 0,8 = 16.

### 5.7 Machine à états des demandes

Chaque demande suit un cycle à six statuts :

| Statut | Signification |
|---|---|
| **Pas encore traité** | Demande reçue, aucune action engagée |
| **En cours de traitement** | L'attaché examine la demande |
| **Transmise à la prod artiste** | La demande a été relayée à l'équipe de l'artiste |
| **En attente de réponse artiste** | En attente du retour de la prod |
| **Acceptée** | Demande validée |
| **Refusée** | Demande non retenue |

Un statut supplémentaire, **Liste d'attente**, est attribué automatiquement par le système lorsqu'un quota est atteint. Chaque changement de statut est horodaté et conservé dans l'historique de la demande, offrant une traçabilité complète de son traitement.

### 5.8 Notifications email et SMS

Le système déclenche des communications automatiques aux transitions clés : confirmation de réception d'accréditation, acceptation d'accréditation (avec lien tokenisé), refus d'accréditation, confirmation de réception de demande, acceptation et refus de demande. Les textes proviennent de **templates éditables par l'attaché**, déclinés par langue, et supportant des variables (prénom, artiste, créneau, nom de l'événement). Les notifications sont envoyées dans la langue choisie par le journaliste. Le SMS est utilisé pour les communications urgentes (acceptation, rappel de créneau).

### 5.9 Back-office — traitement et filtrage

Le back-office présente la file des demandes triée par score de priorité décroissant. L'attaché filtre par type de demande (toutes, interviews, reportages photo, reportages vidéo) et par statut. Chaque demande affiche le score, l'information de quota associée (places utilisées sur places totales), l'identité et le média du demandeur, l'objet (artiste ou scène), le message, le statut courant et les actions de transition. Des indicateurs synthétiques (nombre total de demandes, répartition par type, demandes en liste d'attente, nombre de journalistes) donnent une vue d'ensemble immédiate.

### 5.10 Multilingue

Les formulaires publics et l'ensemble des communications sont disponibles en français, anglais, portugais et espagnol. La langue est choisie par le journaliste et conservée dans son profil ; toutes les notifications qui lui sont adressées emploient cette langue. Le back-office est en français pour l'équipe presse.

---

## 6. Exigences non fonctionnelles

### 6.1 Conformité RGPD

La collecte de données journalistes impose : consentement explicite recueilli à la soumission, finalité claire (gestion de l'accréditation pour l'événement), durée de conservation définie, et droit à l'effacement. Le double opt-in et la documentation des traitements (registre) sont requis. Les données sont rattachées à un événement et purgeables à sa clôture.

### 6.2 Sécurité

Les liens d'accès au formulaire de demandes reposent sur des tokens non devinables, propres à chaque journaliste. Les identifiants de services externes (envoi email/SMS) sont stockés en variables d'environnement, jamais en dur. L'accès au back-office est authentifié.

### 6.3 Performance et robustesse

L'interface du back-office doit rester fluide avec plusieurs centaines de demandes. Le calcul des scores et le tri sont effectués à la volée. Une vue mobile légère est nécessaire pour le terrain, où la connectivité réseau peut être dégradée.

### 6.4 Internationalisation

L'architecture sépare les chaînes de texte du code, pour permettre l'ajout ultérieur de langues sans refonte. Les formats de date et d'heure respectent les conventions locales.

---

## 7. Stack technique recommandée

| Couche | Choix | Justification |
|---|---|---|
| **Frontend** | React + Vite | Formulaires publics et back-office réactifs |
| **Backend** | Node.js + Express | API REST, déploiement simple |
| **Base de données** | PostgreSQL | Modèle relationnel, intégrité référentielle |
| **Hébergement** | Railway | Déploiement et base managés |
| **Emails** | Brevo (API) | Templates, déclivité multilingue |
| **SMS** | Brevo SMS ou Twilio | Notifications urgentes |

L'envoi d'emails et de SMS doit être abstrait derrière une couche de service, afin de pouvoir démarrer en simulation (journalisation et visualisation des messages) avant de brancher le fournisseur réel.

---

## 8. Critères d'acceptation du MVP

Le MVP est considéré comme livré lorsque l'ensemble des conditions suivantes sont vérifiées :

1. Un attaché peut créer un événement et le configurer entièrement (durées, quotas, pondérations, langues, templates).
2. Un attaché peut construire un lineup, et les créneaux d'interview sont générés automatiquement à partir des tranches de disponibilité.
3. Un journaliste peut soumettre une demande d'accréditation dans l'une des quatre langues et reçoit une confirmation de réception.
4. Un attaché peut accepter ou refuser une accréditation ; l'acceptation génère un lien tokenisé et envoie l'email correspondant.
5. Un journaliste accrédité peut soumettre des demandes d'interview et de reportage, avec un sélecteur d'artistes alimenté par le lineup, et reçoit une confirmation.
6. Une demande dépassant un quota est automatiquement placée en liste d'attente.
7. Le back-office trie les demandes par score de priorité, permet le filtrage par type et par statut, et affiche les quotas.
8. Chaque demande peut passer par les six statuts, avec historique horodaté, et les transitions clés déclenchent des notifications.
9. Les communications sont envoyées dans la langue du journaliste, à partir de templates éditables.
10. Aucune donnée n'est partagée entre deux événements distincts.

---

## 9. Évolutions planifiées

**v1.5** — Badge PDF avec QR code et check-in jour-J par scan ; planning visuel des créneaux en vue calendrier ; détection de conflits d'agenda.

**v2** — Dashboard des retombées presse (collecte des liens d'articles publiés, mesure de la portée, ratio accréditations délivrées sur articles publiés) ; multi-festival avancé ; communication bidirectionnelle avec contre-propositions de créneaux ; rôle prod artiste avec accès dédié.

---

## 10. Addendum — écarts & évolutions livrés (post-v1.0)

Le produit livré reprend l'intégralité du périmètre v1.0 ci-dessus, avec ces écarts et ajouts
(la **documentation technique fait foi** : [`docs/`](docs/README.md)) :

- **Quotas par artiste** — les quotas photo et vidéo sont portés par l'**artiste** (et non par la
  scène) : c'est l'artiste qui fixe son nombre d'interviews, de photographes et de vidéastes
  (`NULL` ⇒ illimité). Les demandes ciblent toujours un artiste.
- **Attribution des créneaux par le système** — le journaliste ne choisit plus son créneau ;
  le bouton **« Générer le planning »** attribue les créneaux d'interview **par priorité**.
  Le journaliste retrouve son planning dans son espace.
- **Comptes journalistes** — en plus du lien magique, accès par **email + mot de passe** (par
  événement), avec **mot de passe oublié** ; carte **« Ressources presse »** vers la newsroom.
- **Back-office redessiné** — coquille rail navy + topbar, **recherche globale** (journalistes /
  événements, scopée aux droits), file de demandes en **grille** triée par score, raccourcis clavier.
- **Sécurité** — **2FA (TOTP)** optionnelle sur les comptes back-office ; suppression d'événement
  et d'accréditation (droit à l'effacement) ; export PDF des accrédités ; **« Continuer avec Google »**.
- **Multi-locataire & facturation** — chaque client est une **organisation** isolée ; inscription
  **payante** (Stripe) ou sur **invitation** du super-admin ; white-label (domaine perso + sous-domaine).
- **Newsroom SEO** — communiqués à **URL dédiée**, balises meta/Open Graph **rendues côté serveur**,
  `sitemap.xml`/`robots.txt`, image de couverture, export PDF.
- **Revue de presse (v2 anticipée)** — collecte **automatique** des retombées après l'événement (délai
  **J+3/8/30** choisi à l'inscription), dépôt de liens/médias avec **autorisation d'exploitation**,
  classement par média et **suivi des envois** côté attaché. Répond au « Dashboard des retombées » du §9 (v2).
- **Règles photo & autorisation** — texte de prise de vue + autorisation d'archivage/promo par événement,
  affichés dans l'espace et joints à l'email d'acceptation de reportage.
- **Espace journaliste redessiné** — mise en page **« app-shell »** (rail + onglets) identique au back-office.
- **Avis produit** — notation en back-office + modération super-admin + **témoignages dynamiques** sur la landing.
- **Notifications** — nom d'expéditeur = « *{Événement}* Press Team » ; **langue détectée** du navigateur ;
  mise en page email unifiée ; planificateur (récaps, **purge de rétention RGPD**, collecte des retombées).
- **Signature produit** — « **Votre orchestrateur de relations presse** ».
- **v1.5 anticipée (partiel)** — le **planning des créneaux** est généré et consultable ; le badge
  PDF/QR et le check-in jour-J restent planifiés.

---

*Fin du PRD — PR Event 360 v1.0 (+ addendum post-v1.0)*
