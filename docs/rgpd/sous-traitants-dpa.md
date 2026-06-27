# Sous-traitants et accords de traitement (DPA — RGPD art. 28)

> Chaque sous-traitant doit être couvert par un **DPA** (Data Processing Agreement)
> signé/accepté, comportant les 9 clauses de l'art. 28.3. Tout transfert hors UE doit
> être encadré (décision d'adéquation, DPF, ou CCT + TIA).

## Tableau de suivi

| Sous-traitant | Rôle | Région | Transfert hors UE | Mécanisme | DPA | Action |
|---|---|---|---|---|---|---|
| **Hébergeur (Railway)** | Hébergement app + base PostgreSQL | ⚠️ **US West** (à migrer) | Oui (tant qu'US) | DPF / CCT + TIA | À accepter | **Migrer en région UE** (West EU) puis confirmer DPA |
| **Brevo / Sendinblue** | Envoi emails (et SMS) | 🇪🇺 UE (France) | Non | — | À accepter | Accepter le DPA dans le compte Brevo |
| **Cloudinary** | Stockage médias newsroom | 🇺🇸 US par défaut | Oui (si US) | DPF (Cloudinary inscrit) ou CCT + TIA | À accepter | Choisir **région UE** + accepter le DPA |

## Les 9 clauses obligatoires (art. 28.3) — checklist DPA
- [ ] Traitement uniquement sur instruction documentée du responsable
- [ ] Confidentialité des personnes autorisées
- [ ] Mesures de sécurité (art. 32)
- [ ] Conditions de recours à des sous-traitants ultérieurs (autorisation)
- [ ] Aide à l'exercice des droits des personnes
- [ ] Aide à la conformité (sécurité, violations, AIPD)
- [ ] Sort des données en fin de contrat (restitution / suppression)
- [ ] Mise à disposition des informations + audits
- [ ] Alerte si une instruction viole le RGPD

## Actions prioritaires
1. **Railway → région UE** (supprime le transfert principal des données journalistes).
2. **Cloudinary → région UE** + vérifier l'inscription DPF sur dataprivacyframework.gov.
3. **Accepter les DPA** des trois prestataires et archiver les preuves.
4. Tenir à jour ce tableau à chaque ajout de prestataire (anti shadow-IT).
