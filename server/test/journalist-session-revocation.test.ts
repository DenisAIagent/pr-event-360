import { describe, expect, it, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { signJournalistSession, verifyJournalistSession } from '../src/lib/jwt';
import { loadEnv } from '../src/config/env';

/**
 * F-01 — un JWT jspace émis avant password_changed_at doit être refusé.
 * Logique miroir de resolveSpaceJournalist (test unitaire sans HTTP).
 */
function sessionRevoked(opts: {
  iat: number | undefined;
  passwordChangedAt: Date | null;
}): boolean {
  if (!opts.passwordChangedAt || !opts.iat) return false;
  return opts.iat * 1000 < opts.passwordChangedAt.getTime();
}

afterEach(() => vi.clearAllMocks());

describe('F-01 — révocation session journaliste après reset MDP', () => {
  it('expose iat sur le JWT jspace vérifié', () => {
    const token = signJournalistSession({ jid: 'j-1', eid: 'e-1' });
    const claims = verifyJournalistSession(token);
    expect(claims.jid).toBe('j-1');
    expect(claims.eid).toBe('e-1');
    expect(typeof claims.iat).toBe('number');
    expect(claims.iat!).toBeGreaterThan(1_700_000_000);
  });

  it('révoque si iat < password_changed_at', () => {
    const changed = new Date('2026-08-01T12:00:00.000Z');
    const iatBefore = Math.floor(changed.getTime() / 1000) - 60;
    expect(sessionRevoked({ iat: iatBefore, passwordChangedAt: changed })).toBe(true);
  });

  it('accepte si iat >= password_changed_at', () => {
    const changed = new Date('2026-08-01T12:00:00.000Z');
    const iatAfter = Math.floor(changed.getTime() / 1000) + 60;
    expect(sessionRevoked({ iat: iatAfter, passwordChangedAt: changed })).toBe(false);
  });

  it('n’a pas d’effet si password_changed_at est null', () => {
    expect(sessionRevoked({ iat: 1_700_000_000, passwordChangedAt: null })).toBe(false);
  });

  it('un jeton signé dans le passé est détecté comme révoqué après un reset simulé', () => {
    const env = loadEnv();
    const pastIat = Math.floor(Date.now() / 1000) - 3600;
    const token = jwt.sign(
      { jid: 'j-1', eid: 'e-1', typ: 'jspace', iat: pastIat },
      env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '30d' },
    );
    const claims = verifyJournalistSession(token);
    const resetAt = new Date();
    expect(sessionRevoked({ iat: claims.iat, passwordChangedAt: resetAt })).toBe(true);
  });
});
