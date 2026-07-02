import { describe, expect, it } from 'vitest';
import { mfaRequiredFor } from '../src/lib/mfaPolicy';
import { generateSecret, generateTotp, verifyTotp } from '../src/lib/totp';

describe('mfaRequiredFor — politique MFA obligatoire', () => {
  it('exige la MFA pour les admins et les super-admins plateforme', () => {
    expect(mfaRequiredFor('admin', false)).toBe(true);
    expect(mfaRequiredFor('assistant', true)).toBe(true); // platform admin quel que soit le rôle
    expect(mfaRequiredFor('attache', true)).toBe(true);
  });

  it('n’exige pas la MFA pour attaché/assistant non-plateforme', () => {
    expect(mfaRequiredFor('attache', false)).toBe(false);
    expect(mfaRequiredFor('assistant', false)).toBe(false);
  });
});

describe('TOTP — generate/verify', () => {
  it('un code fraîchement généré est accepté', () => {
    const secret = generateSecret();
    expect(verifyTotp(generateTotp(secret), secret)).toBe(true);
  });

  it('un code de la fenêtre précédente reste accepté (tolérance ±1)', () => {
    const secret = generateSecret();
    expect(verifyTotp(generateTotp(secret, -1), secret)).toBe(true);
  });

  it('rejette un mauvais code et un secret différent', () => {
    const secret = generateSecret();
    expect(verifyTotp('000000', secret)).toBe(false);
    expect(verifyTotp(generateTotp(secret), generateSecret())).toBe(false);
  });
});
