import { Pool, type PoolClient } from 'pg';
import { loadEnv } from '../config/env';

const env = loadEnv();

/** Pool de connexions partagé (connection pooling). */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

/**
 * Exécute une fonction dans une TRANSACTION (BEGIN/COMMIT, ROLLBACK sur erreur).
 * Utilisé là où plusieurs écritures doivent être atomiques (ex. acceptation
 * d'accréditation : statut + token + notification).
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
