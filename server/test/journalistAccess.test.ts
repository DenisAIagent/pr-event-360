import { afterEach, describe, expect, it, vi } from 'vitest';

// Mock des I/O : on teste la logique d'émission/échange du jeton d'accès.
vi.mock('../src/db/repositories/journalistRepo', () => ({
  findAcceptedJournalistByEmailForReset: vi.fn(),
  findJournalistByAccessTokenHash: vi.fn(),
  findJournalistById: vi.fn(),
  setJournalistAccessToken: vi.fn(),
}));
vi.mock('../src/db/repositories/eventRepo', () => ({
  getBranding: vi.fn(async () => null),
  findEventById: vi.fn(async () => ({ id: 'evt-1', name: 'Festival X' })),
}));
vi.mock('../src/services/notifications/email', () => ({
  ctaButton: vi.fn(() => ''),
  eventSenderName: vi.fn(() => 'Festival X'),
  sendBrandedEmail: vi.fn(async () => ({ status: 'simulated', provider: 'simulation' })),
}));

import { exchangeAccessToken, issueAccessToken } from '../src/services/journalistAccessService';
import * as repo from '../src/db/repositories/journalistRepo';
import { hashResetToken } from '../src/lib/token';
import { AppError } from '../src/http/AppError';

afterEach(() => vi.clearAllMocks());

describe('issueAccessToken', () => {
  it('stocke le HASH (jamais le brut) avec une expiration future, et renvoie le jeton brut', async () => {
    const raw = await issueAccessToken('j1');
    expect(raw).toMatch(/^[A-Za-z0-9_-]{20,}$/); // base64url, 256 bits
    const call = vi.mocked(repo.setJournalistAccessToken).mock.calls[0]!;
    expect(call[0]).toBe('j1');
    expect(call[1]).toBe(hashResetToken(raw)); // c'est bien le HASH qui est persisté
    expect(call[1]).not.toContain(raw);
    expect((call[2] as Date).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('exchangeAccessToken', () => {
  it('résout la session (jid, eid) pour un jeton valide et accepté', async () => {
    vi.mocked(repo.findJournalistByAccessTokenHash).mockResolvedValue({
      id: 'j1',
      eventId: 'evt-1',
      accStatus: 'acceptee',
    } as never);
    const raw = 'un-jeton-brut';
    await expect(exchangeAccessToken(raw)).resolves.toEqual({ jid: 'j1', eid: 'evt-1' });
    // Comparaison par hash, jamais par le brut.
    expect(repo.findJournalistByAccessTokenHash).toHaveBeenCalledWith(hashResetToken(raw));
  });

  it('rejette un jeton inconnu/expiré', async () => {
    vi.mocked(repo.findJournalistByAccessTokenHash).mockResolvedValue(null as never);
    await expect(exchangeAccessToken('x')).rejects.toBeInstanceOf(AppError);
  });

  it('rejette si l’accréditation n’est pas acceptée', async () => {
    vi.mocked(repo.findJournalistByAccessTokenHash).mockResolvedValue({
      id: 'j1',
      eventId: 'evt-1',
      accStatus: 'pas_encore_traite',
    } as never);
    await expect(exchangeAccessToken('x')).rejects.toBeInstanceOf(AppError);
  });
});
