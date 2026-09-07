import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Non-régression — cohérence prix ↔ offre sur les achats depuis un compte
 * existant (SEC-04).
 *
 * `materializeFromSession` (inscription) refusait déjà un Price ID inattendu ;
 * `materializeOrgPurchase` (pack, extra agence, Média Plus) créditait sur la
 * seule foi des métadonnées de la session. Ces tests fixent la règle des deux
 * côtés : on ne livre que ce qui a été payé au tarif de l'offre annoncée.
 */

const retrieveSession = vi.fn();

vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { retrieve: retrieveSession, create: vi.fn() } };
    subscriptions = { retrieve: vi.fn() };
    webhooks = { constructEvent: vi.fn() };
  },
}));
vi.mock('../src/services/settingsService', () => ({
  getStripeSettings: vi.fn(async () => ({
    secretKey: 'sk_test',
    webhookSecret: 'whsec',
    priceId: null,
    priceEvent: 'price_event',
    pricePack3: 'price_pack3',
    priceAgency: 'price_agency',
    priceAgencyExtra: 'price_extra',
    priceMediaPlus: 'price_media_plus',
  })),
}));
vi.mock('../src/db/pool', () => ({ withTransaction: vi.fn() }));
vi.mock('../src/db/repositories/orgBillingRepo', () => ({
  addEventCredits: vi.fn(),
  findOrgBilling: vi.fn(),
  findOrgIdByStripeSubscription: vi.fn(),
  insertBillingLedger: vi.fn(),
  setEventMediaPlus: vi.fn(),
  setOrgCommercialPlan: vi.fn(),
}));

import { withTransaction } from '../src/db/pool';
import * as billingRepo from '../src/db/repositories/orgBillingRepo';
import { handleOrgPurchaseForTest } from '../src/services/billingService';

const session = (priceId: string) => {
  retrieveSession.mockResolvedValue({ line_items: { data: [{ price: { id: priceId } }] } });
  return {
    id: 'cs_pack',
    payment_status: 'paid',
    payment_intent: 'pi_1',
    subscription: null,
    customer: null,
    metadata: { kind: 'org_purchase', organization_id: 'org-1', plan_id: 'pack3', event_id: '' },
  } as never;
};

afterEach(() => vi.clearAllMocks());

describe('SEC-04 — achat depuis un compte existant', () => {
  it('refuse de créditer quand le prix payé n’est pas celui de l’offre annoncée', async () => {
    await handleOrgPurchaseForTest(session('price_media_plus')); // moins cher que pack3
    expect(withTransaction).not.toHaveBeenCalled();
    expect(billingRepo.addEventCredits).not.toHaveBeenCalled();
  });

  it('crédite normalement quand le prix correspond à l’offre', async () => {
    vi.mocked(withTransaction).mockImplementation(async (fn: never) =>
      (fn as (db: unknown) => Promise<unknown>)({ query: vi.fn() }),
    );
    await handleOrgPurchaseForTest(session('price_pack3'));
    expect(billingRepo.addEventCredits).toHaveBeenCalled();
  });
});
