import { afterEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

vi.mock('../src/config/env', () => ({
  loadEnv: () => ({
    PUBLIC_BASE_URL: 'https://app.example.test',
    STRIPE_SECRET_KEY: 'stripe-secret',
    STRIPE_WEBHOOK_SECRET: 'webhook-secret',
    STRIPE_PRICE_AGENCY: 'price-agency',
  }),
}));
vi.mock('../src/db/pool', () => ({ withTransaction: vi.fn() }));
vi.mock('../src/services/orgService', () => ({ uniqueSlug: vi.fn() }));
vi.mock('../src/services/googleAuthService', () => ({ verifyGoogleCredential: vi.fn() }));
vi.mock('../src/services/passwordResetService', () => ({ requestPasswordReset: vi.fn() }));
vi.mock('../src/db/repositories/organizationRepo', () => ({
  createOrganization: vi.fn(),
  setOrgSubscription: vi.fn(),
  updateSubscriptionStatusBySubId: vi.fn(),
}));
vi.mock('../src/db/repositories/userRepo', () => ({
  createUser: vi.fn(),
  findUserByEmail: vi.fn(),
}));
vi.mock('../src/db/repositories/pendingSignupRepo', () => ({
  createPendingSignup: vi.fn(),
  setPendingSignupSession: vi.fn(),
  findPendingSignupById: vi.fn(),
  deletePendingSignup: vi.fn(),
}));
vi.mock('../src/db/repositories/stripeEventRepo', () => ({
  markStripeEventProcessed: vi.fn(),
  unmarkStripeEvent: vi.fn(),
}));
vi.mock('../src/db/repositories/eventRepo', () => ({ findEventById: vi.fn() }));
vi.mock('../src/db/repositories/orgBillingRepo', () => ({
  addEventCredits: vi.fn(),
  findOrgBilling: vi.fn(),
  findOrgIdByStripeSubscription: vi.fn(),
  insertBillingLedger: vi.fn(),
  setEventMediaPlus: vi.fn(),
  setOrgCommercialPlan: vi.fn(),
}));

const { retrieveSubscription } = vi.hoisted(() => ({ retrieveSubscription: vi.fn() }));
vi.mock('stripe', () => ({
  default: class {
    subscriptions = { retrieve: retrieveSubscription };
  },
}));

import { withTransaction } from '../src/db/pool';
import { updateSubscriptionStatusBySubId } from '../src/db/repositories/organizationRepo';
import {
  addEventCredits,
  findOrgIdByStripeSubscription,
  insertBillingLedger,
} from '../src/db/repositories/orgBillingRepo';
import { handleInvoicePaid } from '../src/services/billingService';

const invoice = (over: Record<string, unknown> = {}) =>
  ({
    id: 'in_1',
    billing_reason: 'subscription_cycle',
    subscription: 'sub_agency',
    ...over,
  }) as unknown as Stripe.Invoice;

const agencySub = {
  id: 'sub_agency',
  status: 'active',
  metadata: { plan_id: 'agency' },
  items: { data: [] },
};

afterEach(() => vi.clearAllMocks());

describe('renouvellement abonnement (invoice.paid)', () => {
  it('recharge 10 crédits agence sur un cycle de renouvellement', async () => {
    retrieveSubscription.mockResolvedValue(agencySub);
    vi.mocked(findOrgIdByStripeSubscription).mockResolvedValue('org-1');
    const db = { query: vi.fn() };
    vi.mocked(withTransaction).mockImplementation(async (fn: never) =>
      (fn as (d: unknown) => Promise<unknown>)(db),
    );

    await handleInvoicePaid(invoice());

    expect(addEventCredits).toHaveBeenCalledWith(
      'org-1',
      10,
      expect.objectContaining({
        commercialPlan: 'agency',
        extendExpireMonths: 12,
        billingSource: 'stripe',
      }),
      db,
    );
    expect(updateSubscriptionStatusBySubId).toHaveBeenCalledWith('sub_agency', 'active', null, db);
    expect(insertBillingLedger).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', planCode: 'agency', creditsDelta: 10 }),
      db,
    );
  });

  it("ignore la première facture (billing_reason=subscription_create) : crédits déjà accordés au checkout", async () => {
    await handleInvoicePaid(invoice({ billing_reason: 'subscription_create' }));
    expect(retrieveSubscription).not.toHaveBeenCalled();
    expect(addEventCredits).not.toHaveBeenCalled();
  });

  it('ignore une souscription sans plan_id (legacy) ou hors abonnement', async () => {
    retrieveSubscription.mockResolvedValue({ ...agencySub, metadata: {} });
    await handleInvoicePaid(invoice());
    expect(addEventCredits).not.toHaveBeenCalled();
  });

  it("ne crédite pas si aucune organisation n'est liée à la souscription", async () => {
    retrieveSubscription.mockResolvedValue(agencySub);
    vi.mocked(findOrgIdByStripeSubscription).mockResolvedValue(null);
    await handleInvoicePaid(invoice());
    expect(withTransaction).not.toHaveBeenCalled();
    expect(addEventCredits).not.toHaveBeenCalled();
  });

  it('lit la souscription au format API récent (invoice.parent.subscription_details)', async () => {
    retrieveSubscription.mockResolvedValue(agencySub);
    vi.mocked(findOrgIdByStripeSubscription).mockResolvedValue('org-1');
    const db = { query: vi.fn() };
    vi.mocked(withTransaction).mockImplementation(async (fn: never) =>
      (fn as (d: unknown) => Promise<unknown>)(db),
    );

    await handleInvoicePaid(
      invoice({
        subscription: undefined,
        parent: { subscription_details: { subscription: 'sub_agency' } },
      }),
    );

    expect(retrieveSubscription).toHaveBeenCalledWith('sub_agency');
    expect(addEventCredits).toHaveBeenCalled();
  });
});
