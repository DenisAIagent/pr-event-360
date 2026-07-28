# Sous-traitants et DPA

**Dernière mise à jour :** 18 juillet 2026.

Ne pas déduire une région depuis le nom commercial du service. Vérifier le contrat, le dashboard du projet et le flux réel avant mise en production.

| Fournisseur | Fonction | Activé si | Données possibles | Région/mécanisme | Action |
|---|---|---|---|---|---|
| Railway | app et PostgreSQL | toujours en prod actuelle | toutes données hébergées | à confirmer par service | DPA, région, sauvegardes |
| Brevo | email/SMS | clés + live | contact et contenu | à confirmer | DPA et expéditeur |
| Twilio | SMS | configuré + live | téléphone et contenu | à confirmer | DPA, transfert |
| Cloudinary | médias | configuré | fichiers, métadonnées | région du compte à confirmer | DPA, région, preset |
| Stripe | abonnement | 3 variables Stripe | identité client, paiement chez Stripe | à confirmer | DPA, webhook |
| Google Identity | login | client ID | email et identifiant | à confirmer | conditions/DPA |
| Sentry | erreurs | DSN | traces techniques | à confirmer | DPA, minimisation |
| GitHub Actions | sauvegarde | workflow + secret | dump PostgreSQL chiffré selon config | région/stockage à confirmer | rétention, accès, DPA |

## Checklist article 28

- [ ] instructions documentées ;
- [ ] confidentialité ;
- [ ] sécurité article 32 ;
- [ ] autorisation des sous-traitants ultérieurs ;
- [ ] assistance aux droits ;
- [ ] assistance violations/AIPD ;
- [ ] suppression ou restitution ;
- [ ] informations et audits ;
- [ ] alerte sur instruction illicite.

## Processus d’ajout

1. identifier données, finalité, région et flux ;
2. faire une analyse sécurité et transfert ;
3. accepter/archiver DPA et CCT si nécessaires ;
4. réduire les données et configurer la rétention ;
5. mettre à jour ce tableau, le registre et les notices ;
6. notifier les Clients selon le DPA.

## Priorités

- confirmer la région de chaque service Railway ;
- choisir une région Cloudinary adaptée ;
- vérifier les mécanismes de transfert Stripe, Google, Twilio et Sentry ;
- protéger et limiter la rétention des artefacts de sauvegarde ;
- retirer tout fournisseur dormant inutile.
