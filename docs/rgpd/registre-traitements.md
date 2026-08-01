# Registre des activités de traitement

**Éditeur/sous-traitant :** MDMC OÜ, Sepapaja tn 6, 15551 Tallinn, Estonie, registrikood 16466485.

**Contact :** `rgpd@mdmcmusicads.com`

**Dernière mise à jour :** 18 juillet 2026.

Chaque Client complète sa propre identité, ses bases légales, volumes, durées et fournisseurs activés. Ce modèle ne constitue pas un conseil juridique.

## T1 — Accréditations

| Champ | Valeur |
|---|---|
| finalité | recevoir et traiter les accréditations |
| personnes | journalistes, photographes, vidéastes |
| données | identité, contact, média, audience, références, type, consentement |
| base | art. 6.1.b (mesures précontractuelles / contrat) pour le dossier ; art. 6.1.f pour communications transactionnelles (voir balancing-test) |
| destinataires | équipe presse autorisée |
| durée produit | événement + 12 mois, purge automatique |
| sécurité | tenant, rôles, MFA privilégiée, Argon2, liens hashés, rate limits |

## T2 — Demandes individuelles et planning

| Champ | Valeur |
|---|---|
| finalité | prioriser et planifier interviews/reportages |
| données | cible, message, statut, score, créneau |
| décision automatique | non ; score de classement, décision humaine |
| destinataires | équipe presse et exports autorisés |
| durée | rattachée au journaliste |

## T3 — Conférences de presse

| Champ | Valeur |
|---|---|
| finalité | inviter, inscrire, gérer la capacité et la présence |
| données | journaliste, conférence, statut, invitation, check-in |
| base envisagée | organisation de l’événement/contrat ou intérêt légitime |
| décision automatique | liste d’attente selon capacité ; le RP peut décider les statuts |
| durée | rattachée au journaliste et à l’événement |

## T4 — Comptes back-office

| Champ | Valeur |
|---|---|
| finalité | authentification et autorisation |
| données | email, nom, rôle, hash, fournisseur, MFA, assignations |
| sécurité | Argon2, cookie/CSRF, JWT 12 h, MFA obligatoire admin/super-admin |
| durée | relation contractuelle + délais applicables |
| Google | email et identifiant vérifiés si activé |

## T5 — Communications

| Champ | Valeur |
|---|---|
| finalité | transactionnel, invitations, newsletters, relances |
| données | email/téléphone, langue, contenu et statut d’envoi |
| fournisseurs | Brevo ; Twilio si SMS activé |
| base | contrat/intérêt légitime pour le transactionnel ; consentement si prospection |

## T6 — Newsroom et médias

| Champ | Valeur |
|---|---|
| finalité | publier communiqués et ressources |
| données | contenus et personnes éventuellement visibles |
| fournisseur | Cloudinary si activé |
| mesures | formats restreints, upload signé, URLs HTTPS |

## T7 — Facturation

| Champ | Valeur |
|---|---|
| finalité | abonnement et facturation |
| données | organisation, email, identité de facturation, références Stripe |
| données bancaires | non stockées par MDMC OÜ |
| fournisseur | Stripe |
| durée | obligations contractuelles/comptables |

## T8 — Revue de presse

| Champ | Valeur |
|---|---|
| finalité | collecter et suivre les retombées |
| données | URL, média, titre, consentements, auteur |
| base | contrat/intérêt légitime et consentement pour usages promotionnels |
| durée | politique Client, maximum produit à documenter |

## T9 — Sécurité et observabilité

| Champ | Valeur |
|---|---|
| finalité | détection d’erreurs, sécurité, continuité |
| données | logs techniques, IP selon infrastructure, erreurs |
| fournisseur | Railway, Sentry si activé, GitHub Actions si sauvegarde configurée |
| minimisation | tokens omis en production, PII Sentry client désactivée par défaut |

## Suivi

- [ ] identité et DPO du Client ;
- [x] bases légales produit documentées (6.1.b + balancing test IL) — à valider par le Client ;
- [ ] région Railway/PostgreSQL confirmée ;
- [ ] régions, DPA et mécanismes de transfert des fournisseurs activés ;
- [x] durées produit alignées sur la purge 12 mois ;
- [x] notices FR/EN/PT/ES (consentement reformulé + privacy août 2026) ;
- [x] export art. 15/20 (self-service journaliste + admin) ;
- [ ] revue annuelle et à chaque nouvelle fonctionnalité.
