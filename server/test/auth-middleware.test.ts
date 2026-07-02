import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../src/db/repositories/userRepo', () => ({
  findUserAuthState: vi.fn(),
}));

import { requireAuth } from '../src/middleware/auth';
import { signToken } from '../src/lib/jwt';
import { AppError } from '../src/http/AppError';
import * as userRepo from '../src/db/repositories/userRepo';

const currentUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@event.test',
  fullName: 'Admin',
  role: 'admin' as const,
  active: true,
  organizationId: '22222222-2222-4222-8222-222222222222',
  organizationName: 'Org',
  isPlatformAdmin: false,
  subscriptionStatus: 'active',
  createdAt: 'now',
  passwordChangedAt: null,
};

function reqWithBearer(token: string): Request {
  return {
    method: 'GET',
    headers: { authorization: `Bearer ${token}` },
    cookies: {},
    get: vi.fn(),
  } as unknown as Request;
}

async function run(req: Request) {
  const next = vi.fn();
  await requireAuth(req, {} as Response, next);
  return next;
}

afterEach(() => vi.clearAllMocks());

describe('requireAuth', () => {
  it('utilise le rôle courant en base plutôt que le rôle figé dans le JWT', async () => {
    vi.mocked(userRepo.findUserAuthState).mockResolvedValue({ ...currentUser, role: 'assistant' });
    const token = signToken({
      sub: currentUser.id,
      email: currentUser.email,
      role: 'admin',
      organizationId: currentUser.organizationId,
      isPlatformAdmin: false,
    });
    const req = reqWithBearer(token);

    const next = await run(req);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.role).toBe('assistant');
  });

  it('retire immédiatement les privilèges super-admin révoqués en base', async () => {
    vi.mocked(userRepo.findUserAuthState).mockResolvedValue(currentUser);
    const token = signToken({
      sub: currentUser.id,
      email: currentUser.email,
      role: 'admin',
      organizationId: '33333333-3333-4333-8333-333333333333',
      isPlatformAdmin: true,
    });
    const req = reqWithBearer(token);

    const next = await run(req);

    expect(next).toHaveBeenCalledWith();
    expect(req.user?.isPlatformAdmin).toBe(false);
    expect(req.user?.organizationId).toBe(currentUser.organizationId);
  });

  it('refuse une session existante si le compte a été désactivé', async () => {
    vi.mocked(userRepo.findUserAuthState).mockResolvedValue({ ...currentUser, active: false });
    const token = signToken({
      sub: currentUser.id,
      email: currentUser.email,
      role: 'admin',
      organizationId: currentUser.organizationId,
      isPlatformAdmin: false,
    });

    const next = await run(reqWithBearer(token));
    const err = next.mock.calls[0]?.[0];

    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(401);
  });
});
