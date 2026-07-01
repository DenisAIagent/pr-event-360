import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

test('connexion admin → arrivée sur le tableau de bord', async ({ page }) => {
  await page.goto('/admin/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();

  await page.waitForURL('**/admin');
  await expect(page.getByRole('heading', { name: /Vos événements/i })).toBeVisible();
});
