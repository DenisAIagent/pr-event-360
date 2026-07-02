import { Client } from 'pg';

/**
 * Attend que PostgreSQL soit JOIGNABLE avant de lancer les migrations.
 * Sur Railway, le réseau privé (`*.railway.internal`) met quelques secondes à être
 * disponible au démarrage du conteneur : sans cette attente, `migrate:deploy` s'exécute
 * trop tôt et échoue en `getaddrinfo ENOTFOUND`. On retente jusqu'à ~60 s.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[wait-for-db] DATABASE_URL manquant');
  process.exit(1);
}

const MAX_ATTEMPTS = 30;
const DELAY_MS = 2000;

async function reachable(): Promise<boolean> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 4000 });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (await reachable()) {
      console.log(`[wait-for-db] base joignable (tentative ${attempt}) ✓`);
      process.exit(0);
    }
    console.log(
      `[wait-for-db] base pas encore prête (${attempt}/${MAX_ATTEMPTS}) — réseau privé en cours d'init, nouvelle tentative dans ${DELAY_MS / 1000}s…`,
    );
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.error(`[wait-for-db] échec : base injoignable après ${MAX_ATTEMPTS} tentatives`);
  process.exit(1);
}

void main();
