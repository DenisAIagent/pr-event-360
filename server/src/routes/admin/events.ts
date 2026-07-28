import { Router } from 'express';
import { z } from 'zod';
import { EVENT_TYPES } from '@pr-event-360/core';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
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
  updatePhotoRules,
  upsertRequestTypeWeight,
  upsertTemplate,
  insertMediaType,
  upsertBranding,
  setAccreditationDeadline,
  upsertRecap,
  getBranding,
  deleteEvent,
} from '../../db/repositories/eventRepo';
import { customDomainTarget, platformBaseDomain } from '../../services/siteService';
import { sendRecap } from '../../services/recapService';

/**
 * Routeur « cœur événement » : CRUD événement, configuration, branding,
 * clôture d'inscriptions et récapitulatif périodique.
 * Les autres sous-ressources vivent dans leurs routeurs dédiés, montés sur le
 * même chemin (/api/admin/events) : eventDomains, eventLineup, eventPipeline.
 */
export const eventsRouter = Router();
eventsRouter.use(requireAuth);

const LANG = z.enum(['fr', 'en', 'pt', 'es']);
const REQUEST_TYPE = z.enum(['interview', 'photo_report', 'video_report']);

// ── Événements ──────────────────────────────────────────────────────
const CreateEventSchema = z.object({
  name: z.string().min(1),
  eventType: z.enum(EVENT_TYPES),
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
    const event = await createEvent({
      organizationId: req.user!.organizationId,
      ownerUserId: req.user!.sub,
      ...body,
    });
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
    sendData(res, {
      ...event,
      branding,
      customDomainTarget: customDomainTarget(),
      platformBaseDomain: platformBaseDomain(),
    });
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
  photoRule: z.string().max(2000).nullable().default(null),
  onsiteContract: z.boolean().default(false),
  photoTerms: z.string().max(5000).nullable().default(null),
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

// Règles photo & autorisations (mise à jour partielle, indépendante des quotas/durées).
const PhotoRulesSchema = z.object({
  photoRule: z.string().max(2000).nullable().default(null),
  onsiteContract: z.boolean().default(false),
  photoTerms: z.string().max(5000).nullable().default(null),
});
eventsRouter.put(
  '/:eventId/photo-rules',
  requireEventEditor,
  validateBody(PhotoRulesSchema),
  asyncHandler(async (req, res) => {
    await getAccessibleEventOrThrow(req.params.eventId!, req.user!);
    const updated = await updatePhotoRules(req.params.eventId!, req.body as z.infer<typeof PhotoRulesSchema>);
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
// Une image de branding = URL http(s) OU data URL d'image bitmap (jamais SVG ni javascript:/data:text).
// Bloque les schémas dangereux à la source (défense en profondeur, en plus de l'échappement à l'usage).
const isSafeImageUrl = (v: string): boolean =>
  /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v);
const IMAGE_URL = (maxBytes: number, tooBig: string) =>
  z
    .string()
    .max(maxBytes, tooBig)
    .refine(isSafeImageUrl, "URL d'image non autorisée (attendu : https ou data:image bitmap)")
    .nullish();

const BrandingSchema = z.object({
  logoUrl: IMAGE_URL(1_500_000, 'Logo trop volumineux'),
  accentColor: HEX,
  bgColor: HEX,
  textColor: HEX,
  bgImageUrl: IMAGE_URL(3_000_000, 'Image de fond trop volumineuse'),
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
