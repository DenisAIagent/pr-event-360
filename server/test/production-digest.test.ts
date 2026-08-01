import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/db/repositories/eventRepo', () => ({
  findEventById: vi.fn(),
  getBranding: vi.fn(),
  listEventMemberIds: vi.fn(),
}));
vi.mock('../src/db/repositories/userRepo', () => ({ findUserById: vi.fn() }));
vi.mock('../src/db/repositories/notificationRepo', () => ({ insertNotification: vi.fn() }));
vi.mock('../src/db/repositories/productionRepo', () => ({
  eventsWithPendingReviews: vi.fn(),
  getDigestSentAt: vi.fn(),
  reviewsSince: vi.fn(),
  touchDigestSent: vi.fn(),
}));
vi.mock('../src/services/notifications/providers', () => ({ getEmailProvider: vi.fn() }));

import { findEventById, getBranding, listEventMemberIds } from '../src/db/repositories/eventRepo';
import { findUserById } from '../src/db/repositories/userRepo';
import { insertNotification } from '../src/db/repositories/notificationRepo';
import {
  getDigestSentAt,
  reviewsSince,
  touchDigestSent,
} from '../src/db/repositories/productionRepo';
import { getEmailProvider } from '../src/services/notifications/providers';
import { sendProductionDigest } from '../src/services/productionDigestService';

const send = vi.fn();

function review(over: Record<string, unknown> = {}) {
  return {
    requestId: 'r1',
    verdict: 'favorable',
    comment: null,
    contactName: 'Manager Alpha',
    artistName: 'Artiste Alpha',
    journalistName: 'Léa Martin',
    media: 'Le Monde',
    requestType: 'interview',
    at: new Date('2026-08-01T10:00:00Z'),
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ status: 'sent', provider: 'simulation' });
  vi.mocked(getEmailProvider).mockResolvedValue({ name: 'simulation', send } as never);
  vi.mocked(findEventById).mockResolvedValue({ id: 'e1', name: 'Festival' } as never);
  vi.mocked(getBranding).mockResolvedValue({ logoUrl: null, accentColor: null } as never);
  vi.mocked(listEventMemberIds).mockResolvedValue(['u1', 'u2']);
  vi.mocked(findUserById).mockImplementation((id) =>
    Promise.resolve({ id, email: `${id}@equipe.test`, fullName: 'Membre' } as never),
  );
  vi.mocked(getDigestSentAt).mockResolvedValue(null);
  vi.mocked(insertNotification).mockResolvedValue(undefined as never);
  vi.mocked(touchDigestSent).mockResolvedValue(undefined as never);
});

describe('récapitulatif des avis production', () => {
  it('envoie un seul email par membre, regroupant tous les avis', async () => {
    vi.mocked(reviewsSince).mockResolvedValue([
      review(),
      review({ requestId: 'r2', verdict: 'defavorable', comment: 'Indisponible' }),
    ] as never);

    const res = await sendProductionDigest('e1');

    expect(res).toEqual({ reviews: 2, recipients: 2 });
    expect(send).toHaveBeenCalledTimes(2); // un par membre, pas un par avis
    const [msg] = send.mock.calls[0]!;
    expect(msg.subject).toContain('2 avis production');
    expect(msg.subject).toContain('1 favorable');
    expect(msg.body).toContain('Artiste Alpha');
    expect(msg.body).toContain('Indisponible');
  });

  it('journalise chaque envoi pour l’onglet Messages', async () => {
    vi.mocked(reviewsSince).mockResolvedValue([review()] as never);

    await sendProductionDigest('e1');

    expect(insertNotification).toHaveBeenCalledTimes(2);
    expect(insertNotification).toHaveBeenCalledWith(
      expect.objectContaining({ journalistId: null, triggerKey: 'production_reviews_digest' }),
    );
  });

  it('n’envoie rien et ne déplace pas la borne sans avis nouveau', async () => {
    vi.mocked(reviewsSince).mockResolvedValue([] as never);

    const res = await sendProductionDigest('e1');

    expect(res).toEqual({ reviews: 0, recipients: 0 });
    expect(send).not.toHaveBeenCalled();
    // Déplacer la borne ici rendrait invisible un avis arrivé entre-temps.
    expect(touchDigestSent).not.toHaveBeenCalled();
  });

  it('avance la borne même sans destinataire, pour ne pas réémettre le même lot', async () => {
    vi.mocked(listEventMemberIds).mockResolvedValue([]);
    vi.mocked(reviewsSince).mockResolvedValue([review()] as never);

    const res = await sendProductionDigest('e1');

    expect(res).toEqual({ reviews: 1, recipients: 0 });
    expect(send).not.toHaveBeenCalled();
    expect(touchDigestSent).toHaveBeenCalledWith('e1');
  });

  it('repart de la dernière borne connue', async () => {
    vi.mocked(getDigestSentAt).mockResolvedValue('2026-07-31T09:00:00.000Z');
    vi.mocked(reviewsSince).mockResolvedValue([review()] as never);

    await sendProductionDigest('e1');

    expect(reviewsSince).toHaveBeenCalledWith('e1', '2026-07-31T09:00:00.000Z');
  });
});
