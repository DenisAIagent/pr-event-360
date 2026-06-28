import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { AppError } from '../../http/AppError';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireEventEditor, requireRole } from '../../middleware/auth';
import {
  createEvent,
  getEventSettings,
  getAccessibleEventOrThrow,
  listEventsForUserService,
} from '../../services/eventService';
import {
  updateConfig,
  upsertRequestTypeWeight,
  upsertTemplate,
  insertMediaType,
  upsertBranding,
  setAccreditationDeadline,
  upsertRecap,
  getBranding,
  deleteEvent,
} from '../../db/repositories/eventRepo';
import { sendRecap } from '../../services/recapService';
import { addArtist, addStage, getLineup } from '../../services/lineupService';
import {
  updateArtist,
  deleteArtist,
  updateStage,
  deleteStage,
} from '../../db/repositories/lineupRepo';
import { listAccreditations, processAccreditation } from '../../services/accreditationService';
import { deleteJournalist } from '../../db/repositories/journalistRepo';
import { changeRequestStatus } from '../../services/requestService';
import { getDashboard, getQueue } from '../../services/queueService';
import { generatePlanning } from '../../services/planningService';
import { listNotificationsByEvent } from '../../db/repositories/notificationRepo';

export const eventsRouter = Router();
eventsRouter.use(requireAuth);

const LANG = z.enum(['fr', 'en', 'pt', 'es']);
const REQUEST_TYPE = z.enum(['interview', 'photo_report', 'video_report']);

// ── Événements ──────────────────────────────────────────────────────
const CreateEventSchema = z.object({
  name: z.string().min(1),
  location: z.string().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  languages: z.array(LANG).min(1, 'Au moins une langue active'),
  config: z
    .object({
      itwDurationMin: z.number().int().positive(),
      itwBufferMin: z.number().int().nonnegative(),
      defaultItwQuota: z.number().int().nonnegative(),
      photoQuotaPerStage: z.number().int().nonnegative(),
      ageBonusPerHour: z.number().nonnegative(),
      ageBonusCap: z.number().nonnegative(),
    })
    .partial()
    .optional(),
});

eventsRouter.post(
  '/',
  requireEventEditor,
  validateBody(CreateEventSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof CreateEventSchema>;
    const event = await createEvent({ ownerUserId: req.user!.sub, ...body });
    sendData(res, event, 201);
  }),
);

eventsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    sendData(res, await listEventsForUserService(req.user!));
  }),
);

eventsRouter.get(
  '/:eventId',
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const branding = await getBranding(event.id);
    sendData(res, { ...event, branding });
  }),
);

// Suppression définitive d'un événement — réservée aux administrateurs.
eventsRouter.delete(
  '/:eventId',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const event = await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await deleteEvent(event.id);
    sendData(res, { deleted: true });
  }),
);

eventsRouter.get(
  '/:eventId/settings',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await getEventSettings(req.params.eventId!));
  }),
);

// ── Configuration ───────────────────────────────────────────────────
const ConfigSchema = z.object({
  itwDurationMin: z.number().int().positive(),
  itwBufferMin: z.number().int().nonnegative(),
  defaultItwQuota: z.number().int().nonnegative(),
  photoQuotaPerStage: z.number().int().nonnegative(),
  ageBonusPerHour: z.number().nonnegative(),
  ageBonusCap: z.number().nonnegative(),
});
eventsRouter.put(
  '/:eventId/config',
  requireEventEditor,
  validateBody(ConfigSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const updated = await updateConfig(req.params.eventId!, req.body as z.infer<typeof ConfigSchema>);
    sendData(res, updated);
  }),
);

const MediaTypeSchema = z.object({ label: z.string().min(1), weight: z.number().int() });
eventsRouter.post(
  '/:eventId/media-types',
  requireEventEditor,
  validateBody(MediaTypeSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof MediaTypeSchema>;
    sendData(res, await insertMediaType({ eventId: req.params.eventId!, ...body }), 201);
  }),
);

