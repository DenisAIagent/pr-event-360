import { test, expect } from '@playwright/test';
import { apiLogin, uiLogin } from './helpers';

test('connexion admin → arrivée sur le tableau de bord', async ({ page, request }) => {
  // Enrôle la MFA via l'API si le compte y est obligé (admin/super-admin) : la
  // connexion UI passe alors par l'étape code, gérée par uiLogin.
  await apiLogin(request);
  await uiLogin(page);
  await expect(page.getByRole('heading', { name: /Vos événements/i })).toBeVisible();
});
