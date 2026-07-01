# Fonctionnalités (par surface)

## Surfaces publiques (journalistes)

### Formulaire d'accréditation — `/accreditation/:eventId`
Multilingue (FR/EN/PT/ES, **langue détectée** depuis le navigateur puis alignée sur les langues
de l'événement), brandé (logo + couleurs de l'événement). Champs minimaux (prénom, email,
consentement RGPD) + média, type d'accréditation, audience, lien d'article. Deux champs propres
au suivi post-événement : **délai de publication** prévu (J+3 / J+8 / J+30, qui pilote l'envoi
de la demande de retombées) et un **engagement à publier**. Le consentement couvre aussi le
**règlement photo/vidéo** (autorisation d'archivage et d'usage promotionnel — voir revue de presse).
Si une **date de clôture** est définie : bannière + **compte à rebours** live ; à échéance,
bascule en « inscriptions closes ».

### Espace journaliste — `/espace/:token`
Accessible par token unique après acceptation de l'accréditation. Mise en page **« app-shell »**
identique au back-office : **rail sombre à gauche** (logo/nom de l'événement, avatar + prénom,
sélecteur de langue) avec une navigation propre au journaliste, et une zone de contenu par onglet :

| Onglet | Contenu |
|---|---|
| **Mes demandes** | Règles photo (si définies), formulaire de **demande** (interview ou reportage photo/vidéo, toujours ↔ un artiste — le créneau est attribué par le système, pas choisi) et **suivi des demandes** (statut + cible + créneau attribué) |
| **Mon planning** | Interviews confirmées avec leur créneau, triées (état vide explicite sinon) |
| **Ma revue de presse** | Dépôt et suivi de ses **retombées** (liens ou médias uploadés), classées par média — voir plus bas |
| **Mon compte** | Carte **« Ressources presse »** vers la newsroom + **« Sécuriser mon accès »** (mot de passe) |
| **Newsroom** ↗ | Lien externe vers la newsroom publique de l'événement |

### Connexion & mot de passe journaliste
Compte **par événement**, en complément du lien magique (les deux coexistent) :
- `/evenement/:eventId/connexion` — connexion email + mot de passe → redirige vers l'espace.
- `/evenement/:eventId/mot-de-passe-oublie` — demande de réinitialisation (email).
- `/evenement/:eventId/reinitialiser?token=` — choix d'un nouveau mot de passe.

### Newsroom — `/newsroom/:eventId`
Espace presse public brandé : communiqués publiés (HTML), médias téléchargeables groupés
(dossier de presse, photos, vidéos, logos), et — si pertinent — un bandeau d'accréditation
avec compte à rebours.

