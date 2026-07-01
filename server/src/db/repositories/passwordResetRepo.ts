import { pool } from '../pool';
import type { Queryable } from '../types';

export interface PasswordResetToken {
  id: string;
  userId: string;
  expiresAt: string;
}

interface Row {
  id: string;
  user_id: string;
  expires_at: string;
}

/**
 * Invalide tous les jetons en attente d'un utilisateur (on n'autorise qu'un seul
 * lien de réinitialisation actif à la fois). Appelé avant d'en émettre un nouveau.
 */
export async function deletePendingForUser(userId: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
}

export async function createResetToken(
  input: { userId: string; tokenHash: string; expiresAt: Date },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [input.userId, input.tokenHash, input.expiresAt],
  );
}

/**
 * Retourne le jeton correspondant au hash s'il est encore VALIDE : non utilisé et
 * non expiré. Renvoie null sinon (jeton inconnu, déjà consommé ou périmé).
 */
export async function findValidByHash(
  tokenHash: string,
  db: Queryable = pool,
): Promise<PasswordResetToken | null> {
  const { rows } = await db.query<Row>(
    `SELECT id, user_id, expires_at
     FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, userId: r.user_id, expiresAt: r.expires_at };
}

export async function markUsed(id: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [id]);
}

/**
 * Consomme **atomiquement** un jeton : le marque utilisé et renvoie son `userId` uniquement
 * s'il était encore valide (non utilisé, non expiré) au moment de l'UPDATE. Empêche la
 * consommation concurrente du même jeton (le second appel ne touche aucune ligne → null).
 */
export async function consumeResetToken(
  tokenHash: string,
  db: Queryable = pool,
): Promise<{ userId: string } | null> {
  const { rows } = await db.query<{ user_id: string }>(
    `UPDATE password_reset_tokens
        SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [tokenHash],
  );
  const r = rows[0];
  return r ? { userId: r.user_id } : null;
}
