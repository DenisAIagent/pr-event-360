import { pool } from '../pool';
import type { Queryable } from '../types';

export interface PendingSignup {
  id: string;
  email: string;
  orgName: string;
  fullName: string;
  googleId: string | null;
  authProvider: 'password' | 'google';
  stripeSessionId: string | null;
  expiresAt: string;
  planCode: string;
}

interface Row {
  id: string;
  email: string;
  org_name: string;
  full_name: string;
  google_id: string | null;
  auth_provider: 'password' | 'google';
  stripe_session_id: string | null;
  expires_at: string;
  plan_code: string;
}

const COLS =
  'id, email, org_name, full_name, google_id, auth_provider, stripe_session_id, expires_at, plan_code';

const map = (r: Row): PendingSignup => ({
  id: r.id,
  email: r.email,
  orgName: r.org_name,
  fullName: r.full_name,
  googleId: r.google_id,
  authProvider: r.auth_provider,
  stripeSessionId: r.stripe_session_id,
  expiresAt: r.expires_at,
  planCode: r.plan_code ?? 'event',
});

const TTL_MS = 60 * 60 * 1000; // 1 h pour finaliser le paiement

export async function createPendingSignup(
  input: {
    email: string;
    orgName: string;
    fullName: string;
    googleId?: string | null;
    authProvider: 'password' | 'google';
    planCode?: string;
  },
  db: Queryable = pool,
): Promise<PendingSignup> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  // Plusieurs checkouts peuvent coexister pour un même email. Une nouvelle
  // tentative ne doit jamais invalider une session Stripe déjà payée/en cours.
  const { rows } = await db.query<Row>(
    `INSERT INTO pending_signups (email, org_name, full_name, google_id, auth_provider, expires_at, plan_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${COLS}`,
    [
      input.email,
      input.orgName,
      input.fullName,
      input.googleId ?? null,
      input.authProvider,
      expiresAt,
      input.planCode ?? 'event',
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
