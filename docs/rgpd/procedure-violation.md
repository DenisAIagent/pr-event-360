# Procédure de violation de données

**Version 1.1 — 18 juillet 2026.**

Toute destruction, perte, altération, divulgation ou accès non autorisé doit être consigné. Pour les données d’un Client, MDMC OÜ notifie le Client sans délai injustifié ; le Client décide des notifications à l’autorité et aux personnes. Pour ses traitements propres, MDMC OÜ applique directement les obligations.

## Chaîne d’alerte

1. signaler immédiatement à `rgpd@mdmcmusicads.com` ;
2. préserver les preuves et horodater la découverte ;
3. qualifier données, tenants, personnes, volume et accès ;
4. contenir sans détruire les preuves ;
5. évaluer vraisemblance et gravité ;
6. notifier le Client ;
7. aider à la notification réglementaire ;
8. corriger, surveiller et faire un retour d’expérience.

## Délais

| Action | Délai |
|---|---|
| notification du Client par le sous-traitant | sans délai injustifié |
| notification de l’autorité par le responsable | 72 h si requise |
| information des personnes | meilleurs délais si risque élevé |
| registre interne | toujours |

## Vecteurs spécifiques

- accès croisé entre tenants ;
- compromission PostgreSQL ou sauvegarde ;
- session admin ou perte du facteur TOTP ;
- lien journaliste divulgué ;
- clé Brevo/Twilio/Cloudinary/Stripe ;
- upload ou contenu malveillant ;
- domaine client détourné ;
- erreur d’envoi de newsletter ;
- export RGPD remis au mauvais destinataire.

## Mesures immédiates possibles

- désactiver un compte ou abonnement compromis ;
- réinitialiser le mot de passe, ce qui révoque les sessions antérieures ;
- faire tourner le token journaliste ;
- révoquer/changer une clé fournisseur ;
- désactiver `NOTIFICATIONS_MODE=live` ;
- retirer un domaine ou contenu ;
- isoler une version vulnérable ;
- faire tourner `JWT_SECRET` si nécessaire, ce qui invalide toutes les sessions.

Les admins et super-admins sont déjà soumis à la MFA obligatoire ; vérifier les journaux d’enrôlement et d’accès.

## Registre

| Détection | Tenant | Données/personnes | Cause | Risque | Confinement | Client informé | Autorité/personnes | Clôture |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

Le dossier doit conserver les faits, effets, décisions, motifs de non-notification et actions correctives.
