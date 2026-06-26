import { pool } from '../pool';
import type { Queryable } from '../types';

export interface SecretRow {
  key: string;
  valueEncrypted: string;
  updatedAt: string;
}

/** Tous les secrets stockés (valeurs encore chiffrées — déchiffrées par le service). */
export async function getAllSecrets(db: Queryable = pool): Promise<SecretRow[]> {
  const { rows } = await db.query<{ key: string; value_encrypted: string; updated_at: string }>(
    'SELECT key, value_encrypted, updated_at FROM app_secrets',
  );
  return rows.map((r) => ({ key: r.key, valueEncrypted: r.value_encrypted, updatedAt: r.updated_at }));
}

export async function upsertSecret(
  key: string,
  valueEncrypted: string,
  updatedBy: string | null,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO app_secrets (key, value_encrypted, updated_by, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO UPDATE
       SET value_encrypted = EXCLUDED.value_encrypted,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
    [key, valueEncrypted, updatedBy],
  );
}

export async function deleteSecret(key: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM app_secrets WHERE key = $1', [key]);
}
