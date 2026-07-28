import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/env', () => ({
  loadEnv: () => ({
    GOOGLE_CLIENT_ID: 'google-client',
    JWT_SECRET: 'x'.repeat(32),
  }),
}));
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    async verifyIdToken() {
      return {
        getPayload: () => ({
          sub: 'google-1',
          email: 'admin@example.test',
          email_verified: true,
          name: 'Admin',
        }),
      };
    }
  },
}));
vi.mock('../src/db/repositories/userRepo', () => ({
  findUserByGoogleId: vi.fn(),
  findUserByEmail: vi.fn(),
  getUserMfa: vi.fn(),
  linkGoogleId: vi.fn(),
}));
vi.mock('../src/services/authService', () => ({ assertSubscriptionActive: vi.fn() }));
vi.mock('../src/lib/jwt', () => ({
  signMfaChallenge: vi.fn(() => 'mfa-challenge'),
  signToken: vi.fn(() => 'session-token'),
}));

import * as userRepo from '../src/db/repositories/userRepo';
import { loginWithGoogle } from '../src/services/googleAuthService';

const user = {
  id: 'user-1',
  email: 'admin@example.test',
  fullName: 'Admin',
  role: 'admin' as const,
  active: true,
  organizationId: 'org-1',
  organizationName: 'Org',
  isPlatformAdmin: false,
  subscriptionStatus: 'active',
  createdAt: 'now',
};

afterEach(() => vi.clearAllMocks());

describe('connexion Google + MFA', () => {
  it('n’émet aucune session si la MFA est active et renvoie le même challenge que le login mot de passe', async () => {
    vi.mocked(userRepo.findUserByGoogleId).mockResolvedValue(user);
    vi.mocked(userRepo.getUserMfa).mockResolvedValue({
      enabled: true,
      secret: 'encrypted',
      pendingSecret: null,
    });
    await expect(loginWithGoogle('credential')).resolves.toEqual({
      mfaRequired: true,
      challenge: 'mfa-challenge',
    });
  });

  it('restreint un admin Google sans MFA à l’enrôlement obligatoire', async () => {
    vi.mocked(userRepo.findUserByGoogleId).mockResolvedValue(user);
    vi.mocked(userRepo.getUserMfa).mockResolvedValue({
      enabled: false,
      secret: null,
      pendingSecret: null,
    });
    await expect(loginWithGoogle('credential')).resolves.toMatchObject({
      token: 'session-token',
      mfaSetupRequired: true,
    });
  });
});
