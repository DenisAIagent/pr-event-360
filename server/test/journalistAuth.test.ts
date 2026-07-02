import { afterEach, describe, expect, it, vi } from 'vitest';

// Mocks des dépendances I/O (DB + email) : on teste la logique du service.
vi.mock('../src/db/repositories/journalistRepo', () => ({
  findAcceptedJournalistByEmail: vi.fn(),
  findAcceptedJournalistByEmailForReset: vi.fn(),
  findJournalistByToken: vi.fn(),
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

const accepted = (over: Record<string, unknown> = {}) => ({
  id: 'j1',
  eventId: 'evt-1',
  token: 'tok',
  firstName: 'Léa',
  accStatus: 'acceptee',
  passwordHash: null,
  ...over,
});

afterEach(() => vi.clearAllMocks());

describe('setSpacePassword — anti-détournement du lien magique', () => {
  it('autorise le PREMIER réglage (aucun mot de passe encore défini)', async () => {
    vi.mocked(repo.findJournalistByToken).mockResolvedValue(accepted() as never);
    await setSpacePassword('tok', 'motdepassefort');
    expect(repo.setJournalistPassword).toHaveBeenCalledOnce();
  });

  it('REFUSE de remplacer un mot de passe existant via le seul lien magique', async () => {
    vi.mocked(repo.findJournalistByToken).mockResolvedValue(accepted({ passwordHash: 'argon2$hash' }) as never);
    await expect(setSpacePassword('tok', 'nouveaumotdepasse')).rejects.toBeInstanceOf(AppError);
    expect(repo.setJournalistPassword).not.toHaveBeenCalled();
  });

  it('refuse si le token est inconnu', async () => {
    vi.mocked(repo.findJournalistByToken).mockResolvedValue(null as never);
    await expect(setSpacePassword('inconnu', 'motdepassefort')).rejects.toBeInstanceOf(AppError);
  });

  it('refuse si l’accréditation n’est pas acceptée', async () => {
    vi.mocked(repo.findJournalistByToken).mockResolvedValue(accepted({ accStatus: 'pas_encore_traite' }) as never);
    await expect(setSpacePassword('tok', 'motdepassefort')).rejects.toBeInstanceOf(AppError);
    expect(repo.setJournalistPassword).not.toHaveBeenCalled();
  });
});
