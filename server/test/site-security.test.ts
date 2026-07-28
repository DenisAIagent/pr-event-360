import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/repositories/eventRepo', () => ({
  findEventByCustomDomain: vi.fn(),
  findEventBySubdomain: vi.fn(),
}));

import * as eventRepo from '../src/db/repositories/eventRepo';
import { isReservedCustomDomain, resolveEventForHost } from '../src/services/siteService';
import { loadEnv } from '../src/config/env';
import { eventDomainsRouter } from '../src/routes/admin/eventDomains';
import { requirePlatformAdmin } from '../src/middleware/auth';

const event = (verified: boolean) => ({
  id: 'event-1',
  organizationId: 'org-1',
  ownerUserId: 'user-1',
  name: 'Festival',
  location: null,
  startDate: null,
  endDate: null,
  languages: ['fr'],
  accreditationDeadline: null,
  customDomain: 'press.security-test.example',
  customDomainVerified: verified,
  subdomainSlug: null,
  createdAt: 'now',
});

afterEach(() => vi.clearAllMocks());

describe('routage Host des événements', () => {
  it('ne route jamais un domaine personnalisé avant preuve DNS', async () => {
    vi.mocked(eventRepo.findEventByCustomDomain).mockResolvedValue(event(false) as never);
    await expect(resolveEventForHost('unverified.security-test.example')).resolves.toBeNull();
  });

  it('route un domaine personnalisé vérifié', async () => {
    const verified = event(true);
    vi.mocked(eventRepo.findEventByCustomDomain).mockResolvedValue(verified as never);
    await expect(resolveEventForHost('verified.security-test.example')).resolves.toMatchObject({ id: 'event-1' });
  });

  it('réserve les hosts officiels de la plateforme', () => {
    expect(isReservedCustomDomain(new URL(loadEnv().PUBLIC_BASE_URL).hostname)).toBe(true);
    expect(isReservedCustomDomain(new URL(loadEnv().CLIENT_URL).hostname)).toBe(true);
  });

  it('ignore aussi une ancienne affectation vérifiée sur un host désormais réservé', async () => {
    vi.mocked(eventRepo.findEventByCustomDomain).mockResolvedValue(event(true) as never);
    await expect(resolveEventForHost(new URL(loadEnv().PUBLIC_BASE_URL).hostname)).resolves.toBeNull();
    expect(eventRepo.findEventByCustomDomain).not.toHaveBeenCalled();
  });

  it('réserve affectation et vérification des domaines au super-admin plateforme', () => {
    const protectedPaths = ['/:eventId/domain', '/:eventId/domain/verify'];
    for (const path of protectedPaths) {
      const layer = (eventDomainsRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }> })
        .stack.find((candidate) => candidate.route?.path === path);
      expect(layer?.route?.stack.some((handler) => handler.handle === requirePlatformAdmin)).toBe(true);
    }
  });
});
