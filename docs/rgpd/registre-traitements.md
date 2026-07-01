# Registre des activités de traitement (RGPD art. 30)

> Modèle pré-rempli pour la plateforme **PR Event 360**. À compléter par chaque
> organisateur d'événement (responsable de traitement). PR Event 360 est éditée par
> **MDMC OÜ**, société de droit estonien (UE) — registre du commerce estonien (registrikood)
> n° 16466485, siège : Sepapaja tn 6, 15551 Tallinn, Estonie — qui agit comme **sous-traitant** (art. 28) ;
> il tient le présent registre côté éditeur et fournit ce modèle à ses clients.
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
| Catégories de données | Identité (prénom, nom), contact (email, téléphone), données professionnelles (média, audience/tirage, lien publication antérieure), type d'accréditation, **acquittement de l'information horodaté** |
| Données sensibles | Aucune (art. 9) |
| Destinataires | Équipe presse de l'organisateur (rôles admin/attaché/assistant) |
| Sous-traitants | PR Event 360 (plateforme), hébergeur, Brevo (emails, UE), Cloudinary (médias) |
| Transferts hors UE | ⚠️ Hébergeur (Railway) actuellement **US** → **migration UE prioritaire** ; sinon DPF/CCT + TIA (cf. `transferts-tia.md`) |
| Durée de conservation | Événement + 12 mois, puis suppression — **purge automatique quotidienne déployée** (scheduler) |
| Mesures de sécurité | HTTPS, contrôle d'accès par rôle, hachage argon2id, journalisation, chiffrement des secrets (AES-256-GCM), MFA disponible, limitation de débit, assainissement des entrées |

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
| Mesures de sécurité | argon2id, JWT (12 h, HS256 épinglé), contrôle d'accès par rôle, **MFA (2FA) déployé et disponible**, limitation de débit sur le login |
| Connexion via Google | Option « Continuer avec Google » (OAuth) — sous-traitant **Google** (US, DPF à vérifier) ; seuls email + identifiant Google vérifiés sont utilisés |

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

## T6 — Paiement de l'abonnement

| Champ | Valeur |
|---|---|
| Finalité | Souscription et facturation de l'abonnement au service |
| Base légale | Exécution du contrat (art. 6.1.b) + obligation légale (comptabilité) |
| Catégories de personnes | Client (organisateur) souscripteur |
| Catégories de données | Email, nom de facturation ; **aucune donnée bancaire stockée par MDMC** |
| Sous-traitant | **Stripe** (US/Irlande) — DPF à vérifier, DPA à accepter |
| Transferts hors UE | Encadré DPF/CCT (cf. `transferts-tia.md`) |
| Durée | Selon obligations comptables/fiscales applicables |

## T7 — Notifications SMS (si activé)

| Champ | Valeur |
|---|---|
| Finalité | Envoi de notifications par SMS (canal optionnel) |
| Base légale | Intérêt légitime / exécution du contrat |
| Catégories de données | Numéro de téléphone, contenu du message |
| Sous-traitant | **Twilio** (US) — DPF à vérifier, sinon désactiver le canal |
| Transferts hors UE | Encadré DPF/CCT + TIA, ou canal désactivé |

---

## Points de vigilance (suivi)
- [ ] Renseigner l'identité du responsable de traitement et le contact DPO.
- [ ] **Migrer l'hébergement Railway en région UE** (supprime le transfert principal — cf. `transferts-tia.md`).
- [ ] Confirmer **Cloudinary en région UE** + DPF (T5).
- [ ] Vérifier la certification **DPF** de Stripe, Google (+ Twilio si SMS).
- [ ] **Accepter et archiver les DPA** des sous-traitants ; DPA client déployé (`dpa-modele.md`).
- [ ] Réévaluation annuelle du registre.

_Documents liés : `dpa-modele.md`, `sous-traitants-dpa.md`, `procedure-violation.md`, `procedure-droits.md`, `aipd-non-necessite.md`, `transferts-tia.md`._
