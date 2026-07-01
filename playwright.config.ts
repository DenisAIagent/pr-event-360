import { defineConfig, devices } from '@playwright/test';

/**
 * E2E des parcours critiques. Suppose un serveur applicatif joignable :
 *  - en local : les serveurs de dev (vite 5173 qui proxifie /api → 4000). `npm run e2e`.
 *  - en CI : le serveur de prod build servant l'API + le SPA sur 4000 (voir ci.yml).
 * L'URL de base et les identifiants admin sont paramétrables par variables d'environnement.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