const TypeWeightSchema = z.object({ type: REQUEST_TYPE, multiplier: z.number().nonnegative() });
eventsRouter.put(
  '/:eventId/type-weights',
  requireEventEditor,
  validateBody(TypeWeightSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof TypeWeightSchema>;
    await upsertRequestTypeWeight(req.params.eventId!, body.type, body.multiplier);
    sendData(res, { ok: true });
  }),
);

const TemplateSchema = z.object({
  lang: LANG,
  triggerKey: z.string().min(1),
  channel: z.enum(['email', 'sms']).default('email'),
  subject: z.string().nullish(),
  body: z.string().min(1),
});
eventsRouter.put(
  '/:eventId/templates',
  requireEventEditor,
  validateBody(TemplateSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof TemplateSchema>;
    sendData(res, await upsertTemplate({ eventId: req.params.eventId!, ...body }));
  }),
);

// ── Branding (apparence des pages publiques) ────────────────────────
const HEX = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur attendue au format #RRGGBB')
  .nullish();
const BrandingSchema = z.object({
  logoUrl: z.string().max(1_500_000, 'Logo trop volumineux').nullish(), // URL ou data URL
  accentColor: HEX,
  bgColor: HEX,
  textColor: HEX,
  bgImageUrl: z.string().max(3_000_000, "Image de fond trop volumineuse").nullish(),
});
eventsRouter.put(
  '/:eventId/branding',
  requireEventEditor,
  validateBody(BrandingSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const b = req.body as z.infer<typeof BrandingSchema>;
    const saved = await upsertBranding(req.params.eventId!, {
      logoUrl: b.logoUrl ?? null,
      accentColor: b.accentColor ?? null,
      bgColor: b.bgColor ?? null,
      textColor: b.textColor ?? null,
      bgImageUrl: b.bgImageUrl ?? null,
    });
    sendData(res, saved);
  }),
);

// ── Clôture des inscriptions ────────────────────────────────────────
const DeadlineSchema = z.object({
  // ISO 8601 (date ou date-heure) ou null pour retirer la limite.
  accreditationDeadline: z.string().datetime({ offset: true }).nullable(),
});
eventsRouter.put(
  '/:eventId/deadline',
  requireEventEditor,
  validateBody(DeadlineSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const b = req.body as z.infer<typeof DeadlineSchema>;
    const updated = await setAccreditationDeadline(req.params.eventId!, b.accreditationDeadline);
    sendData(res, updated);
  }),
);

// ── Récapitulatif périodique des inscriptions ───────────────────────
const RecapSchema = z.object({
  frequency: z.enum(['none', 'daily', 'weekly']),
  recipients: z.array(z.string().email()).max(50),
});
eventsRouter.put(
  '/:eventId/recap',
  requireEventEditor,
  validateBody(RecapSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const b = req.body as z.infer<typeof RecapSchema>;
    const saved = await upsertRecap(req.params.eventId!, b);
    sendData(res, saved);
  }),
);

// Envoi immédiat (test / « envoyer maintenant »).
eventsRouter.post(
  '/:eventId/recap/test',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const result = await sendRecap(req.params.eventId!);
    sendData(res, result);
  }),
);

// ── Lineup ──────────────────────────────────────────────────────────
const StageSchema = z.object({ name: z.string().min(1) });
eventsRouter.post(
  '/:eventId/stages',
  requireEventEditor,
  validateBody(StageSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof StageSchema>;
    sendData(res, await addStage(req.params.eventId!, body.name), 201);
  }),
);

eventsRouter.get(
  '/:eventId/lineup',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await getLineup(req.params.eventId!));
  }),
);

const TIME = z.string().regex(/^\d{1,2}:\d{2}$/, 'Heure attendue HH:MM');
const ArtistSchema = z.object({
  name: z.string().min(1),
  stageId: z.string().uuid().nullish(),
  itwQuota: z.number().int().nonnegative().nullish(),
  photoQuota: z.number().int().nonnegative().nullish(),
  videoQuota: z.number().int().nonnegative().nullish(),
  windows: z
    .array(z.object({ day: z.string().min(1), startTime: TIME, endTime: TIME }))
    .optional(),
});
eventsRouter.post(
  '/:eventId/artists',
  requireEventEditor,
  validateBody(ArtistSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ArtistSchema>;
    sendData(res, await addArtist({ eventId: req.params.eventId!, ...body }), 201);
  }),
);

