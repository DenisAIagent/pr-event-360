import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async () => 'data:image/png;base64,qr') } }));
vi.mock('../src/lib/crypto', () => ({
  isEncryptionAvailable: vi.fn(() => true),
  encryptSecret: vi.fn((value: string) => `enc:${value}`),
  decryptSecret: vi.fn((value: string) => value.replace(/^enc:/, '')),
}));
vi.mock('../src/lib/totp', () => ({
  generateSecret: vi.fn(() => 'new-secret'),
  keyuri: vi.fn(() => 'otpauth://test'),
  verifyTotp: vi.fn(),
  verifyTotpCounter: vi.fn(),
}));
vi.mock('../src/db/repositories/userRepo', () => ({
  getUserMfa: vi.fn(),
  setUserMfaPendingSecret: vi.fn(),
  enableUserMfa: vi.fn(async () => true),
  clearUserMfa: vi.fn(),
  consumeMfaCounter: vi.fn(async () => true),
}));

import * as userRepo from '../src/db/repositories/userRepo';
import * as totp from '../src/lib/totp';
import { confirmMfa, startMfaSetup } from '../src/services/mfaService';
import { AppError } from '../src/http/AppError';

afterEach(() => vi.clearAllMocks());

describe('ré-enrôlement MFA', () => {
  it('refuse de préparer un nouveau secret sans code MFA actuel', async () => {
    vi.mocked(userRepo.getUserMfa).mockResolvedValue({
      enabled: true,
      secret: 'enc:current-secret',
      pendingSecret: null,
    });
    await expect(startMfaSetup('user-1', 'admin@example.test')).rejects.toBeInstanceOf(AppError);
    expect(userRepo.setUserMfaPendingSecret).not.toHaveBeenCalled();
  });

  it('conserve le secret actif et écrit uniquement un secret en attente après preuve', async () => {
    vi.mocked(userRepo.getUserMfa).mockResolvedValue({
      enabled: true,
      secret: 'enc:current-secret',
      pendingSecret: null,
    });
    vi.mocked(totp.verifyTotpCounter).mockReturnValue(42);
    await startMfaSetup('user-1', 'admin@example.test', '123456');
    expect(userRepo.setUserMfaPendingSecret).toHaveBeenCalledWith('user-1', 'enc:new-secret');
    expect(userRepo.clearUserMfa).not.toHaveBeenCalled();
    // Le code présenté pour le ré-enrôlement est consommé : il ne peut pas être rejoué.
    expect(userRepo.consumeMfaCounter).toHaveBeenCalledWith('user-1', 42);
  });

  it('refuse un ré-enrôlement présentant un code déjà consommé (rejeu)', async () => {
    vi.mocked(userRepo.getUserMfa).mockResolvedValue({
      enabled: true,
      secret: 'enc:current-secret',
      pendingSecret: null,
    });
    vi.mocked(totp.verifyTotpCounter).mockReturnValue(42);
    vi.mocked(userRepo.consumeMfaCounter).mockResolvedValue(false); // fenêtre déjà consommée
    await expect(
      startMfaSetup('user-1', 'admin@example.test', '123456'),
    ).rejects.toBeInstanceOf(AppError);
    expect(userRepo.setUserMfaPendingSecret).not.toHaveBeenCalled();
  });

  it('confirme le nouveau code contre le secret en attente, pas le secret actif', async () => {
    vi.mocked(userRepo.getUserMfa).mockResolvedValue({
      enabled: true,
      secret: 'enc:current-secret',
      pendingSecret: 'enc:pending-secret',
    });
    vi.mocked(totp.verifyTotpCounter).mockReturnValue(7);
    await confirmMfa('user-1', '654321');
    expect(totp.verifyTotpCounter).toHaveBeenCalledWith('654321', 'pending-secret');
    expect(userRepo.enableUserMfa).toHaveBeenCalledWith('user-1', 'enc:pending-secret');
    // Le code de confirmation ne doit pas resservir immédiatement comme code de connexion.
    expect(userRepo.consumeMfaCounter).toHaveBeenCalledWith('user-1', 7);
  });
});
