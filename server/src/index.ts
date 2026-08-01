import { createApp } from './app';
import { loadEnv } from './config/env';
import { initSentry } from './lib/sentry';
import { pool } from './db/pool';
import { initRateLimitStore } from './lib/rateLimitStore';
import { startScheduler } from './scheduler';

async function main(): Promise<void> {
  const env = loadEnv(); // fail-fast si une variable requise manque
  initSentry(); // dormant sans SENTRY_DSN

  // Production multi-instance : sans Redis partagé, le rate-limit anti-bruteforce
  // est multiplié par le nombre de replicas. REQUIRE_REDIS=true force l'échec au boot.
  if (env.REQUIRE_REDIS && !env.REDIS_URL) {
    throw new Error(
      'REQUIRE_REDIS=true mais REDIS_URL est absent — configurez Redis pour des compteurs de débit partagés.',
    );
  }
  if (env.NODE_ENV === 'production' && !env.REDIS_URL) {
    console.error(
      '[security] REDIS_URL absent en production : les rate-limits sont locaux à chaque instance (bruteforce ×N). Définissez REDIS_URL ou REQUIRE_REDIS=true.',
    );
  }
  if (env.NODE_ENV === 'production' && !env.METRICS_TOKEN) {
    console.warn(
      '[security] METRICS_TOKEN absent : /api/metrics renvoie 404. Définissez un secret pour autoriser le scrape Prometheus.',
    );
  }

  // Vérifie la connexion DB au démarrage.
  await pool.query('SELECT 1');

  // Compteurs de rate-limit partagés entre instances (dormant sans REDIS_URL).
  await initRateLimitStore();

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
