import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock du pool : on teste le CONTRAT d'idempotence (booléen selon INSERT/conflit),
// pas la persistance réelle.
vi.mock('../src/db/pool', () => ({
  pool: { query: vi.fn() },
}));

import { markStripeEventProcessed, unmarkStripeEvent } from '../src/db/repositories/stripeEventRepo';
import { pool } from '../src/db/pool';

const q = vi.mocked(pool.query as unknown as (...a: unknown[]) => Promise<{ rowCount: number }>);

afterEach(() => vi.clearAllMocks());

describe('idempotence des événements Stripe', () => {
  it('renvoie true au PREMIER enregistrement (INSERT effectif)', async () => {
    q.mockResolvedValueOnce({ rowCount: 1 });
    expect(await markStripeEventProcessed('evt_1', 'checkout.session.completed')).toBe(true);
  });

  it('renvoie false si l’événement était déjà traité (ON CONFLICT DO NOTHING)', async () => {
    q.mockResolvedValueOnce({ rowCount: 0 });
    expect(await markStripeEventProcessed('evt_1', 'checkout.session.completed')).toBe(false);
  });

  it('unmark supprime le marqueur (pour laisser un retry Stripe reprendre)', async () => {
    q.mockResolvedValueOnce({ rowCount: 1 });
    await unmarkStripeEvent('evt_1');
    expect(q).toHaveBeenCalledWith('DELETE FROM stripe_events WHERE id = $1', ['evt_1']);
  });
});
