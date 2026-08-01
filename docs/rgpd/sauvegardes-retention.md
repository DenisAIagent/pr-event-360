# Sauvegardes et rétention technique

**Version 1.0 — 1er août 2026**

## Objectif

Encadrer les copies de secours pour qu'elles ne contredisent pas la limitation de conservation (art. 5.1.e) ni l'effacement (art. 17).

## Périmètre

| Source | Contenu | Rétention cible | Accès |
|---|---|---|---|
| PostgreSQL (Railway) | base applicative | snapshots selon plan Railway | ops MDMC uniquement |
| Workflow GitHub Actions (`docs/db-backup.workflow.yml`) | dump PostgreSQL | **≤ 30 jours** d'artefacts (ou politique GH définie) | secrets GitHub limités |
| Cloudinary | médias newsroom / retombées | alignée sur l'événement + 12 mois côté app ; purge manuelle/API si besoin | clés chiffrées |
| Sentry | erreurs techniques | rétention projet Sentry (réduire à 30–90 j) | DSN sans PII par défaut |

## Règles

1. **Chiffrement** : dumps transitent et sont stockés chiffrés (secret `BACKUP_DATABASE_URL` non commité).
2. **Minimisation** : ne pas exporter de dumps hors EEE sans TIA.
3. **Effacement** : une demande art. 17 est honorée en base live ; les backups expirent selon le calendrier ci-dessus (pas de « ressusciter » une personne purgée au-delà de la fenêtre).
4. **Test de restauration** : au moins **1× / an** (ou avant chaque majore release) — documenter date, opérateur, résultat.
5. **Accès** : principe du moindre privilège ; journaliser les restaurations.

## Runbook de test de restauration (annuel)

1. Provisionner une base de staging isolée.
2. Restaurer le dernier dump de test.
3. Vérifier migrations, comptages journalistes/événements, login admin.
4. Supprimer la base de test.
5. Noter le résultat dans le registre d'exploitation.

## Checklist

- [ ] Rétention Railway confirmée
- [ ] Artefacts GitHub ≤ 30 j
- [ ] DPA hébergeur / backup archivé
- [ ] Test restore daté
- [ ] Alignement avec purge applicative 12 mois
