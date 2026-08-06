import { describe, expect, it } from 'vitest';
import {
  COMMERCIAL_OFFERS,
  getCommercialOffer,
  launchOffers,
  STORAGE_BYTES_20_GB,
  STORAGE_BYTES_100_GB,
} from '@pr-event-360/core';

describe('catalogue commercial', () => {
  it('expose les 4 offres de lancement', () => {
    const launch = launchOffers().map((o) => o.id);
    expect(launch).toEqual(expect.arrayContaining(['event', 'pack3', 'agency', 'media_plus']));
  });

  it('fixe les prix HT de lancement', () => {
    expect(getCommercialOffer('event')?.priceHt).toBe(800);
    expect(getCommercialOffer('pack3')?.priceHt).toBe(2100);
    expect(getCommercialOffer('agency')?.priceHt).toBe(6000);
    expect(getCommercialOffer('agency_extra')?.priceHt).toBe(450);
    expect(getCommercialOffer('media_plus')?.priceHt).toBe(200);
  });

  it('attribue les crédits événement par offre', () => {
    expect(getCommercialOffer('event')?.eventCredits).toBe(1);
    expect(getCommercialOffer('pack3')?.eventCredits).toBe(3);
    expect(getCommercialOffer('agency')?.eventCredits).toBe(10);
    expect(getCommercialOffer('pack3')?.creditsValidityMonths).toBe(12);
  });

  it('définit 20 Go standard et 100 Go Média Plus', () => {
    expect(getCommercialOffer('event')?.storageBytesPerEvent).toBe(STORAGE_BYTES_20_GB);
    expect(getCommercialOffer('media_plus')?.storageBytesPerEvent).toBe(STORAGE_BYTES_100_GB);
  });

  it('marque sync avancée et vidéo comme sur devis', () => {
    expect(getCommercialOffer('sync_advanced')?.checkoutMode).toBe('quote');
    expect(getCommercialOffer('video_heavy')?.checkoutMode).toBe('quote');
  });

  it('contient toutes les offres du catalogue', () => {
    expect(COMMERCIAL_OFFERS.length).toBeGreaterThanOrEqual(7);
  });
});

describe('logique crédits (unité pure)', () => {
  function canCreate(balance: number | null, expireAt: Date | null, now = Date.now()): boolean {
    if (balance == null) return true;
    if (expireAt && expireAt.getTime() < now) return false;
    return balance > 0;
  }

  it('autorise la création si solde null (legacy/comped)', () => {
    expect(canCreate(null, null)).toBe(true);
  });

  it('refuse si solde 0', () => {
    expect(canCreate(0, null)).toBe(false);
  });

  it('refuse si crédits expirés', () => {
    expect(canCreate(3, new Date(Date.now() - 1000))).toBe(false);
  });

  it('autorise si solde > 0 et non expiré', () => {
    expect(canCreate(2, new Date(Date.now() + 86_400_000))).toBe(true);
  });
});
