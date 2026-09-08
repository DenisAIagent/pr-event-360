import { test, expect } from '@playwright/test';
import { apiLogin, attachApiSession, api } from './helpers';

/**
 * Régression sécurité X-01 : XSS stockée dans le badge admin.
 *
 * Le nom du journaliste vient du formulaire public d'accréditation (validé en
 * longueur seulement). Avant correctif, il était injecté brut dans un
 * `document.write`, dans une fenêtre `about:blank` qui hérite de l'origine de
 * l'app — donc exécuté. On soumet ici une charge utile qui, si elle s'exécutait,
 * positionnerait `window.__xss` dans la fenêtre du badge ; le test échoue tant que
 * le rendu n'échappe pas la valeur (RED avant correctif, GREEN après).
 */
test('le badge n’exécute pas une charge XSS injectée via le nom (X-01)', async ({ page, request }) => {
  const auth = await apiLogin(request);
  const t = auth.csrf;
  const stamp = Date.now();
  const email = `xss.e2e.${stamp}@test.local`;
  // Charge sans guillemets : en cas d'injection brute, l'`onerror` de l'<img> à src
  // cassé s'exécute et pose le témoin. Échappée, elle reste du texte inerte.
  const payloadLast = `X${stamp}<img src=x onerror=window.__xss=1>`;

  const event = (await api(request, t, 'post', '/admin/events', {
    name: `XSS ${stamp}`,
    eventType: 'music',
    location: 'Test',
    startDate: '2027-08-01',
    endDate: '2027-08-03',
    languages: ['fr'],
  })) as { id: string };

  await request.post(`/api/public/events/${event.id}/accreditations`, {
    data: {
      firstName: 'Payload',
      lastName: payloadLast,
      email,
      lang: 'fr',
      accreditationType: 'presse',
      publishDelayDays: 8,
      commitPublish: false,
      consent: true,
    },
  });

  const list = (await api(request, t, 'get', `/admin/events/${event.id}/accreditations`)) as
    | Array<{ id: string; email: string }>
    | { journalists: Array<{ id: string; email: string }> };
  const arr = Array.isArray(list) ? list : list.journalists;
  const journalist = arr.find((j) => j.email === email)!;
  await api(request, t, 'post', `/admin/events/${event.id}/accreditations/${journalist.id}/process`, {
    action: 'accept',
  });

  await attachApiSession(page, auth, request);
  // Toute boîte de dialogue (un éventuel alert d'exploitation, ou window.print) est
  // rejetée pour ne pas bloquer le test.
  page.on('dialog', (d) => void d.dismiss());
  await page.goto(`/admin/events/${event.id}/accreditations`);
  await expect(page.getByRole('heading', { name: `XSS ${stamp}` })).toBeVisible();

  const badgeBtn = page.getByRole('button', { name: /Badge/ }).first();
  await expect(badgeBtn).toBeVisible();
  const [popup] = await Promise.all([page.waitForEvent('popup'), badgeBtn.click()]);
  popup.on('dialog', (d) => void d.dismiss());
  await popup.waitForLoadState('domcontentloaded');
  // Laisse le temps à un éventuel onerror de se déclencher avant de conclure.
  await popup.waitForTimeout(300);

  // 1) Aucune exécution de script : le témoin n'est jamais posé.
  expect(await popup.evaluate(() => (window as { __xss?: number }).__xss ?? null)).toBeNull();
  // 2) Aucune balise <script> dans le document du badge.
  expect(await popup.locator('script').count()).toBe(0);
  // 3) Aucune <img> hostile : seule subsiste l'image data: du QR.
  expect(await popup.locator('img:not([src^="data:"])').count()).toBe(0);
  expect(await popup.locator('img[src^="data:"]').count()).toBe(1);
  // 4) La charge ressort comme texte échappé, donc inerte.
  await expect(popup.locator('body')).toContainText('onerror=window.__xss=1');

  await popup.close().catch(() => {});
  await api(request, t, 'delete', `/admin/events/${event.id}`).catch(() => {});
});
