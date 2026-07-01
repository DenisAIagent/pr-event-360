import { test, expect } from '@playwright/test';
import { apiLogin, injectAuth, api } from './helpers';

/**
 * Parcours critique de bout en bout : création d'événement → accréditation publique →
 * acceptation → soumission d'une demande → traitement (refuser → rouvrir) dans le back-office.
 * Ce test couvre précisément les deux régressions qui avaient atteint la prod :
 *  - la page blanche « /requests » (StatusBadge sans I18nProvider) ;
 *  - le bug « refuser » (une demande refusée réaffichait Accepter/Refuser).
 */
test('accréditation → acceptation → demande → refuser/rouvrir', async ({ page, request }) => {
  const auth = await apiLogin(request);
  const t = auth.token;
  const stamp = Date.now();
  const email = `journaliste.e2e.${stamp}@test.local`;

  // 1) Événement + artiste (fixtures via API).
  const event = (await api(request, t, 'post', '/admin/events', {
    name: `E2E ${stamp}`,
    location: 'Test',
    startDate: '2027-08-01',
    endDate: '2027-08-03',
    languages: ['fr'],
  })) as { id: string };

  const artistRes = (await api(request, t, 'post', `/admin/events/${event.id}/artists`, {
    name: 'Artiste E2E',
    stageId: null,
    itwQuota: 5,
    photoQuota: null,
    videoQuota: null,
    windows: [],
  })) as { artist: { id: string } };
  const artistId = artistRes.artist.id;

  // 2) Accréditation publique (aucune auth).
  await request.post(`/api/public/events/${event.id}/accreditations`, {
    data: {
      firstName: 'Jean',
      lastName: `E2E${stamp}`,
      email,
      lang: 'fr',
      accreditationType: 'presse',
      publishDelayDays: 8,
      commitPublish: false,
      consent: true,
    },
  });

  // 3) Acceptation par l'attaché → génère le jeton d'espace.
  const listBefore = (await api(request, t, 'get', `/admin/events/${event.id}/accreditations`)) as
    | Array<{ id: string; email: string }>
    | { journalists: Array<{ id: string; email: string }> };
  const arrBefore = Array.isArray(listBefore) ? listBefore : listBefore.journalists;
  const journalist = arrBefore.find((j) => j.email === email)!;
  await api(request, t, 'post', `/admin/events/${event.id}/accreditations/${journalist.id}/process`, {
    action: 'accept',
  });

  // 4) Récupère le jeton et soumet une demande d'interview via l'espace public.
  const listAfter = (await api(request, t, 'get', `/admin/events/${event.id}/accreditations`)) as
    | Array<{ email: string; token: string }>
    | { journalists: Array<{ email: string; token: string }> };
  const arrAfter = Array.isArray(listAfter) ? listAfter : listAfter.journalists;
  const token = arrAfter.find((j) => j.email === email)!.token;
  await request.post(`/api/public/space/${token}/requests`, {
    data: { type: 'interview', artistId, slotId: null, stageId: null, message: 'Demande E2E' },
  });

  // 5) Back-office : la file des demandes se charge (PAS de page blanche) et affiche la demande.
  await injectAuth(page, auth);
  await page.goto(`/admin/events/${event.id}/requests`);

  await expect(page.getByRole('heading', { name: `E2E ${stamp}` })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  const refuser = page.getByRole('button', { name: 'Refuser', exact: true });
  await expect(refuser).toBeVisible();

  // 6) Refuser → statut « Refusée » + bouton « Rouvrir », plus d'Accepter/Refuser (le bug).
  await refuser.click();
  await expect(page.getByRole('button', { name: 'Rouvrir', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refuser', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Accepter', exact: true })).toHaveCount(0);
  await expect(page.locator('.badge', { hasText: 'Refusée' })).toBeVisible();

  // 7) Rouvrir → revient à « Accepter / Refuser ».
  await page.getByRole('button', { name: 'Rouvrir', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Accepter', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refuser', exact: true })).toBeVisible();

  // Nettoyage best-effort (super-admin requis pour DELETE event ; ignoré sinon).
  await api(request, t, 'delete', `/admin/events/${event.id}`).catch(() => {});
});
