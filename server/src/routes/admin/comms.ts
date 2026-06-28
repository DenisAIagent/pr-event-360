import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireEventEditor } from '../../middleware/auth';
import { getAccessibleEventOrThrow, getEventOrThrow } from '../../services/eventService';
import { getPublicLineup } from '../../services/lineupService';
import { getBranding } from '../../db/repositories/eventRepo';
import { signUpload } from '../../services/storageService';
import { sendNewsletter } from '../../services/newsletterService';
import { createAsset, deleteAsset, listAssets } from '../../db/repositories/assetRepo';
import {
  createPressRelease,
  deletePressRelease,
  listPressReleases,
  updatePressRelease,
} from '../../db/repositories/pressReleaseRepo';
import {
  createNewsletter,
  deleteNewsletter,
  listNewsletters,
  updateNewsletter,
} from '../../db/repositories/newsletterRepo';
import { listJournalistsByEvent } from '../../db/repositories/journalistRepo';

// Monté à /api/admin/events (après eventsRouter) : gère médias, CP, newsletters.
export const commsRouter = Router();
commsRouter.use(requireAuth);

const access = (req: { params: Record<string, string | undefined>; user?: { sub: string; role: 'admin' | 'attache' | 'assistant' } }) =>
  getAccessibleEventOrThrow(req.params.eventId!, req.user!);

const KIND = z.enum(['photo', 'video', 'logo', 'press_kit', 'other']);

// ── Médiathèque ─────────────────────────────────────────────────────
commsRouter.get(
  '/:eventId/assets',
  asyncHandler(async (req, res) => {
    await access(req);
    sendData(res, await listAssets(req.params.eventId!));
  }),
);

// Signature d'upload direct Cloudinary (la clé secrète ne quitte pas le serveur).
commsRouter.post(
  '/:eventId/assets/sign',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await access(req);
    const nowSec = Math.floor(Date.now() / 1000);
    sendData(res, await signUpload(req.params.eventId!, nowSec));
  }),
);

const AssetSchema = z.object({
  kind: KIND,
  title: z.string().min(1),
  description: z.string().nullish(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().nullish(),
  mime: z.string().nullish(),
  bytes: z.number().int().nonnegative().nullish(),
  source: z.enum(['upload', 'link']).optional(),
});
commsRouter.post(
  '/:eventId/assets',
  requireEventEditor,
  validateBody(AssetSchema),
  asyncHandler(async (req, res) => {
    await access(req);
    const b = req.body as z.infer<typeof AssetSchema>;
    sendData(res, await createAsset({ eventId: req.params.eventId!, ...b }), 201);
  }),
);

commsRouter.delete(
  '/:eventId/assets/:assetId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await access(req);
    await deleteAsset(req.params.eventId!, req.params.assetId!);
    sendData(res, { ok: true });
  }),
);

// ── Communiqués de presse ───────────────────────────────────────────
const PressSchema = z.object({
  title: z.string().min(1),
  bodyHtml: z.string().default(''),
  status: z.enum(['draft', 'published']).default('draft'),
});
commsRouter.get(
  '/:eventId/press-releases',
  asyncHandler(async (req, res) => {
    await access(req);
    sendData(res, await listPressReleases(req.params.eventId!));
  }),
);
commsRouter.post(
  '/:eventId/press-releases',
  requireEventEditor,
  validateBody(PressSchema),
  asyncHandler(async (req, res) => {
    await access(req);
    const b = req.body as z.infer<typeof PressSchema>;
    sendData(res, await createPressRelease({ eventId: req.params.eventId!, ...b }), 201);
  }),
);
commsRouter.put(
  '/:eventId/press-releases/:id',
  requireEventEditor,
  validateBody(PressSchema),
  asyncHandler(async (req, res) => {
    await access(req);
    const b = req.body as z.infer<typeof PressSchema>;
    const updated = await updatePressRelease(req.params.eventId!, req.params.id!, b);
    if (!updated) return sendData(res, { error: 'introuvable' }, 404);
    sendData(res, updated);
  }),
);
commsRouter.delete(
  '/:eventId/press-releases/:id',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await access(req);
    await deletePressRelease(req.params.eventId!, req.params.id!);
    sendData(res, { ok: true });
  }),
);

// ── Newsletters ─────────────────────────────────────────────────────
const NewsletterSchema = z.object({
  subject: z.string().min(1),
  bodyHtml: z.string().default(''),
});
commsRouter.get(
  '/:eventId/newsletters',
  asyncHandler(async (req, res) => {
    await access(req);
    sendData(res, await listNewsletters(req.params.eventId!));
  }),
);
commsRouter.post(
  '/:eventId/newsletters',
  requireEventEditor,
  validateBody(NewsletterSchema),
  asyncHandler(async (req, res) => {
    await access(req);
    const b = req.body as z.infer<typeof NewsletterSchema>;
    sendData(res, await createNewsletter({ eventId: req.params.eventId!, ...b }), 201);
  }),
);
commsRouter.put(
  '/:eventId/newsletters/:id',
  requireEventEditor,
  validateBody(NewsletterSchema),
  asyncHandler(async (req, res) => {
    await access(req);
    const b = req.body as z.infer<typeof NewsletterSchema>;
    const updated = await updateNewsletter(req.params.eventId!, req.params.id!, b);
    if (!updated) return sendData(res, { error: 'introuvable ou déjà envoyée' }, 404);
    sendData(res, updated);
  }),
);

commsRouter.delete(
  '/:eventId/newsletters/:id',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await access(req);
    const ok = await deleteNewsletter(req.params.eventId!, req.params.id!);
    if (!ok) return sendData(res, { error: 'introuvable ou déjà envoyée' }, 404);
    sendData(res, { ok: true });
  }),
);

const SendSchema = z.object({ journalistIds: z.array(z.string().uuid()).min(1) });
commsRouter.post(
  '/:eventId/newsletters/:id/send',
  requireEventEditor,
  validateBody(SendSchema),
  asyncHandler(async (req, res) => {
    await access(req);
    const { journalistIds } = req.body as z.infer<typeof SendSchema>;
    sendData(res, await sendNewsletter(req.params.eventId!, req.params.id!, journalistIds));
  }),
);

// ── Aperçu de l'espace journaliste (données d'exemple + vrai lineup) ─
// Réservé au back-office : renvoie la même forme que l'espace public, avec un
// journaliste fictif, pour prévisualiser sans compte accepté ni vraie donnée.
commsRouter.get(
  '/:eventId/space-preview',
  asyncHandler(async (req, res) => {
    await access(req);
    const eventId = req.params.eventId!;
    const event = await getEventOrThrow(eventId);
    const lang = event.languages[0] ?? 'fr';
    const [lineup, branding] = await Promise.all([getPublicLineup(eventId, lang), getBranding(eventId)]);
    sendData(res, {
      event: { id: event.id, name: event.name, languages: event.languages, branding },
      journalist: {
        firstName: 'Aperçu',
        lastName: 'Journaliste',
        lang,
        accreditationType: 'presse',
      },
      lineup,
      requests: [],
    });
  }),
);

// ── Destinataires (pour la sélection côté UI) ───────────────────────
commsRouter.get(
  '/:eventId/recipients',
  asyncHandler(async (req, res) => {
    await access(req);
    const journalists = await listJournalistsByEvent(req.params.eventId!);
    sendData(
      res,
      journalists.map((j) => ({
        id: j.id,
        firstName: j.firstName,
        lastName: j.lastName,
        email: j.email,
        accStatus: j.accStatus,
        accreditationType: j.accreditationType,
        lang: j.lang,
      })),
    );
  }),
);