Chaque **communiqué a son URL dédiée** (`/newsroom/:eventId/:slug`, ou `/newsroom/:slug` en mode
domaine) **optimisée SEO** : balises meta + Open Graph injectées **côté serveur** (rendu SPA),
image de couverture, description. Un **`sitemap.xml`** et un **`robots.txt`** sont servis à la
racine (par hôte : la newsroom de l'événement en mode domaine, les pages plateforme sinon).

## Back-office — coquille de navigation

Layout en **rail navy fixe à gauche** (marque, **sélecteur d'événement** déroulant pour
basculer rapidement, navigation contextuelle selon l'événement actif, utilisateur + déconnexion)
+ **topbar** (fil d'ariane, **recherche globale**, accès aux messages dans un événement).

- **Recherche globale** (`GET /admin/search`) : journalistes (nom/email/média) + événements,
  en dropdown debouncé, **limitée aux événements accessibles** ; clic → fiche dans l'événement.

## Back-office — pages globales

| Page | Accès | Contenu |
|---|---|---|
| **Événements** | tous | Liste des événements accessibles ; bouton « Nouvel événement » (wizard) ; suppression (admin) |
| **Équipe** | admin | Comptes + invitations, rôles, activation, assignation d'événements |
| **Intégrations** | super-admin | Clés API **partagées** (Brevo, Twilio, Cloudinary, mode d'envoi) — chiffrées, masquées ; réservées à l'opérateur plateforme |
| **Organisations / Avis** | super-admin | Onboarding des clients (invitations, suppression) + modération des avis produit |
| **Sécurité** | tous | Mot de passe & double authentification (2FA TOTP) du compte |

### Wizard de création d'événement — `/admin/events/new`
Assistant pas à pas (admin/attaché) : **Informations → Apparence → Scènes & artistes →
Règles & quotas → Clôture → Terminé** (récap + lien à partager). L'événement est créé dès
la 1ʳᵉ étape ; les suivantes le configurent via les endpoints existants et sont facultatives.

## Back-office — onglets d'un événement

| Onglet | Accès | Rôle |
|---|---|---|
| **Demandes** | accès événement | File de traitement (grille triée par score — voir ci-dessous) |
| **Accréditations** | accès événement | Accepter/refuser, **exporter** (PDF, filtrable presse/photo/vidéo), supprimer (RGPD) |
| **Configuration** | éditeur | Assistant guidé : scènes → artistes (quotas itw/photo/vidéo) → règles & quotas → apparence → **sous-domaine** (slug plateforme et/ou domaine perso) → clôture → récap |
| **Médiathèque** | éditeur | Upload Cloudinary (photos/vidéos/logos/dossier de presse) |
| **Newsroom** | éditeur | Communiqués (brouillon/publié) — **champs SEO** (slug, description, image) + lien de la newsroom publique |
| **Communications** | éditeur | Composer une newsletter HTML (aperçu live brandé) + envoi ciblé |
| **Revue de presse** | accès événement | Retombées déposées par les journalistes, **classées par média** + **suivi des envois** (qui a contribué / en attente) + relance |
| **Paramètres** | éditeur | Règles/quotas, poids média, gabarits, clôture, récap, **domaine personnalisé** (white-label) |
| **Apparence** | éditeur | Branding (logo, couleurs) |
| **Aperçu** | éditeur | Prévisualisation des vues journaliste (desktop/mobile) |
| **Messages** | accès événement | Journal des notifications envoyées/simulées |

### Onglet « Demandes » — 4 vues

| Vue | Regroupement | Filtres |
|---|---|---|
| **File globale** | grille triée par score décroissant (jauge de priorité, avatar, quota) | type + statut |
| **Interviews par artiste** | par artiste (quota, nombre) | statut |
| **Reportages par artiste** | par artiste | photo/vidéo + statut |
| **Planning par créneau** | chronologique, par jour | statut |

Fonctions associées :
- **Action groupée** : « Accepter le(s) N meilleur(s) (quota restant) » par artiste.
- **Générer le planning** : attribue les créneaux aux interviews acceptées, par priorité.
- **Raccourcis clavier** sur la file : ↑/↓ (ou J/K) naviguer, A accepter, R refuser.
- **Export PDF** : de la file, par groupe (un PDF par régisseur), ou du planning —
  impression navigateur (logo + couleurs de l'événement en en-tête).

### Onglet « Communications »
Éditeur HTML + **aperçu live** dans un gabarit aux couleurs de l'événement (les variables
`{{firstName}}`/`{{lastName}}` y sont interpolées avec des valeurs d'exemple) ; **suppression**
d'un brouillon (les newsletters envoyées sont conservées) ; sélection des destinataires
(tous / accrédités acceptés, cases à cocher) ; envoi groupé via Brevo, persistance dans Messages.

### Onglet « Aperçu »
Charge les vraies pages journaliste dans une iframe avec bascule **desktop / mobile**
(rendu mobile fidèle). Trois surfaces : formulaire d'accréditation, espace journaliste
(données d'exemple + vrai lineup), newsroom.

### Onglet « Revue de presse »
Après l'événement, chaque accrédité accepté reçoit **automatiquement** une invitation à
partager ses **retombées** (liens d'articles/réseaux/YouTube, photos et captures uploadées),
à l'échéance du **délai de publication** qu'il a choisi à l'inscription (J+3 / J+8 / J+30).
Pour tout média **uploadé**, l'**autorisation d'archivage + usage promotionnel** est obligatoire
(re-confirmée au dépôt, en écho au règlement accepté à l'accréditation). L'attaché voit les
retombées **classées par catégorie de média**, des **KPIs** (retombées, catégories, contributeurs,
en attente) et un **suivi des envois** avec bouton **« Relancer »** (individuel ou tous les
non-contributeurs). Le journaliste dépose et retire ses retombées depuis l'onglet **« Ma revue
de presse »** de son espace — mêmes composants que le back-office.

## Landing & avis produit
La page d'accueil publique porte la signature **« Votre orchestrateur de relations presse »** et
affiche des **témoignages dynamiques** issus des avis internes. Depuis le back-office, un attaché
peut **noter l'application** (1–5 + citation, consentement à l'affichage public) ; le **super-admin
plateforme modère** (en attente → approuvé/rejeté) ; seuls les avis approuvés **et** consentis
alimentent la landing.

## Notifications & récapitulatifs
Emails/SMS transactionnels (accréditation, demandes, **collecte des retombées**), newsletters, et
récapitulatifs périodiques (quotidien/hebdo). Le **nom d'expéditeur** est celui de l'événement
(« *{Événement}* Press Team »), l'adresse d'envoi restant l'expéditeur Brevo vérifié. En
**simulation** par défaut : tout est journalisé, rien n'est envoyé. Voir
[business-logic.md](business-logic.md#notifications).
