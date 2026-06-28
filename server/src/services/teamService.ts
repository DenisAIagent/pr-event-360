import type { UserRole } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { withTransaction } from '../db/pool';
import {
  countActiveAdminsInOrg,
  findUserById,
  listUsersByOrg,
  setUserActive,
  updateUserRole,
} from '../db/repositories/userRepo';
import {
  addEventMember,
  findEventById,
  listEventIdsForUser,
  removeAllMembershipsForUser,
} from '../db/repositories/eventRepo';
import { listPendingInvitationsByOrg, type Invitation } from '../db/repositories/invitationRepo';
import type { User } from '../domain';

export interface TeamMember extends User {
  eventIds: string[];
}

/** Vue d'équipe d'UNE organisation : comptes (avec events assignés) + invitations en attente. */
export async function getTeam(organizationId: string): Promise<{ members: TeamMember[]; invitations: Invitation[] }> {
  const [users, invitations] = await Promise.all([
    listUsersByOrg(organizationId),
    listPendingInvitationsByOrg(organizationId),
  ]);
  const members = await Promise.all(
    users.map(async (u) => ({ ...u, eventIds: await listEventIdsForUser(u.id) })),
  );
  return { members, invitations };
}

/** Charge un utilisateur cible en vérifiant qu'il appartient à l'organisation de l'acteur. */
async function targetInOrg(userId: string, organizationId: string): Promise<User> {
  const target = await findUserById(userId);
  if (!target || target.organizationId !== organizationId) {
    throw AppError.notFound('Utilisateur introuvable');
  }
  return target;
}

/** Change le rôle d'un compte de l'org. Empêche de retirer le dernier admin actif de l'org. */
export async function changeUserRole(organizationId: string, userId: string, role: UserRole): Promise<User> {
  const target = await targetInOrg(userId, organizationId);
  if (target.role === 'admin' && role !== 'admin') {
    await assertNotLastAdmin(organizationId);
  }
  const updated = await updateUserRole(userId, role);
  if (!updated) throw AppError.notFound('Utilisateur introuvable');
  return updated;
}

/** Active/désactive un compte de l'org. Empêche de désactiver le dernier admin actif de l'org. */
export async function changeUserActive(organizationId: string, userId: string, active: boolean): Promise<User> {
  const target = await targetInOrg(userId, organizationId);
  if (target.role === 'admin' && target.active && !active) {
    await assertNotLastAdmin(organizationId);
  }
  const updated = await setUserActive(userId, active);
  if (!updated) throw AppError.notFound('Utilisateur introuvable');
  return updated;
}

/** Remplace les événements assignés à un utilisateur (tous bornés à l'organisation). */
export async function setUserEvents(organizationId: string, userId: string, eventIds: string[]): Promise<string[]> {
  await targetInOrg(userId, organizationId);
  // Garde-fou multi-locataire : chaque événement doit appartenir à l'organisation.
  for (const eventId of eventIds) {
    const ev = await findEventById(eventId);
    if (!ev || ev.organizationId !== organizationId) {
      throw AppError.badRequest('Événement invalide pour cette organisation');
    }
  }
  return withTransaction(async (db) => {
    await removeAllMembershipsForUser(userId, db);
    for (const eventId of eventIds) {
      await addEventMember(eventId, userId, db);
    }
    return listEventIdsForUser(userId, db);
  });
}

async function assertNotLastAdmin(organizationId: string): Promise<void> {
  const admins = await countActiveAdminsInOrg(organizationId);
  if (admins <= 1) {
    throw AppError.badRequest('Impossible : il doit rester au moins un administrateur actif dans l’organisation');
  }
}
