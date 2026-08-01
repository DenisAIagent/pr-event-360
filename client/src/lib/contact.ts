/**
 * Point de contact commercial unique des surfaces publiques (landing, ouverture
 * d'espace). Centralisé ici pour qu'un changement d'adresse reste une seule
 * édition — l'adresse apparaît sinon dans le hero, la carte tarif, la bande CTA
 * finale et l'écran d'ouverture d'espace.
 */
export const CONTACT_EMAIL = 'tech@band.stream';

/** `mailto:` avec objet pré-rempli. L'objet est encodé, pas l'adresse. */
export function contactMailto(subject: string): string {
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export const DEMO_SUBJECT = 'Démo PR Event 360';
export const ACCESS_SUBJECT = 'Ouverture d’un espace PR Event 360';

/**
 * Libellé du CTA principal des surfaces publiques. L'ouverture d'espace se fait
 * aujourd'hui en vente assistée : on promet une demande, pas une création
 * immédiate. `/admin/abonnement` porte les deux états selon `billingEnabled` —
 * repasser ce libellé à « Créer votre espace » le jour où Stripe est activé.
 */
export const PRIMARY_CTA_LABEL = 'Demander un accès';
