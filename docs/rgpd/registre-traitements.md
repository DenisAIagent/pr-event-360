# Registre des activités de traitement (RGPD art. 30)

> Modèle pré-rempli pour la plateforme **PR Event 360**. À compléter par chaque
> organisateur d'événement (responsable de traitement). PR Event 360 est éditée par
> **MDMC — MY MUSIC ADS** (SAS, RCS Paris 901 415 653, 19 rue Claude Tillier, 75012 Paris),
> qui agit comme **sous-traitant** (art. 28) ; il tient le présent registre côté éditeur
> et fournit ce modèle à ses clients.
>
> **Responsable de traitement** : _[organisation, adresse, représentant légal]_
> **Contact / DPO** : rgpd@mdmcmusicads.com
> **Dernière mise à jour** : juin 2026

---

## T1 — Gestion des accréditations presse

| Champ | Valeur |
|---|---|
| Finalité | Recueil et traitement des demandes d'accréditation des journalistes pour un événement |
| Base légale | Mesures précontractuelles / exécution du contrat (art. 6.1.b) |
| Catégories de personnes | Journalistes (professionnels, adultes) |
| Catégories de données | Identité (prénom, nom), contact (email, téléphone), données professionnelles (média, audience/tirage, lien publication antérieure), type d'accréditation, consentement horodaté |
| Données sensibles | Aucune (art. 9) |
| Destinataires | Équipe presse de l'organisateur (rôles admin/attaché/assistant) |
| Sous-traitants | PR Event 360 (plateforme), hébergeur (UE), Brevo (emails, UE) |
| Transferts hors UE | Aucun (cible : hébergement UE) — sinon DPF/CCT + TIA |
| Durée de conservation | Événement + 12 mois, puis suppression/anonymisation |
| Mesures de sécurité | HTTPS, contrôle d'accès par rôle, hachage argon2, journalisation, chiffrement des secrets (AES-256-GCM) |

## T2 — Gestion des demandes d'interview / reportage

| Champ | Valeur |
|---|---|
| Finalité | Réception, priorisation et traitement des demandes d'interview/reportage des journalistes accrédités |
| Base légale | Exécution du contrat (art. 6.1.b) |
| Catégories de personnes | Journalistes accrédités |
| Catégories de données | Lien vers le journaliste, type de demande, contenu/message, statut, score d'aide à la décision |
| Décision automatisée | Non — le score classe les demandes ; la décision est prise par un humain (pas d'art. 22) |
| Destinataires | Équipe presse, régisseurs (via export PDF) |
| Durée de conservation | Idem T1 (rattaché au journaliste, suppression en cascade) |

## T3 — Gestion des comptes back-office (équipe presse)

| Champ | Valeur |
|---|---|
| Finalité | Authentification et gestion des accès des collaborateurs |
| Base légale | Exécution du contrat / intérêt légitime (art. 6.1.b / 6.1.f) |
| Catégories de personnes | Salariés / collaborateurs de l'organisateur |
| Catégories de données | Email, nom, rôle, mot de passe (haché argon2), événements assignés |
| Durée de conservation | Durée de la relation + suppression à la désactivation du compte |
| Mesures de sécurité | argon2, JWT (12 h), contrôle d'accès par rôle ; **MFA recommandé (à déployer)** |

## T4 — Envoi de communications (emails / newsletters)

| Champ | Valeur |
|---|---|
| Finalité | Confirmation d'accréditation, lien personnel, informations pratiques, newsletters |
| Base légale | Intérêt légitime (6.1.f) pour le transactionnel ; consentement (6.1.a) pour la prospection |
| Sous-traitant | **Brevo / Sendinblue** (Union européenne 🇪🇺) |
| Transferts hors UE | Aucun |
| Durée | Logs d'envoi selon la politique du sous-traitant |

## T5 — Hébergement des médias (newsroom)

| Champ | Valeur |
|---|---|
| Finalité | Stockage et mise à disposition de photos, vidéos, logos et dossiers de presse |
| Base légale | Exécution du contrat / intérêt légitime |
| Sous-traitant | **Cloudinary** (vérifier la **région UE** + inscription DPF) |
| Données personnelles | Possibles (personnes visibles sur des photos) |
| Transferts hors UE | À encadrer (DPF/CCT + TIA) tant que la région n'est pas UE |

---

## Points de vigilance (suivi)
- [ ] Renseigner l'identité du responsable de traitement et le contact DPO.
- [ ] Confirmer l'**hébergement en région UE** (T1–T3) — cf. plan d'action.
- [ ] Confirmer **Cloudinary en région UE** + DPF (T5).
- [ ] Réévaluation annuelle du registre.
