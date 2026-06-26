import type { UserRole } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { withTransaction } from '../db/pool';
import {
  countActiveAdmins,
  findUserById,
  listUsers,
  setUserActive,
  updateUserRole,
} from '../db/repositories/userRepo';
import {
  addEventMember,
  listEventIdsForUser,
  removeAllMembershipsForUser,
} from '../db/repositories/eventRepo';
import { listPendingInvitations, type Invitation } from '../db/repositories/invitationRepo';
import type { User } from '../domain';

export interface TeamMember extends User {
  eventIds: string[];
}

/** Vue d'équipe : comptes (avec events assignés) + invitations en attente. */
export async function getTeam(): Promise<{ members: TeamMember[]; invitations: Invitation[] }> {
  const [users, invitations] = await Promise.all([listUsers(), listPendingInvitations()]);
  const members = await Promise.all(
    users.map(async (u) => ({ ...u, eventIds: await listEventIdsForUser(u.id) })),
  );
  return { members, invitations };
}

/** Change le rôle d'un compte. Empêche de retirer le dernier admin actif. */
export async function changeUserRole(userId: string, role: UserRole): Promise<User> {
  const target = await findUserById(userId);
  if (!target) throw AppError.notFound('Utilisateur introuvable');

  if (target.role === 'admin' && role !== 'admin') {
    await assertNotLastAdmin();
  }
  const updated = await updateUserRole(userId, role);
  if (!updated) throw AppError.notFound('Utilisateur introuvable');
  return updated;
}

/** Active/désactive un compte. Empêche de désactiver le dernier admin actif. */
export async function changeUserActive(userId: string, active: boolean): Promise<User> {
  const target = await findUserById(userId);
  if (!target) throw AppError.notFound('Utilisateur introuvable');

  if (target.role === 'admin' && target.active && !active) {
    await assertNotLastAdmin();
  }
  const updated = await setUserActive(userId, active);
  if (!updated) throw AppError.notFound('Utilisateur introuvable');
  return updated;
}

/** Remplace l'ensemble des événements assignés à un utilisateur. */
export async function setUserEvents(userId: string, eventIds: string[]): Promise<string[]> {
  const target = await findUserById(userId);
  if (!target) throw AppError.notFound('Utilisateur introuvable');

  return withTransaction(async (db) => {
    await removeAllMembershipsForUser(userId, db);
    for (const eventId of eventIds) {
      await addEventMember(eventId, userId, db);
    }
    return listEventIdsForUser(userId, db);
  });
}

async function assertNotLastAdmin(): Promise<void> {
  const admins = await countActiveAdmins();
  if (admins <= 1) {
    throw AppError.badRequest('Impossible : il doit rester au moins un administrateur actif');
  }
}