// Corriger un artiste (nom, scène, quota). Les créneaux ne changent pas ici.
const ArtistUpdateSchema = z.object({
  name: z.string().min(1),
  stageId: z.string().uuid().nullish(),
  itwQuota: z.number().int().nonnegative().nullish(),
  photoQuota: z.number().int().nonnegative().nullish(),
  videoQuota: z.number().int().nonnegative().nullish(),
});
eventsRouter.put(
  '/:eventId/artists/:artistId',
  requireEventEditor,
  validateBody(ArtistUpdateSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ArtistUpdateSchema>;
    const artist = await updateArtist(req.params.artistId!, req.params.eventId!, body);
    if (!artist) throw AppError.notFound('Artiste introuvable.');
    sendData(res, artist);
  }),
);

eventsRouter.delete(
  '/:eventId/artists/:artistId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await deleteArtist(req.params.artistId!, req.params.eventId!);
    sendData(res, { deleted: true });
  }),
);

// Renommer / supprimer une scène.
eventsRouter.put(
  '/:eventId/stages/:stageId',
  requireEventEditor,
  validateBody(StageSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof StageSchema>;
    const stage = await updateStage(req.params.stageId!, req.params.eventId!, body.name);
    if (!stage) throw AppError.notFound('Scène introuvable.');
    sendData(res, stage);
  }),
);

eventsRouter.delete(
  '/:eventId/stages/:stageId',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await deleteStage(req.params.stageId!, req.params.eventId!);
    sendData(res, { deleted: true });
  }),
);

// ── Accréditations ──────────────────────────────────────────────────
eventsRouter.get(
  '/:eventId/accreditations',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await listAccreditations(req.params.eventId!));
  }),
);

const ProcessSchema = z.object({ action: z.enum(['accept', 'reject']) });
eventsRouter.post(
  '/:eventId/accreditations/:journalistId/process',
  validateBody(ProcessSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof ProcessSchema>;
    const journalist = await processAccreditation(
      req.params.eventId!,
      req.params.journalistId!,
      body.action,
    );
    sendData(res, journalist);
  }),
);

// Effacement RGPD (art. 17) — suppression définitive d'un journaliste et de ses demandes.
eventsRouter.delete(
  '/:eventId/accreditations/:journalistId',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    await deleteJournalist(req.params.eventId!, req.params.journalistId!);
    sendData(res, { deleted: true });
  }),
);

// ── File des demandes ───────────────────────────────────────────────
const STATUS = z.enum([
  'pas_encore_traite',
  'en_cours',
  'transmise_prod',
  'attente_artiste',
  'acceptee',
  'refusee',
  'liste_attente',
]);
eventsRouter.get(
  '/:eventId/requests',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const type = REQUEST_TYPE.optional().parse(req.query.type || undefined);
    const status = STATUS.optional().parse(req.query.status || undefined);
    sendData(res, await getQueue(req.params.eventId!, { type, status }));
  }),
);

const StatusChangeSchema = z.object({
  status: STATUS.refine((s) => s !== 'liste_attente', 'Statut système non assignable'),
  note: z.string().nullish(),
});
eventsRouter.post(
  '/:eventId/requests/:requestId/status',
  validateBody(StatusChangeSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const body = req.body as z.infer<typeof StatusChangeSchema>;
    const updated = await changeRequestStatus(
      req.params.eventId!,
      req.params.requestId!,
      body.status,
      req.user!.sub,
      body.note ?? undefined,
    );
    sendData(res, updated);
  }),
);

// Génère/recalcule le planning des interviews (créneaux attribués par priorité).
eventsRouter.post(
  '/:eventId/planning/generate',
  requireEventEditor,
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await generatePlanning(req.params.eventId!));
  }),
);

// ── Tableau de bord & messages simulés ──────────────────────────────
eventsRouter.get(
  '/:eventId/dashboard',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await getDashboard(req.params.eventId!));
  }),
);

eventsRouter.get(
  '/:eventId/messages',
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    sendData(res, await listNotificationsByEvent(req.params.eventId!));
  }),
);
