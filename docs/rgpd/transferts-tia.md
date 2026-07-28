# Transferts internationaux et TIA

**Version 1.1 — 18 juillet 2026.**

Objectif : savoir où passent les données et encadrer tout transfert hors EEE. Les régions ci-dessous doivent être renseignées depuis les comptes réels, pas supposées.

## Cartographie à compléter

| Fournisseur | Données | Région effective | Transfert hors EEE | Mécanisme | TIA | Statut |
|---|---|---|---|---|---|---|
| Railway app | trafic et application | à confirmer | à déterminer | à compléter | à compléter | ouvert |
| Railway PostgreSQL | base complète | à confirmer | à déterminer | à compléter | à compléter | critique |
| Cloudinary | médias | à confirmer | à déterminer | à compléter | à compléter | ouvert |
| Stripe | client/facturation | à confirmer | à déterminer | à compléter | à compléter | ouvert |
| Twilio | téléphone/SMS | à confirmer | à déterminer | à compléter | à compléter | si activé |
| Google Identity | email/identifiant | à confirmer | à déterminer | à compléter | à compléter | si activé |
| Sentry | erreurs | à confirmer | à déterminer | à compléter | à compléter | si activé |
| GitHub Actions | sauvegarde | à confirmer | à déterminer | à compléter | à compléter | si activé |
| Brevo | email/contenu | à confirmer | à déterminer | à compléter | à compléter | si activé |

## Méthode TIA

1. décrire données, finalité, fréquence, volumes et sensibilité ;
2. localiser stockage, support, sauvegardes et sous-traitants ;
3. identifier le mécanisme : adéquation, DPF, CCT ou dérogation exceptionnelle ;
4. analyser l’accès légal dans le pays tiers ;
5. évaluer mesures techniques et contractuelles ;
6. conclure sur l’équivalence et le risque résiduel ;
7. obtenir validation DPO/juridique ;
8. réexaminer périodiquement et lors d’un changement fournisseur.

## Mesures supplémentaires

- région EEE lorsque disponible ;
- TLS et chiffrement au repos ;
- minimisation/pseudonymisation ;
- tokens et secrets séparés ;
- accès support restreint ;
- rétention courte ;
- journaux et alertes ;
- sauvegardes chiffrées et droits minimaux ;
- engagements de contestation des demandes d’autorités.

## Runbook de changement de région PostgreSQL

1. créer une base cible dans la région validée ;
2. effectuer un `pg_dump` ;
3. restaurer dans un environnement isolé ;
4. vérifier migrations, comptages et fonctionnalités ;
5. geler brièvement les écritures ;
6. effectuer la synchronisation finale ;
7. basculer `DATABASE_URL` et redéployer ;
8. contrôler santé et intégrité ;
9. conserver l’ancienne base protégée pendant la fenêtre de rollback ;
10. supprimer selon procédure et mettre à jour DPA/registre/TIA.

## Suivi

- [ ] localisation réelle renseignée ;
- [ ] DPA archivés ;
- [ ] DPF/CCT vérifiés ;
- [ ] TIA achevées pour transferts résiduels ;
- [ ] sauvegardes incluses ;
- [ ] révision annuelle et à chaque changement.
