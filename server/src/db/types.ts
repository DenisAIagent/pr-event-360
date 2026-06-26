import type { Pool, PoolClient } from 'pg';

/** Tout objet capable d'exécuter une requête (pool ou client de transaction). */
export type Queryable = Pool | PoolClient;
