import { createApp } from './app';
import { loadEnv } from './config/env';
import { pool } from './db/pool';
import { startScheduler } from './scheduler';

async function main(): Promise<void> {
  const env = loadEnv(); // fail-fast si une variable requise manque

  // Vérifie la connexion DB au démarrage.
  await pool.query('SELECT 1');

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`PR Event 360 API — http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  startScheduler();
}

main().catch((err) => {
  console.error('Échec du démarrage du serveur :', err);
  process.exit(1);
});
