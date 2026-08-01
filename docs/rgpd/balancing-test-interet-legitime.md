# Balancing test — intérêt légitime (art. 6.1.f)

**Version 1.0 — 1er août 2026**  
**Organisme :** MDMC OÜ (sous-traitant) / Client organisateur (responsable)  
**Traitement concerné :** communications transactionnelles liées à l'événement (confirmation d'accréditation, lien d'accès, informations pratiques, relances de retombées).

Ce document formalise le test en 3 étapes exigé pour s'appuyer sur l'intérêt légitime. Il doit être relu par chaque Client pour son contexte.

## 1. Finalité (intérêt poursuivi)

| Élément | Description |
|---|---|
| Intérêt | Organiser l'accès presse à l'événement de façon sûre et traçable |
| Poursuivi par | l'organisateur (RT) ; MDMC OÜ exécute en sous-traitance |
| Nature | intérêt professionnel / organisationnel, non purement commercial de prospection |
| Attentes des personnes | un journaliste qui demande une accréditation s'attend à recevoir une réponse et un moyen d'accéder à son espace |

## 2. Nécessité

| Question | Réponse |
|---|---|
| Le traitement est-il nécessaire à l'intérêt ? | Oui : sans email (ou SMS si fourni), l'organisateur ne peut pas confirmer l'accréditation ni transmettre le lien d'accès. |
| Alternative moins intrusive ? | Un portail sans notification forcerait le journaliste à surveiller manuellement un statut — impraticable et générateur d'appels support. |
| Minimisation | Seules les coordonnées fournies à l'inscription sont utilisées ; pas d'enrichissement tiers ; pas de tracking publicitaire. |

## 3. Mise en balance (droits et intérêts des personnes)

| Facteur | Appréciation |
|---|---|
| Nature des données | Identité professionnelle et contact (pas de données art. 9) |
| Relation | La personne a initié la relation (demande d'accréditation) |
| Impact | Faible : messages liés au service demandé |
| Transparence | Politique de confidentialité + mentions au formulaire |
| Contrôle | Droit d'opposition, effacement, export ; lien d'accès rotatif et hashé |
| Enfants / vulnérables | Non ciblés |

**Conclusion :** l'intérêt légitime de l'organisateur **prévaut** pour les communications strictement liées à l'accréditation et à l'événement.  
**Hors périmètre IL :** newsletters marketing hors événement, cession de fichiers, profilage publicitaire → **consentement** requis.

## 4. Mesures de sauvegarde

- rate-limits et anti-abus sur les envois ;
- mode `NOTIFICATIONS_MODE=simulation` par défaut jusqu'à validation ;
- purge 12 mois après l'événement ;
- opposition traitée sous 1 mois (procédure-droits.md).

## 5. Révision

- à chaque nouveau canal (SMS, push) ;
- si le score devient décision automatique (art. 22) ;
- revue annuelle avec le registre art. 30.
