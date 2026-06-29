import { pool } from '../pool';
import type { Queryable } from '../types';

export interface OrgInvite {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
}

interface Row {
  id: string;
  email: string;
  expires_at: string;
  accepted_at: string | null;
}

const map = (r: Row): OrgInvite => ({
  id: r.id,
  email: r.email,
  expiresAt: r.expires_at,
  acceptedAt: r.accepted_at,
});

export async function deleteOrgInvitesForEmail(email: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM org_invites WHERE email = $1 AND accepted_at IS NULL', [email]);
}

export async function createOrgInvite(
  input: { email: string; tokenHash: string; invitedBy: string; expiresAt: Date },
  db: Queryable = pool,
): Promise<OrgInvite> {
  const { rows } = await db.query<Row>(
    `INSERT INTO org_invites (email, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, expires_at, accepted_at`,
    [input.email, input.tokenHash, input.invitedBy, input.expiresAt],
  );
  return map(rows[0]!);
}

export async function findValidOrgInviteByHash(tokenHash: string, db: Queryable = pool): Promise<OrgInvite | null> {
  const { rows } = await db.query<Row>(
    `SELECT id, email, expires_at, accepted_at FROM org_invites
     WHERE token_hash = $1 AND accepted_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function markOrgInviteAccepted(id: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE org_invites SET accepted_at = now() WHERE id = $1', [id]);
}
