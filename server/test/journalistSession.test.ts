import { describe, expect, it } from 'vitest';
import {
  signJournalistSession,
  verifyJournalistSession,
  verifyToken,
  signToken,
  type AuthClaims,
} from '../src/lib/jwt';
import { JSPACE_COOKIE, journalistSessionFromReq } from '../src/lib/journalistSession';

describe('JWT session journaliste (typ:jspace)', () => {
  it('signe et vérifie des claims jid/eid', () => {
    const token = signJournalistSession({ jid: 'j-1', eid: 'e-1' });
    expect(verifyJournalistSession(token)).toEqual({ jid: 'j-1', eid: 'e-1' });
  });

  it('rejette un JWT de session admin comme session journaliste', () => {
    const admin: AuthClaims = {
      sub: 'u-1',
      email: 'a@b.c',
      role: 'admin',
      organizationId: 'o-1',
      isPlatformAdmin: false,
    };
    const token = signToken(admin);
    expect(() => verifyJournalistSession(token)).toThrow(/invalide/i);
  });

  it('rejette un JWT jspace comme session admin', () => {
    const token = signJournalistSession({ jid: 'j-1', eid: 'e-1' });
    expect(() => verifyToken(token)).toThrow(/type invalide/i);
  });

  it('lit les claims depuis le cookie de requête', () => {
    const token = signJournalistSession({ jid: 'j-9', eid: 'e-9' });
    const req = { cookies: { [JSPACE_COOKIE]: token } } as never;
    expect(journalistSessionFromReq(req)).toEqual({ jid: 'j-9', eid: 'e-9' });
  });

  it('renvoie null si le cookie est absent ou invalide', () => {
    expect(journalistSessionFromReq({ cookies: {} } as never)).toBeNull();
    expect(
      journalistSessionFromReq({ cookies: { [JSPACE_COOKIE]: 'not-a-jwt' } } as never),
    ).toBeNull();
  });
});
