import type { Pool, PoolClient } from 'pg';

/** Tout objet capable d'exécuter une requête (pool ou client de transaction). */
export type Queryable = Pool | PoolClient;

/**
 * Client de transaction OUVERTE (celui fourni par `withTransaction`).
 *
 * À exiger — plutôt que `Queryable` — dans toute opération dont la correction
 * repose sur un verrou (`SELECT … FOR UPDATE`) ou sur l'atomicité de plusieurs
 * écritures : hors transaction, PostgreSQL relâche le verrou dès la fin de
 * l'instruction et la protection contre les accès concurrents disparaît
 * silencieusement. Le typage rend l'oubli impossible à la compilation.
 */
export type TransactionClient = PoolClient;
