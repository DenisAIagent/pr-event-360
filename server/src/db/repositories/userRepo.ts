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
  organization_id: string;
  organization_name: string;
  is_platform_admin: boolean;
  created_at: string;
}
interface UserWithHashRow extends UserRow {
  password_hash: string;
}

// Toutes les lectures joignent l'organisation pour exposer son nom (UI sans requête).
const SELECT_USER = `SELECT u.id, u.email, u.full_name, u.role, u.active,
  u.organization_id, o.name AS organization_name, u.is_platform_admin, u.created_at
  FROM users u JOIN organizations o ON o.id = u.organization_id`;

const map = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  role: r.role,
  active: r.active,
  organizationId: r.organization_id,
  organizationName: r.organization_name,
  isPlatformAdmin: r.is_platform_admin,
  createdAt: r.created_at,
});

export async function createUser(
  input: {
    email: string;
    passwordHash: string;
    fullName: string;
    role?: UserRole;
    organizationId: string;
    isPlatformAdmin?: boolean;
  },
  db: Queryable = pool,
): Promise<User> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name, role, organization_id, is_platform_admin)
     VALUES ($1, $2, $3, COALESCE($4::user_role, 'attache'), $5, $6)
     RETURNING id`,
    [
      input.email,
      input.passwordHash,
      input.fullName,
      input.role ?? null,
      input.organizationId,
      input.isPlatformAdmin ?? false,
    ],
  );
  return (await findUserById(rows[0]!.id, db))!;
}

export async function findUserByEmailWithHash(
  email: string,
  db: Queryable = pool,
): Promise<{ user: User; passwordHash: string } | null> {
  const { rows } = await db.query<UserWithHashRow>(
    `SELECT u.id, u.email, u.full_name, u.role, u.active,
            u.organization_id, o.name AS organization_name, u.is_platform_admin, u.created_at, u.password_hash
     FROM users u JOIN organizations o ON o.id = u.organization_id
     WHERE u.email = $1`,
    [email],
  );
  const r = rows[0];
  if (!r) return null;
  return { user: map(r), passwordHash: r.password_hash };
}

export async function findUserByEmail(email: string, db: Queryable = pool): Promise<User | null> {
  const { rows } = await db.query<UserRow>(`${SELECT_USER} WHERE u.email = $1`, [email]);
  return rows[0] ? map(rows[0]) : null;
}

export async function findUserById(id: string, db: Queryable = pool): Promise<User | null> {
  const { rows } = await db.query<UserRow>(`${SELECT_USER} WHERE u.id = $1`, [id]);
  return rows[0] ? map(rows[0]) : null;
}

/** Comptes d'une organisation (écran d'équipe, scopé à l'org de l'admin). */
export async function listUsersByOrg(organizationId: string, db: Queryable = pool): Promise<User[]> {
  const { rows } = await db.query<UserRow>(
    `${SELECT_USER} WHERE u.organization_id = $1 ORDER BY u.created_at ASC`,
    [organizationId],
  );
  return rows.map(map);
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
  db: Queryable = pool,
): Promise<User | null> {
  await db.query(`UPDATE users SET role = $2 WHERE id = $1`, [userId, role]);
  return findUserById(userId, db);
}

export async function setUserActive(
  userId: string,
  active: boolean,
  db: Queryable = pool,
): Promise<User | null> {
  await db.query(`UPDATE users SET active = $2 WHERE id = $1`, [userId, active]);
  return findUserById(userId, db);
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

/** Administrateurs actifs d'une organisation (pour empêcher de retirer le dernier admin de l'org). */
export async function countActiveAdminsInOrg(organizationId: string, db: Queryable = pool): Promise<number> {
  const { rows } = await db.query<{ count: string }>(
    "SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND active = true AND organization_id = $1",
    [organizationId],
  );
  return Number(rows[0]!.count);
}

// ── Double authentification (TOTP) ──────────────────────────────────
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

export async function setUserMfaSecret(userId: string, secretEnc: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET mfa_secret = $2, mfa_enabled = false WHERE id = $1', [userId, secretEnc]);
}

export async function enableUserMfa(userId: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET mfa_enabled = true WHERE id = $1', [userId]);
}

export async function clearUserMfa(userId: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE users SET mfa_secret = NULL, mfa_enabled = false WHERE id = $1', [userId]);
}
