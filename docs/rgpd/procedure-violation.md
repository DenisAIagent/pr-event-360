# Procédure de gestion des violations de données (RGPD art. 33-34)

> Une **violation de données** = destruction, perte, altération, divulgation ou accès
> non autorisé à des données personnelles (art. 4.12). **Toute** violation doit être
> consignée dans le registre interne, même sans notification à la CNIL.

## Chaîne d'alerte
1. **Détection** — toute personne (équipe, sous-traitant) signale immédiatement à : _[email cellule RGPD]_.
2. **Qualification** (< 24 h) — le référent RGPD qualifie : s'agit-il d'une violation ? quelles données, combien de personnes, quel risque ?
3. **Confinement** — stopper la fuite (révoquer accès/tokens, corriger la faille, changer les secrets).
4. **Évaluation du risque** pour les droits et libertés des personnes (faible / élevé).

## Délais réglementaires
| Action | Délai | Condition |
|---|---|---|
| Notification à la **CNIL** (art. 33) | **72 h** après prise de connaissance | Sauf si risque improbable pour les personnes |
| Communication **aux personnes** (art. 34) | Dans les meilleurs délais | Si risque **élevé** |
| Inscription au **registre interne** (art. 33.5) | Systématique | **Toute** violation |

> Exception (art. 34.3.a) : pas de communication aux personnes si les données étaient
> **chiffrées** (état de l'art) et la clé non compromise.

## Notification CNIL — contenu minimal (art. 33.3)
- Nature de la violation, catégories et nombre approximatif de personnes et d'enregistrements.
- Coordonnées du DPO / point de contact.
- Conséquences probables.
- Mesures prises ou proposées pour y remédier / en atténuer les effets.
- Notification possible **en phases** si tout n'est pas connu sous 72 h.

➡️ Téléservice CNIL : https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles

## Registre interne des violations (à tenir)

| Date | Description | Données & personnes concernées | Cause | Gravité | Mesures | Notifiée CNIL ? | Personnes informées ? |
|------|-------------|--------------------------------|-------|---------|---------|-----------------|-----------------------|
|      |             |                                |       |         |         |                 |                       |

## Spécifique PR Event 360
- **Vecteurs à surveiller** : fuite de la base PostgreSQL, compromission d'un compte admin (→ déployer le **MFA**), fuite d'un **token d'espace journaliste** (URL), compromission d'une clé API tierce (Brevo/Cloudinary).
- **Réflexe immédiat en cas de doute sur un secret** : régénérer la clé concernée (Intégrations) et faire tourner `JWT_SECRET`.
