import {
  COMMERCIAL_OFFERS,
  GOOGLE_DRIVE_INCLUDED,
  getCommercialOffer,
  launchOffers,
  type CommercialOffer,
  type CommercialPlanId,
  formatStorageLabel,
} from '@pr-event-360/core';
import { getStripeSettings, type StripeSettings } from './settingsService';

/**
 * Catalogue public + résolution des Price IDs Stripe par offre.
 * Priorité : surcharges super-admin (DB chiffrée) > variables d'environnement.
 */

export async function stripePriceIdForPlan(
  planId: CommercialPlanId,
  stripe?: StripeSettings,
): Promise<string | undefined> {
  const s = stripe ?? (await getStripeSettings());
  switch (planId) {
    case 'event':
      return s.priceEvent ?? s.priceId;
    case 'pack3':
      return s.pricePack3;
    case 'agency':
      return s.priceAgency;
    case 'agency_extra':
      return s.priceAgencyExtra;
    case 'media_plus':
      return s.priceMediaPlus;
    default:
      return undefined;
  }
}

/** Au moins secret + webhook + un price ID (DB ou env). */
export async function isCommercialCheckoutEnabled(): Promise<boolean> {
  const s = await getStripeSettings();
  if (!s.secretKey || !s.webhookSecret) return false;
  return Boolean(
    s.priceEvent || s.priceId || s.pricePack3 || s.priceAgency || s.priceAgencyExtra || s.priceMediaPlus,
  );
}

export async function publicCommercialCatalog() {
  const stripe = await getStripeSettings();
  const checkoutOn = Boolean(stripe.secretKey && stripe.webhookSecret);
  const offers = await Promise.all(
    COMMERCIAL_OFFERS.map(async (o) => {
      const priceId = await stripePriceIdForPlan(o.id, stripe);
      return {
        ...o,
        storageLabel: formatStorageLabel(o.storageBytesPerEvent),
        checkoutAvailable:
          o.checkoutMode !== 'quote' &&
          o.checkoutMode !== 'included' &&
          checkoutOn &&
          Boolean(priceId),
      };
    }),
  );
  return {
    currency: 'EUR',
    tax: 'HT',
    positioning:
      '800 € HT par événement, 20 Go de stockage et Google Drive inclus. Remises au volume, pas en retirant des fonctionnalités.',
    launchRecommendation: launchOffers().map((o) => o.id),
    googleDrive: GOOGLE_DRIVE_INCLUDED,
    offers,
  };
}

export function requireSellableOffer(planId: string): CommercialOffer {
  const offer = getCommercialOffer(planId);
  if (!offer) throw new Error(`Offre inconnue : ${planId}`);
  if (offer.checkoutMode === 'quote') {
    throw new Error(`L’offre ${planId} est sur devis`);
  }
  return offer;
}

export { getCommercialOffer, COMMERCIAL_OFFERS };
