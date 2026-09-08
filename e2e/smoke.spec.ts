import { test, expect } from '@playwright/test';

test.describe('Smoke — pages publiques', () => {
  test('la landing se charge avec son titre et le CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Libellé aligné sur la vente assistée (cf. PRIMARY_CTA_LABEL) : le CTA
    // promet une demande d'accès tant que la facturation en ligne est inactive.
    await expect(page.getByRole('link', { name: /Demander un accès/i }).first()).toBeVisible();
  });

  test('la landing charge sa photo de hero et ne déborde pas sur mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    // La photo est l'élément LCP : elle doit être servie (AVIF, WebP ou JPEG) et décodée.
    const hero = page.locator('.lp-hero-media img');
    await expect(hero).toBeVisible();
    await expect
      .poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
    // Aucun débordement horizontal : la page ne doit jamais défiler latéralement.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // Les ancres de navigation ciblent des sections présentes.
    for (const id of ['demo', 'features', 'pricing']) {
      await expect(page.locator('#' + id)).toHaveCount(1);
    }
  });

  test('la page de connexion back-office affiche le formulaire', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Se connecter/i })).toBeVisible();
  });
});
