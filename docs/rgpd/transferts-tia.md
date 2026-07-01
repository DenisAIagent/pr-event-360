# Transferts internationaux & analyse d'impact (TIA) — RGPD Chap. V (art. 44-49)

> Objectif : supprimer ou encadrer tout transfert de données personnelles hors EEE.
> Priorité **#1 de conformité avant lancement** : les données journalistes ne doivent pas transiter/résider
> hors UE sans mécanisme valide.

## Cartographie des transferts
| Sous-traitant | Donnée transférée | Localisation | Mécanisme requis | Statut / action |
|---|---|---|---|---|
| **Railway** (hébergement + base PostgreSQL) | **Tout le PII journalistes** | ⚠️ US | Région UE **ou** DPF/CCT + TIA | **Migrer en région UE** (action prioritaire) |
| **Cloudinary** (médias) | Photos/vidéos (personnes visibles possibles) | US par défaut | Région UE **ou** DPF + TIA | Choisir **région UE** + vérifier DPF |
| **Stripe** (paiement) | Email, nom facturation | US / Irlande | DPF (Stripe certifié) / CCT | Vérifier certification DPF + accepter DPA |
| **Twilio** (SMS, si activé) | Téléphone, contenu SMS | US | DPF / CCT + TIA | Vérifier DPF ; sinon désactiver le canal SMS |
| **Google** (OAuth « Continuer avec Google ») | Email, identifiant Google | US | DPF (Google certifié) | Vérifier certification DPF |
| **Brevo** (emails) | Email, contenu | 🇪🇺 UE | — | Aucun transfert |

## Priorité absolue : héberger en UE
La bascule de **Railway en région UE (West Europe)** supprime le transfert **principal** (toute la base).
C'est la mesure la plus efficace et la moins coûteuse.

### Runbook migration Railway → région UE (ops)
1. Dans Railway, créer/le service Postgres en **région EU West** (ou activer la région UE du projet).
2. **Sauvegarder** la base actuelle (`pg_dump` — cf. workflow de backup).
3. **Restaurer** dans la base UE (`pg_restore`), vérifier l'intégrité (comptages, migrations).
4. Basculer `DATABASE_URL` (+ `BACKUP_DATABASE_URL`) vers l'instance UE, redéployer, vérifier la santé.
5. Confirmer la région du service applicatif (UE) et **supprimer** l'ancienne instance US après contrôle.
6. Mettre à jour `sous-traitants-dpa.md` (Railway → UE, transfert supprimé).

## Modèle de TIA (pour tout transfert US résiduel — Stripe, Google, Twilio)
1. **Description** : donnée, finalité, volume, sensibilité, fréquence.
2. **Mécanisme** : DPF (vérifier l'inscription active sur dataprivacyframework.gov) ou CCT (v. 4/6/2021).
3. **Législation du pays tiers** : risque d'accès par les autorités (FISA 702 / EO 12333 pour les US).
4. **Mesures supplémentaires** : chiffrement en transit et au repos, pseudonymisation, minimisation,
   engagements contractuels renforcés du prestataire.
5. **Conclusion** : niveau de protection essentiellement équivalent ? risque résiduel acceptable ?
6. **Réexamen** : à chaque évolution réglementaire (risque « Schrems III » sur le DPF).

## Suivi
- [ ] Railway migré en région UE (supprime le transfert principal).
- [ ] Cloudinary configuré en région UE.
- [ ] DPF vérifié : Stripe, Google (+ Twilio si SMS activé).
- [ ] TIA rédigé et archivé pour chaque transfert US résiduel.
- [ ] Registre + `sous-traitants-dpa.md` mis à jour.

---
_Version 1.0 — juin 2026. À réexaminer au moins annuellement._
