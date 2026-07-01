import { test, expect } from '@playwright/test';

test.describe('Smoke — pages publiques', () => {
  test('la landing se charge avec son titre et le CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /Créer votre espace/i }).first()).toBeVisible();
  });

  test('la page de connexion back-office affiche le formulaire', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Se connecter/i })).toBeVisible();
  });
});
