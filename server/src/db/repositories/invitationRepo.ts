import { pool } from '../pool';
import type { Queryable } from '../types';
import type { UserRole } from '@pr-event-360/core';

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  eventIds: string[];
  invitedBy: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  email: string;
  role: UserRole;
  event_ids: string[] | string;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

/** node-pg renvoie parfois les uuid[] sous forme de littéral "{a,b}". */
function parseUuidArray(value: string[] | string): string[] {
  if (Array.isArray(value)) return value;
  return value
    .replace(/^\{|\}$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const map = (r: Row): Invitation => ({
  id: r.id,
  email: r.email,
  role: r.role,
  eventIds: parseUuidArray(r.event_ids),
  invitedBy: r.invited_by,
  expiresAt: r.expires_at,
  acceptedAt: r.accepted_at,
  createdAt: r.created_at,
});

export async function createInvitation(
  input: {
    email: string;
    role: UserRole;
    eventIds: string[];
    tokenHash: string;
    invitedBy: string | null;
    expiresAt: Date;
  },
  db: Queryable = pool,
): Promise<Invitation> {
  const { rows } = await db.query<Row>(
    `INSERT INTO invitations (email, role, event_ids, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3::uuid[], $4, $5, $6)
     RETURNING id, email, role, event_ids, invited_by, expires_at, accepted_at, created_at`,
    [input.email, input.role, input.eventIds, input.tokenHash, input.invitedBy, input.expiresAt],
  );
  return map(rows[0]!);
}

/** Invitation encore valide pour ce hash : non acceptée et non expirée. */
export async function findValidInvitationByHash(
  tokenHash: string,
  db: Queryable = pool,
): Promise<Invitation | null> {
  const { rows } = await db.query<Row>(
    `SELECT id, email, role, event_ids, invited_by, expires_at, accepted_at, created_at
     FROM invitations
     WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function markInvitationAccepted(id: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE invitations SET accepted_at = now() WHERE id = $1', [id]);
}

/** Invitations en attente (non acceptées, non expirées) pour l'écran d'équipe. */
export async function listPendingInvitations(db: Queryable = pool): Promise<Invitation[]> {
  const { rows } = await db.query<Row>(
    `SELECT id, email, role, event_ids, invited_by, expires_at, accepted_at, created_at
     FROM invitations
     WHERE accepted_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC`,
  );
  return rows.map(map);
}

export async function deleteInvitation(id: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM invitations WHERE id = $1', [id]);
}

/** Supprime les invitations en attente pour un email (avant d'en recréer une). */
export async function deletePendingInvitationsForEmail(
  email: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('DELETE FROM invitations WHERE email = $1 AND accepted_at IS NULL', [email]);
}
