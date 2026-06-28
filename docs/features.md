# Fonctionnalités (par surface)

## Surfaces publiques (journalistes)

### Formulaire d'accréditation — `/accreditation/:eventId`
Multilingue (FR/EN/PT/ES), brandé (logo + couleurs de l'événement). Champs minimaux
(prénom, email, consentement RGPD) + média, type d'accréditation, audience, lien d'article.
Si une **date de clôture** est définie : bannière + **compte à rebours** live ; à échéance,
bascule en « inscriptions closes ».

### Espace journaliste — `/espace/:token`
Accessible par token unique après acceptation de l'accréditation. Affiche le lineup, un
formulaire de **demande** (interview ou reportage photo/vidéo, toujours ↔ un artiste — le
créneau est attribué par le système, pas choisi), le **suivi des demandes** (statut + cible
+ créneau attribué), **« Mon planning »** (interviews confirmées avec leur créneau, triées),
une carte **« Ressources presse »** vers la newsroom, et **« Sécuriser mon accès »** pour
définir un mot de passe.

### Connexion & mot de passe journaliste
Compte **par événement**, en complément du lien magique (les deux coexistent) :
- `/evenement/:eventId/connexion` — connexion email + mot de passe → redirige vers l'espace.
- `/evenement/:eventId/mot-de-passe-oublie` — demande de réinitialisation (email).
- `/evenement/:eventId/reinitialiser?token=` — choix d'un nouveau mot de passe.

### Newsroom — `/newsroom/:eventId`
Espace presse public brandé : communiqués publiés (HTML), médias téléchargeables groupés
(dossier de presse, photos, vidéos, logos), et — si pertinent — un bandeau d'accréditation
avec compte à rebours.

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
| **Intégrations** | admin | Clés API (Brevo, Twilio, Cloudinary, mode d'envoi) — chiffrées, masquées |
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
| **Configuration** | éditeur | Assistant guidé : scènes → artistes (quotas itw/photo/vidéo) → règles & quotas → apparence → clôture → récap |
| **Médiathèque** | éditeur | Upload Cloudinary (photos/vidéos/logos/dossier de presse) |
| **Newsroom** | éditeur | Communiqués (brouillon/publié) + lien de la newsroom publique |
| **Communications** | éditeur | Composer une newsletter HTML (aperçu live brandé) + envoi ciblé |
| **Paramètres** | éditeur | Règles/quotas, poids média, gabarits, clôture, récap |
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

## Notifications & récapitulatifs
Emails/SMS transactionnels (accréditation, demandes), newsletters, et récapitulatifs
périodiques (quotidien/hebdo). En **simulation** par défaut : tout est journalisé, rien
n'est envoyé. Voir [business-logic.md](business-logic.md#notifications).
