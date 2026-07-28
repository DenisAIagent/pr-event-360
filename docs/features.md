# Fonctionnalités par surface

## Profils d’événement

Le wizard demande le type dès la création :

| Type | Participants | Lieux | Programme |
|---|---|---|---|
| Festival / concert | Artistes | Scènes | Line-up |
| Salon / foire | Exposants | Espaces | Exposants |
| Conférence / séminaire | Intervenants | Salles | Programme |
| Corporate | Porte-paroles | Espaces | Programme |
| Autre | Participants | Espaces | Programme |

L’adaptation est lexicale et fonctionnelle. Les objets API restent `artists` et `stages` pour compatibilité.

## Surfaces journaliste

### Accréditation — `/accreditation/:eventId`

- FR/EN/PT/ES, langue navigateur ramenée aux langues actives ;
- branding de l’événement ;
- identité, média, audience, type d’accréditation et publication antérieure ;
- consentement RGPD et engagement de publication ;
- délai de retombée J+3/J+8/J+30 ;
- règlement photo/vidéo ;
- compte à rebours et fermeture côté client **et serveur** ;
- un email ne peut créer qu’une demande active par événement.

### Connexion

- `/evenement/:eventId/connexion` : email + mot de passe ;
- `/evenement/:eventId/mot-de-passe-oublie` ;
- `/evenement/:eventId/reinitialiser?token=…`.

Le lien personnel et le mot de passe coexistent. La connexion par mot de passe fait tourner le lien personnel. Le lien permet de définir un mot de passe uniquement la première fois ; toute modification ultérieure exige le flux de réinitialisation.

### Espace — `/espace/:token`

Le token est aléatoire, valable 7 jours, rotatif et stocké uniquement sous forme de hash. L’accréditation doit être acceptée.

| Onglet | Contenu |
|---|---|
| Mes demandes | interview, reportage photo/vidéo, cible participant, suivi des statuts |
| Mon planning | interviews confirmées et créneaux attribués |
| Conférences de presse | conférences visibles, inscription/demande, statut, annulation |
| Ma revue de presse | dépôt et retrait de liens ou médias |
| Mon compte | newsroom et sécurisation du compte |
| Newsroom | lien vers les ressources publiques |

La présence d’une conférence ne masque ni ne transforme les demandes individuelles.

### Conférences de presse

Une conférence est affichée après confirmation et publication par le RP :

- `open` : inscription immédiate, ou liste d’attente si complet ;
- `approval` : demande `pending`, sauf invité ;
- `invite_only` : visible seulement pour les invités ;
- filtre par accréditation presse/photo/vidéo ;
- inscription fermée si statut différent de `published` ou si la conférence a commencé ;
- annulation possible, avec promotion automatique.

### Newsroom — `/newsroom/:eventId`

- communiqués publiés ;
- médias téléchargeables ;
- branding et lien d’accréditation ;
- URL dédiée par communiqué ;
- meta, Open Graph, `robots.txt` et `sitemap.xml` injectés côté serveur.

## Back-office

### Navigation globale

- rail latéral, sélecteur d’événement et recherche globale ;
- événements accessibles uniquement ;
- pages Équipe, Sécurité, et, pour le super-admin, Organisations, Intégrations et Avis.

### Création d’événement — `/admin/events/new`

Étapes : **type et informations → apparence → lieux et participants → règles et quotas → clôture → récapitulatif**. L’événement est créé après la première étape ; les suivantes peuvent être reprises.

### Onglets d’un événement

| Onglet | Fonction |
|---|---|
| Demandes | file, groupes par participant, planning, score, transitions |
| Accréditations | acceptation, refus, renvoi du lien, export, effacement |
| Configuration | lieux, participants, disponibilités, quotas et règles |
| Conférences de presse | CRUD, publication, participants, invitations, inscriptions, check-in |
| Médiathèque | uploads signés Cloudinary et liens |
| Newsroom | communiqués et SEO |
| Communications | newsletters ciblées et aperçu |
| Revue de presse | retombées, suivi et relances |
| Paramètres | poids, templates, clôture, récap et domaines |
| Apparence | logo et couleurs |
| Aperçu | accréditation, espace et newsroom dans une iframe authentifiée par cookie |
| Messages | journal des notifications |

### Demandes et planning

- file globale triée par score ;
- filtres type/statut ;
- regroupement interviews et reportages par participant ;
- vue planning chronologique ;
- action groupée dans la limite du quota ;
- attribution automatique des créneaux par priorité ;
- exports via l’impression navigateur.

### Conférences côté RP

Le RP peut attendre une décision de la production ou de la direction avant de créer le format. Il renseigne ensuite :

- titre, description, horaires et lieu ;
- participants multiples ;
- capacité facultative ;
- mode d’inscription et statut ;
- types d’accréditation autorisés ;
- embargo et lien de livestream HTTPS ;
- invitations, décisions et check-in.

Les inscriptions sont indépendantes de l’accréditation et des demandes individuelles.

### Communications et retombées

- gabarits transactionnels multilingues ;
- simulation par défaut ;
- newsletters ciblées ;
- demande automatique de retombées à fin + délai choisi ;
- relance individuelle ou groupée ;
- autorisations spécifiques pour les médias uploadés.

## Plateforme

- organisations et abonnements isolés ;
- inscription Stripe ou invitation ;
- avis produit modérés avant affichage public ;
- intégrations chiffrées réservées au super-admin ;
- sous-domaines self-service et domaines personnalisés opérés par le super-admin.
