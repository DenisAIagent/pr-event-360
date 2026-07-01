import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks des dépendances I/O du service (DB + fournisseur email). On teste la
// LOGIQUE du flux, pas la persistance réelle.
vi.mock('../src/db/repositories/userRepo', () => ({
  findUserByEmail: vi.fn(),
  updatePasswordHash: vi.fn(),
}));
vi.mock('../src/db/repositories/passwordResetRepo', () => ({
  deletePendingForUser: vi.fn(),
  createResetToken: vi.fn(),
  consumeResetToken: vi.fn(),
}));
vi.mock('../src/services/notifications/providers', () => ({
  getEmailProvider: vi.fn(() => ({
    name: 'simulation',
    send: vi.fn(async () => ({ status: 'simulated', provider: 'simulation' })),
  })),
}));

import { requestPasswordReset, resetPassword } from '../src/services/passwordResetService';
import * as userRepo from '../src/db/repositories/userRepo';
import * as resetRepo from '../src/db/repositories/passwordResetRepo';
import { hashResetToken } from '../src/lib/token';
import { AppError } from '../src/http/AppError';
import argon2 from 'argon2';

const user = { id: 'u1', email: 'press@event.fr', fullName: 'Léa', role: 'attache' as const, createdAt: 'now' };

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('requestPasswordReset', () => {
  it('émet un jeton et invalide les précédents quand le compte existe', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(user);

    await requestPasswordReset('PRESS@event.fr'); // casse mélangée → normalisée

    expect(userRepo.findUserByEmail).toHaveBeenCalledWith('press@event.fr');
    expect(resetRepo.deletePendingForUser).toHaveBeenCalledWith('u1');
    expect(resetRepo.createResetToken).toHaveBeenCalledOnce();
    const arg = vi.mocked(resetRepo.createResetToken).mock.calls[0]![0];
    expect(arg.userId).toBe('u1');
    expect(arg.tokenHash).toMatch(/^[0-9a-f]{64}$/); // SHA-256 hex
    expect(arg.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('ne fait rien (silencieux) quand le compte n’existe pas — anti-énumération', async () => {
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);

    await expect(requestPasswordReset('inconnu@event.fr')).resolves.toBeUndefined();

    expect(resetRepo.deletePendingForUser).not.toHaveBeenCalled();
    expect(resetRepo.createResetToken).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  it('met à jour le mot de passe en consommant atomiquement le jeton valide', async () => {
    vi.mocked(resetRepo.consumeResetToken).mockResolvedValue({ userId: 'u1' });

    await resetPassword('le-jeton-brut', 'nouveauMotDePasse');

    // Le service consomme par HASH (marquage + récupération du compte en une requête), jamais par jeton en clair.
    expect(resetRepo.consumeResetToken).toHaveBeenCalledWith(hashResetToken('le-jeton-brut'));
    const [userId, hash] = vi.mocked(userRepo.updatePasswordHash).mock.calls[0]!;
    expect(userId).toBe('u1');
    await expect(argon2.verify(hash, 'nouveauMotDePasse')).resolves.toBe(true);
  });

  it('rejette un jeton inconnu/expiré/déjà consommé sans toucher au mot de passe', async () => {
    vi.mocked(resetRepo.consumeResetToken).mockResolvedValue(null);

    await expect(resetPassword('mauvais-jeton', 'peu-importe')).rejects.toBeInstanceOf(AppError);
    expect(userRepo.updatePasswordHash).not.toHaveBeenCalled();
  });
});
