import { pool } from '../pool';
import type { Queryable } from '../types';

export interface PendingSignup {
  id: string;
  email: string;
  orgName: string;
  fullName: string;
  passwordHash: string | null;
  googleId: string | null;
  authProvider: 'password' | 'google';
  stripeSessionId: string | null;
  expiresAt: string;
}

interface Row {
  id: string;
  email: string;
  org_name: string;
  full_name: string;
  password_hash: string | null;
  google_id: string | null;
  auth_provider: 'password' | 'google';
  stripe_session_id: string | null;
  expires_at: string;
}

const COLS = 'id, email, org_name, full_name, password_hash, google_id, auth_provider, stripe_session_id, expires_at';

const map = (r: Row): PendingSignup => ({
  id: r.id,
  email: r.email,
  orgName: r.org_name,
  fullName: r.full_name,
  passwordHash: r.password_hash,
  googleId: r.google_id,
  authProvider: r.auth_provider,
  stripeSessionId: r.stripe_session_id,
  expiresAt: r.expires_at,
});

const TTL_MS = 60 * 60 * 1000; // 1 h pour finaliser le paiement

export async function createPendingSignup(
  input: {
    email: string;
    orgName: string;
    fullName: string;
    passwordHash?: string | null;
    googleId?: string | null;
    authProvider: 'password' | 'google';
  },
  db: Queryable = pool,
): Promise<PendingSignup> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  // Une seule intention active par email à la fois.
  await db.query('DELETE FROM pending_signups WHERE email = $1', [input.email]);
  const { rows } = await db.query<Row>(
    `INSERT INTO pending_signups (email, org_name, full_name, password_hash, google_id, auth_provider, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.email,
      input.orgName,
      input.fullName,
      input.passwordHash ?? null,
      input.googleId ?? null,
      input.authProvider,
      expiresAt,
    ],
  );
  return map(rows[0]!);
}

export async function setPendingSignupSession(id: string, sessionId: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE pending_signups SET stripe_session_id = $2 WHERE id = $1', [id, sessionId]);
}

export async function findPendingSignupById(id: string, db: Queryable = pool): Promise<PendingSignup | null> {
  const { rows } = await db.query<Row>(`SELECT ${COLS} FROM pending_signups WHERE id = $1`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

export async function deletePendingSignup(id: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM pending_signups WHERE id = $1', [id]);
}
