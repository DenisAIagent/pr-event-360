import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  loadEnv: () => ({
    PUBLIC_BASE_URL: 'https://app.example.test',
    STRIPE_SECRET_KEY: 'stripe-secret',
    STRIPE_WEBHOOK_SECRET: 'webhook-secret',
    STRIPE_PRICE_ID: 'price-1',
  }),
}));
vi.mock('../src/db/pool', () => ({ withTransaction: vi.fn() }));
vi.mock('../src/services/orgService', () => ({ uniqueSlug: vi.fn(async () => 'org') }));
vi.mock('../src/services/googleAuthService', () => ({ verifyGoogleCredential: vi.fn() }));
vi.mock('../src/db/repositories/organizationRepo', () => ({
  createOrganization: vi.fn(async () => ({ id: 'org-1' })),
  setOrgSubscription: vi.fn(),
  updateSubscriptionStatusBySubId: vi.fn(),
}));
vi.mock('../src/db/repositories/userRepo', () => ({
  createUser: vi.fn(async () => ({ id: 'user-1' })),
  findUserByEmail: vi.fn(async () => null),
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
vi.mock('../src/services/passwordResetService', () => ({ requestPasswordReset: vi.fn() }));

import { withTransaction } from '../src/db/pool';
import * as orgRepo from '../src/db/repositories/organizationRepo';
import * as userRepo from '../src/db/repositories/userRepo';
import * as pendingRepo from '../src/db/repositories/pendingSignupRepo';
import { requestPasswordReset } from '../src/services/passwordResetService';
import { materializeFromSession } from '../src/services/billingService';

const pending = (sessionId: string) => ({
  id: 'pending-1',
  email: 'victim@example.test',
  orgName: 'Org',
  fullName: 'Victim',
  googleId: null,
  authProvider: 'password' as const,
  stripeSessionId: sessionId,
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
});

afterEach(() => vi.clearAllMocks());

describe('matérialisation Stripe', () => {
  it('refuse un pending_id qui appartient à une autre session Stripe', async () => {
    vi.mocked(pendingRepo.findPendingSignupById).mockResolvedValue(pending('cs_expected'));
    await materializeFromSession({
      id: 'cs_attacker',
      client_reference_id: 'pending-1',
      metadata: {},
      subscription: null,
      customer: null,
    } as never);
    expect(withTransaction).not.toHaveBeenCalled();
  });

  it('crée un secret aléatoire et exige une preuve email par lien de reset', async () => {
    vi.mocked(pendingRepo.findPendingSignupById).mockResolvedValue(pending('cs_paid'));
    vi.mocked(withTransaction).mockImplementation(async (fn: never) =>
      (fn as (db: unknown) => Promise<unknown>)({ query: vi.fn() }),
    );
    await materializeFromSession({
      id: 'cs_paid',
      client_reference_id: 'pending-1',
      metadata: {},
      subscription: null,
      customer: null,
    } as never);
    const created = vi.mocked(userRepo.createUser).mock.calls[0]![0];
    expect(created.passwordHash).toEqual(expect.any(String));
    expect(orgRepo.setOrgSubscription).toHaveBeenCalled();
    expect(requestPasswordReset).toHaveBeenCalledWith('victim@example.test');
  });
});
