# Procédure d’exercice des droits

**Version 1.1 — 18 juillet 2026.**

Pour les journalistes, le Client est en principe responsable de traitement ; MDMC OÜ l’assiste. Pour les comptes plateforme et prospects propres à MDMC OÜ, celle-ci agit comme responsable.

## Canal et délais

- contact : `rgpd@mdmcmusicads.com` ou canal indiqué par le Client ;
- accusé de réception et qualification rapide ;
- réponse sous un mois, prolongeable selon le RGPD avec information ;
- identité vérifiée de façon proportionnée ;
- gratuité sauf demande manifestement infondée ou excessive.

## Étapes

1. enregistrer la date, l’identité, le tenant et le droit ;
2. déterminer le responsable de traitement ;
3. éviter d’envoyer des données avant vérification suffisante ;
4. rechercher uniquement dans le tenant concerné ;
5. exporter, corriger, limiter ou supprimer ;
6. notifier les destinataires si requis ;
7. répondre et conserver la preuve.

## Droits

| Droit | Réponse opérationnelle |
|---|---|
| information | notices aux points de collecte |
| accès | **Export JSON** back-office (`GET …/accreditations/:id/export`) ou espace journaliste (`GET …/space/me/export`) |
| rectification | correction dans le back-office ou l’espace |
| effacement | suppression journaliste en cascade (bouton « Supprimer (RGPD) ») |
| limitation | gel organisationnel documenté, en attendant une fonction dédiée |
| portabilité | même export JSON structuré (`format: PR-Event-360-GDPR-export-v1`) |
| opposition | retrait des communications non essentielles |

L’effacement d’un journaliste supprime notamment ses demandes, historiques dépendants, inscriptions de conférence, resets et retombées. Les journaux ou sauvegardes suivent [sauvegardes-retention.md](sauvegardes-retention.md).

## Sécurité de la réponse

- ne jamais transmettre hashes, secrets, tokens ou données d’autres tenants ;
- utiliser un canal chiffré ;
- journaliser l’opérateur et le périmètre ;
- faire relire un export complexe.

## Registre

| Réf. | Reçue | Personne/tenant | Droit | Vérification | Action | Réponse | Échéance |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

L’export self-service JSON est disponible ; le traitement manuel assisté reste possible pour les cas complexes (multi-événements, co-responsables).
