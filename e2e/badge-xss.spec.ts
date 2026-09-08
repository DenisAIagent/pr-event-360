import { test, expect } from '@playwright/test';
import { apiLogin, attachApiSession, api } from './helpers';

/**
 * Régression sécurité X-01 : XSS stockée dans le badge admin.
 *
 * Le nom du journaliste vient du formulaire public d'accréditation (validé en
 * longueur seulement). Avant correctif il était injecté brut dans un
 * `document.write`, dans une fenêtre `about:blank` qui hérite de l'origine de
 * l'app — donc exécuté.
 *
 * On teste le vrai chemin (clic « Badge » → fetch des données réelles → rendu),
 * mais on capture le HTML écrit plutôt que de dépendre de l'ouverture effective
 * d'un popup après un `await` (bloquée de façon non déterministe en headless).
 * Le document écrit doit être échappé et ne contenir aucun `<script>`.
 */
test('le badge n’injecte pas de HTML actif issu du nom (X-01)', async ({ page, request }) => {
  // La connexion MFA peut devoir attendre la fenêtre TOTP suivante (anti-rejeu) ;
  // ce test enchaîne ensuite un chargement du back-office et une navigation. On lui
  // donne une marge large pour que cette variance n'entraîne pas de faux échec.
  test.setTimeout(180_000);
  const auth = await apiLogin(request);
  const t = auth.csrf;
  const stamp = Date.now();
  const email = `xss.e2e.${stamp}@test.local`;
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
  // Intercepte l'ouverture de la fenêtre du badge pour capturer le HTML écrit,
  // sans dépendre du blocage de popup en headless. Le `document` factice couvre
  // ce dont l'app se sert (open/write/close, images, print).
  await page.addInitScript(() => {
    (window as unknown as { __badgeHtml: string[] }).__badgeHtml = [];
    window.open = () =>
      ({
        closed: false,
        focus() {},
        print() {},
        document: {
          open() {},
          close() {},
          write(html: string) {
            (window as unknown as { __badgeHtml: string[] }).__badgeHtml.push(html);
          },
          images: [] as unknown[],
        },
      }) as unknown as Window;
  });
  await page.goto(`/admin/events/${event.id}/accreditations`);
  await expect(page.getByRole('heading', { name: `XSS ${stamp}` })).toBeVisible();

  const badgeBtn = page.locator('button[title="Badge QR check-in"]').first();
  await expect(badgeBtn).toBeVisible();
  await badgeBtn.click();

  // Le HTML du badge finit par être écrit (après le fetch des données réelles).
  await expect
    .poll(async () => page.evaluate(() => (window as unknown as { __badgeHtml: string[] }).__badgeHtml.length), {
      timeout: 15_000,
    })
    .toBeGreaterThan(0);
  const html = (await page.evaluate(
    () => (window as unknown as { __badgeHtml: string[] }).__badgeHtml[0],
  )) as string;

  // 1) Aucune balise <script> dans le document du badge.
  expect(html).not.toMatch(/<script/i);
  // 2) Le vecteur n'apparaît jamais comme balise active…
  expect(html).not.toContain('<img src=x onerror=');
  // 3) …mais bien comme texte échappé (donc inerte).
  expect(html).toContain('&lt;img src=x onerror=window.__xss=1&gt;');
  // 4) Le document verrouille l'exécution par une CSP stricte.
  expect(html).toContain("default-src 'none'");
  // 5) Le QR réel (image data:) est bien présent.
  expect(html).toMatch(/<img src="data:image\/[^"]+"/);

  await api(request, t, 'delete', `/admin/events/${event.id}`).catch(() => {});
});
