import { AppError } from '../http/AppError';
import { withTransaction } from '../db/pool';
import {
  countUsersInOrg,
  deleteUserById,
  findReassignTargetInOrg,
  findUserByEmail,
  findUserById,
} from '../db/repositories/userRepo';
import { reassignOwnedEvents } from '../db/repositories/eventRepo';
import { findOrganizationById } from '../db/repositories/organizationRepo';

/**
 * Supprime DÉFINITIVEMENT une organisation et toutes ses données (comptes, événements,
 * journalistes, demandes…). Réservé au super-admin. Interdit de supprimer sa propre organisation.
 */
export async function deleteOrganization(organizationId: string, actingUserId: string): Promise<void> {
  const acting = await findUserById(actingUserId);
  if (acting && acting.organizationId === organizationId) {
    throw AppError.forbidden('Vous ne pouvez pas supprimer votre propre organisation.');
  }
  const org = await findOrganizationById(organizationId);
  if (!org) throw AppError.notFound('Organisation introuvable.');

  await withTransaction(async (db) => {
    // Les événements cascadent journalistes/demandes/médias/etc. ; on les retire avant les comptes
    // (events.owner_user_id est en RESTRICT). Les invitations cascadent avec l'organisation.
    await db.query('DELETE FROM events WHERE organization_id = $1', [organizationId]);
    await db.query('DELETE FROM users WHERE organization_id = $1', [organizationId]);
    await db.query('DELETE FROM organizations WHERE id = $1', [organizationId]);
  });
}

/**
 * Supprime un compte par email (super-admin). Si c'est le seul compte de son organisation,
 * supprime l'organisation entière ; sinon réattribue ses événements à un autre membre puis
 * supprime le compte. Libère l'email pour une nouvelle inscription.
 */
export async function deleteAccountByEmail(email: string, actingUserId: string): Promise<{ deletedOrg: boolean }> {
  const target = await findUserByEmail(email.toLowerCase());
  if (!target) throw AppError.notFound('Aucun compte avec cet email.');
  if (target.id === actingUserId) {
    throw AppError.badRequest('Vous ne pouvez pas supprimer votre propre compte ici.');
  }

  const count = await countUsersInOrg(target.organizationId);
  if (count <= 1) {
    await deleteOrganization(target.organizationId, actingUserId);
    return { deletedOrg: true };
  }

  const heir = await findReassignTargetInOrg(target.organizationId, target.id);
  await withTransaction(async (db) => {
    if (heir) {
      await reassignOwnedEvents(target.id, heir, db);
    } else {
      // Aucun héritier actif : on supprime aussi les événements dont ce compte est propriétaire.
      await db.query('DELETE FROM events WHERE owner_user_id = $1', [target.id]);
    }
    await deleteUserById(target.id, db);
  });
  return { deletedOrg: false };
}
