import { pool } from '../pool';
import type { Queryable } from '../types';
import type { User } from '../../domain';
import type { UserRole } from '@pr-event-360/core';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}
interface UserWithHashRow extends UserRow {
  password_hash: string;
}

const COLS = 'id, email, full_name, role, active, created_at';

const map = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  role: r.role,
  active: r.active,
  createdAt: r.created_at,
});

export async function createUser(
  input: { email: string; passwordHash: string; fullName: string; role?: UserRole },
  db: Queryable = pool,
): Promise<User> {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, COALESCE($4::user_role, 'attache'))
     RETURNING ${COLS}`,
    [input.email, input.passwordHash, input.fullName, input.role ?? null],
  );
  return map(rows[0]!);
}

export async function findUserByEmailWithHash(
  email: string,
  db: Queryable = pool,
): Promise<{ user: User; passwordHash: string } | null> {
  const { rows } = await db.query<UserWithHashRow>(
    `SELECT ${COLS}, password_hash FROM users WHERE email = $1`,
    [email],
  );
  const r = rows[0];
  if (!r) return null;
  return { user: map(r), passwordHash: r.password_hash };
}

export async function findUserByEmail(email: string, db: Queryable = pool): Promise<User | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${COLS} FROM users WHERE email = $1`, [email]);
  return rows[0] ? map(rows[0]) : null;
}

export async function findUserById(id: string, db: Queryable = pool): Promise<User | null> {
  const { rows } = await db.query<UserRow>(`SELECT ${COLS} FROM users WHERE id = $1`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

/** Liste tous les comptes (écran d'équipe, réservé à l'admin). */
export async function listUsers(db: Queryable = pool): Promise<User[]> {
  const { rows } = await db.query<UserRow>(`SELECT ${COLS} FROM users ORDER BY created_at ASC`);
  return rows.map(map);
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  db: Queryable = pool,
): Promise<User | null> {
  const { rows } = await db.query<UserRow>(
    `UPDATE users SET role = $2 WHERE id = $1 RETURNING ${COLS}`,
    [userId, role],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function setUserActive(
  userId: string,
  active: boolean,
  db: Queryable = pool,
): Promise<User | null> {
  const { rows } = await db.query<UserRow>(
    `UPDATE users SET active = $2 WHERE id = $1 RETURNING ${COLS}`,
    [userId, active],
  );
  return rows[0] ? map(rows[0]) : null;
}

export async function updatePasswordHash(
  userId: string,
  passwordHash: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
}

export async function countUsers(db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: string }>('SELECT count(*)::int AS count FROM users');
  return Number(rows[0]!.count);
}

/** Nombre d'administrateurs actifs (pour empêcher de supprimer le dernier admin). */
export async function countActiveAdmins(db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    "SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND active = true",
  );
  return Number(rows[0]!.count);
}

// ── Double authentification (TOTP) ──────────────────────────────────
/** État MFA d'un utilisateur : activé + secret chiffré (ou null). */
export async function getUserMfa(
  userId: string,
  db: Queryable = pool,
): Promise<{ enabled: boolean; secret: string | null } | null> {
  const { rows } = await db.query<{ mfa_enabled: boolean; mfa_secret: string | null }>(
    'SELECT mfa_enabled, mfa_secret FROM users WHERE id = $1',
    [userId],
  );
  const r = rows[0];
  return r ? { enabled: r.mfa_enabled, secret: r.mfa_secret } : null;
}

/** Enregistre un secret TOTP (chiffré) en attente d'activation (mfa_enabled reste false). */
export async function setUserMfaSecret(userId: string, secretEnc: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET mfa_secret = $2, mfa_enabled = false WHERE id = $1', [userId, secretEnc]);
}

/** Active la double authentification (après vérification d'un premier code). */
export async function enableUserMfa(userId: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);
}

/** Désactive la double authentification et efface le secret. */
export async function clearUserMfa(userId: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET mfa_secret = NULL, mfa_enabled = false WHERE id = $1', [userId]);
}
