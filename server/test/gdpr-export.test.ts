import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../src/db/repositories/journalistRepo', () => ({
  findJournalistById: vi.fn(),
}));
vi.mock('../src/db/repositories/requestRepo', () => ({
  listRequestsByJournalist: vi.fn(async () => [
    {
      id: 'r1',
      eventId: 'e1',
      journalistId: 'j1',
      type: 'interview',
      artistId: null,
      slotId: null,
      stageId: null,
      message: 'Hello',
      status: 'pas_encore_traite',
      createdAt: '2026-01-01',
    },
  ]),
}));
vi.mock('../src/db/repositories/coverageRepo', () => ({
  listCoverageByJournalist: vi.fn(async () => []),
}));
vi.mock('../src/services/pressConferenceService', () => ({
  listPressConferencesForJournalist: vi.fn(async () => []),
}));

import { exportJournalistPersonalData } from '../src/services/gdprExportService';
import * as journalistRepo from '../src/db/repositories/journalistRepo';
import { AppError } from '../src/http/AppError';

describe('export RGPD art. 15/20', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exporte un JSON structuré sans hash de mot de passe', async () => {
    vi.mocked(journalistRepo.findJournalistById).mockResolvedValue({
      id: 'j1',
      eventId: 'e1',
      firstName: 'Léa',
      lastName: 'Test',
      email: 'lea@example.test',
      phone: null,
      media: 'Media',
      mediaTypeId: null,
      audience: null,
      prevArticle: null,
      lang: 'fr',
      accreditationType: 'presse',
      accStatus: 'acceptee',
      commitPublish: true,
      publishDelayDays: 8,
      consent: true,
      passwordHash: 'argon2-secret',
      createdAt: '2026-01-01',
    } as never);

    const payload = await exportJournalistPersonalData('e1', 'j1');
    expect(payload.format).toBe('PR-Event-360-GDPR-export-v1');
    expect(payload.articles).toEqual(['15', '20']);
    expect(payload.journalist).not.toHaveProperty('passwordHash');
    expect((payload.journalist as { hasPassword: boolean }).hasPassword).toBe(true);
    expect(payload.requests).toHaveLength(1);
  });

  it('refuse un journaliste hors événement (anti-IDOR)', async () => {
    vi.mocked(journalistRepo.findJournalistById).mockResolvedValue({
      id: 'j1',
      eventId: 'other-event',
      firstName: 'X',
      lastName: null,
      email: 'x@test',
      phone: null,
      media: null,
      mediaTypeId: null,
      audience: null,
      prevArticle: null,
      lang: 'fr',
      accreditationType: null,
      accStatus: 'acceptee',
      commitPublish: false,
      publishDelayDays: 8,
      consent: true,
      passwordHash: null,
      createdAt: 'now',
    } as never);

    await expect(exportJournalistPersonalData('e1', 'j1')).rejects.toBeInstanceOf(AppError);
  });
});
