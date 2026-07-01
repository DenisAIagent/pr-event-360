import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/db/repositories/userRepo', () => ({
  findUserById: vi.fn(),
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  listUsers: vi.fn(),
  updateUserRole: vi.fn(),
  setUserActive: vi.fn(),
  countActiveAdminsInOrg: vi.fn(),
}));
vi.mock('../src/db/repositories/eventRepo', () => ({
  addEventMember: vi.fn(),
  listEventIdsForUser: vi.fn(),
  removeAllMembershipsForUser: vi.fn(),
}));
vi.mock('../src/db/repositories/invitationRepo', () => ({
  findValidInvitationByHash: vi.fn(),
  markInvitationAccepted: vi.fn(),
  listPendingInvitations: vi.fn(),
}));
// withTransaction exécute le callback avec un faux client.
vi.mock('../src/db/pool', () => ({
  withTransaction: (fn: (db: unknown) => unknown) => fn({}),
  pool: {},
}));

import * as userRepo from '../src/db/repositories/userRepo';
import * as eventRepo from '../src/db/repositories/eventRepo';
import * as invitationRepo from '../src/db/repositories/invitationRepo';
import { changeUserActive, changeUserRole } from '../src/services/teamService';
import { acceptInvitation } from '../src/services/invitationService';
import { hashResetToken } from '../src/lib/token';
import { AppError } from '../src/http/AppError';
import argon2 from 'argon2';

const admin = { id: 'a1', email: 'a@x.fr', fullName: 'Admin', role: 'admin' as const, active: true, organizationId: 'org1', createdAt: 'now' };

afterEach(() => vi.clearAllMocks());

describe('teamService — protection du dernier admin', () => {
  it('refuse de rétrograder le dernier admin actif', async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue(admin);
    vi.mocked(userRepo.countActiveAdminsInOrg).mockResolvedValue(1);
    await expect(changeUserRole('org1', 'a1', 'attache')).rejects.toBeInstanceOf(AppError);
    expect(userRepo.updateUserRole).not.toHaveBeenCalled();
  });

  it('refuse de désactiver le dernier admin actif', async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue(admin);
    vi.mocked(userRepo.countActiveAdminsInOrg).mockResolvedValue(1);
    await expect(changeUserActive('org1', 'a1', false)).rejects.toBeInstanceOf(AppError);
    expect(userRepo.setUserActive).not.toHaveBeenCalled();
  });

  it('autorise la rétrogradation s’il reste d’autres admins', async () => {
    vi.mocked(userRepo.findUserById).mockResolvedValue(admin);
    vi.mocked(userRepo.countActiveAdminsInOrg).mockResolvedValue(2);
    vi.mocked(userRepo.updateUserRole).mockResolvedValue({ ...admin, role: 'attache' });
    const res = await changeUserRole('org1', 'a1', 'attache');
    expect(res.role).toBe('attache');
  });
});

describe('invitationService — acceptation', () => {
  it('crée le compte, l’assigne aux événements et consomme l’invitation', async () => {
    vi.mocked(invitationRepo.findValidInvitationByHash).mockResolvedValue({
      id: 'inv1',
      email: 'new@press.fr',
      role: 'assistant',
      eventIds: ['e1', 'e2'],
      invitedBy: 'a1',
      expiresAt: 'later',
      acceptedAt: null,
      createdAt: 'now',
    });
    vi.mocked(userRepo.findUserByEmail).mockResolvedValue(null);
    vi.mocked(userRepo.createUser).mockResolvedValue({
      id: 'u9', email: 'new@press.fr', fullName: 'Nouveau', role: 'assistant', active: true, createdAt: 'now',
    });

    await acceptInvitation('jeton-brut', 'Nouveau', 'motdepasse12');

    expect(invitationRepo.findValidInvitationByHash).toHaveBeenCalledWith(
      hashResetToken('jeton-brut'),
      expect.anything(),
    );
    const createArg = vi.mocked(userRepo.createUser).mock.calls[0]![0];
    expect(createArg.email).toBe('new@press.fr');
    expect(createArg.role).toBe('assistant');
    await expect(argon2.verify(createArg.passwordHash, 'motdepasse12')).resolves.toBe(true);
    expect(eventRepo.addEventMember).toHaveBeenCalledTimes(2);
    expect(invitationRepo.markInvitationAccepted).toHaveBeenCalledWith('inv1', expect.anything());
  });

  it('rejette un jeton d’invitation invalide', async () => {
    vi.mocked(invitationRepo.findValidInvitationByHash).mockResolvedValue(null);
    await expect(acceptInvitation('mauvais', 'X', 'motdepasse12')).rejects.toBeInstanceOf(AppError);
    expect(userRepo.createUser).not.toHaveBeenCalled();
  });
});
