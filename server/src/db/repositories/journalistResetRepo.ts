import { pool } from '../pool';
import type { Queryable } from '../types';

export interface JournalistResetToken {
  id: string;
  journalistId: string;
  expiresAt: string;
}

interface Row {
  id: string;
  journalist_id: string;
  expires_at: string;
}

/** Un seul lien de réinitialisation actif à la fois par journaliste. */
export async function deletePendingForJournalist(journalistId: string, db: Queryable = pool): Promise<void> {
  await db.query(
    'DELETE FROM journalist_password_resets WHERE journalist_id = $1 AND used_at IS NULL',
    [journalistId],
  );
}

export async function createJournalistReset(
  input: { journalistId: string; tokenHash: string; expiresAt: Date },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO journalist_password_resets (journalist_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [input.journalistId, input.tokenHash, input.expiresAt],
  );
}

/** Jeton encore VALIDE (non utilisé, non expiré) correspondant au hash, sinon null. */
export async function findValidJournalistResetByHash(
  tokenHash: string,
  db: Queryable = pool,
): Promise<JournalistResetToken | null> {
  const { rows } = await db.query<Row>(
    `SELECT id, journalist_id, expires_at
     FROM journalist_password_resets
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );
  const r = rows[0];
  if (!r) return null;
  return { id: r.id, journalistId: r.journalist_id, expiresAt: r.expires_at };
}

export async function markJournalistResetUsed(id: string, db: Queryable = pool): Promise<void> {
  await db.query('UPDATE journalist_password_resets SET used_at = now() WHERE id = $1', [id]);
}

/**
 * Consomme **atomiquement** un jeton journaliste : le marque utilisé et renvoie son
 * `journalistId` seulement s'il était encore valide au moment de l'UPDATE (anti double-consommation).
 */
export async function consumeJournalistReset(
  tokenHash: string,
  db: Queryable = pool,
): Promise<{ journalistId: string } | null> {
  const { rows } = await db.query<{ journalist_id: string }>(
    `UPDATE journalist_password_resets
        SET used_at = now()
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
      RETURNING journalist_id`,
    [tokenHash],
  );
  const r = rows[0];
  return r ? { journalistId: r.journalist_id } : null;
}
