import { afterEach, describe, expect, it, vi } from 'vitest';

// Mocks des dépendances I/O (DB + email) : on teste la logique du service.
vi.mock('../src/db/repositories/journalistRepo', () => ({
  findAcceptedJournalistByEmail: vi.fn(),
  findAcceptedJournalistByEmailForReset: vi.fn(),
  findJournalistByToken: vi.fn(),
  revokeJournalistAccessToken: vi.fn(),
  rotateJournalistAccessToken: vi.fn(),
  setJournalistPassword: vi.fn(),
}));
vi.mock('../src/db/repositories/journalistResetRepo', () => ({
  createJournalistReset: vi.fn(),
  deletePendingForJournalist: vi.fn(),
  consumeJournalistReset: vi.fn(),
}));
vi.mock('../src/db/repositories/eventRepo', () => ({
  getBranding: vi.fn(async () => null),
  findEventById: vi.fn(async () => ({ id: 'evt-1', name: 'Festival X' })),
}));
vi.mock('../src/services/notifications/email', () => ({
  ctaButton: vi.fn(() => ''),
  eventSenderName: vi.fn(() => 'Festival X'),
  sendBrandedEmail: vi.fn(async () => undefined),
}));

import { setSpacePassword } from '../src/services/journalistAuthService';
import * as repo from '../src/db/repositories/journalistRepo';
import { AppError } from '../src/http/AppError';
import type { Journalist } from '../src/domain';

const accepted = (over: Record<string, unknown> = {}): Journalist =>
  ({
    id: 'j1',
    eventId: 'evt-1',
    firstName: 'Léa',
    lastName: null,
    email: 'lea@example.test',
    phone: null,
    media: null,
    mediaTypeId: null,
    audience: null,
    prevArticle: null,
    lang: 'fr',
    accreditationType: 'presse',
    accStatus: 'acceptee',
    commitPublish: true,
    publishDelayDays: 0,
    consent: true,
    passwordHash: null,
    passwordChangedAt: null,
    checkedInAt: null,
    createdAt: 'now',
    ...over,
  }) as Journalist;

afterEach(() => vi.clearAllMocks());

describe('setSpacePassword — anti-détournement du lien magique', () => {
  it('autorise le PREMIER réglage (aucun mot de passe encore défini)', async () => {
    await setSpacePassword(accepted(), 'motdepassefort12');
    expect(repo.setJournalistPassword).toHaveBeenCalledOnce();
  });

  it('REFUSE de remplacer un mot de passe existant via le seul lien magique', async () => {
    await expect(
      setSpacePassword(accepted({ passwordHash: 'argon2$hash' }), 'nouveaumotdepasse12'),
    ).rejects.toBeInstanceOf(AppError);
    expect(repo.setJournalistPassword).not.toHaveBeenCalled();
  });

  it('refuse si l’accréditation n’est pas acceptée', async () => {
    await expect(
      setSpacePassword(accepted({ accStatus: 'pas_encore_traite' }), 'motdepassefort12'),
    ).rejects.toBeInstanceOf(AppError);
    expect(repo.setJournalistPassword).not.toHaveBeenCalled();
  });

  it('refuse un mot de passe trop court (< 12)', async () => {
    await expect(setSpacePassword(accepted(), 'court')).rejects.toBeInstanceOf(AppError);
    expect(repo.setJournalistPassword).not.toHaveBeenCalled();
  });
});
