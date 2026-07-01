import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { AppError } from '../../http/AppError';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { findJournalistByToken } from '../../db/repositories/journalistRepo';
import { getBranding, getConfig } from '../../db/repositories/eventRepo';
import { getEventOrThrow } from '../../services/eventService';
import { getPublicLineup } from '../../services/lineupService';
import { listJournalistRequests, submitRequest } from '../../services/requestService';
import { setSpacePassword } from '../../services/journalistAuthService';
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_VALUES } from '../../domain';
import type { Journalist } from '../../domain';
import {
  createCoverage,
  deleteCoverage,
  listCoverageByJournalist,
} from '../../db/repositories/coverageRepo';
import { signUpload } from '../../services/storageService';

export const publicSpaceRouter = Router();

/** Résout le journaliste depuis son token d'espace (accès accepté requis). */
async function requireJournalist(token: string): Promise<Journalist> {
  const journalist = await findJournalistByToken(token);
  if (!journalist) throw AppError.notFound('Espace introuvable');
  if (journalist.accStatus !== 'acceptee') throw AppError.forbidden('Accréditation non encore acceptée');
  return journalist;
}

const isEventEnded = (endDate: string | null): boolean =>
  endDate != null && new Date(endDate).getTime() < Date.now();

/**
 * Espace journaliste (accès par token). Renvoie son profil, le lineup pour le
 * sélecteur, et la liste de ses demandes avec statut. Chaque journaliste ne voit
 * que son propre espace.
 */
publicSpaceRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const token = req.params.token!;
    const journalist = await findJournalistByToken(token);
    if (!journalist) throw AppError.notFound('Espace introuvable');
    if (journalist.accStatus !== 'acceptee') {
      throw AppError.forbidden('Accréditation non encore acceptée');
    }
    const event = await getEventOrThrow(journalist.eventId);
    const [lineup, requests, branding, config, coverage] = await Promise.all([
      getPublicLineup(journalist.eventId, journalist.lang),
      listJournalistRequests(token),
      getBranding(journalist.eventId),
      getConfig(journalist.eventId),
      listCoverageByJournalist(journalist.id),
    ]);
    sendData(res, {
      event: { id: event.id, name: event.name, languages: event.languages, branding, ended: isEventEnded(event.endDate) },
      journalist: {
        firstName: journalist.firstName,
        lastName: journalist.lastName,
        lang: journalist.lang,
        accreditationType: journalist.accreditationType,
        hasPassword: journalist.passwordHash != null,
      },
      lineup,
      requests,
      photoRules: config
        ? { photoRule: config.photoRule, onsiteContract: config.onsiteContract, photoTerms: config.photoTerms }
        : null,
      coverage,
      coverageCategories: MEDIA_CATEGORIES,
    });
  }),
);

const RequestSchema = z
  .object({
    type: z.enum(['interview', 'photo_report', 'video_report']),
    artistId: z.string().uuid().nullish(),
    slotId: z.string().uuid().nullish(),
    stageId: z.string().uuid().nullish(),
    message: z.string().max(2000).nullish(),
  })
  .refine((d) => !!d.artistId, {
    message: 'Un artiste est requis',
    path: ['artistId'],
  });

publicSpaceRouter.post(
  '/:token/requests',
  validateBody(RequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof RequestSchema>;
    const request = await submitRequest({ token: req.params.token!, ...body });
    sendData(res, request, 201);
  }),
);

const PasswordSchema = z.object({ password: z.string().min(8, 'Au moins 8 caractères') });

/** Le journaliste (authentifié par son token d'espace) définit/remplace son mot de passe. */
publicSpaceRouter.post(
  '/:token/password',
  validateBody(PasswordSchema),
  asyncHandler(async (req, res) => {
    const { password } = req.body as z.infer<typeof PasswordSchema>;
    await setSpacePassword(req.params.token!, password);
    sendData(res, { ok: true });
  }),
);

// ── Revue de presse : le journaliste dépose ses retombées ───────────
const CoverageSchema = z
  .object({
    mediaCategory: z.enum(MEDIA_CATEGORY_VALUES),
    isUpload: z.boolean().default(false),
    url: z.string().url().max(2000).regex(/^https:\/\//i, 'URL https:// requise'),
    thumbnailUrl: z.string().url().max(2000).nullish(),
    title: z.string().max(200).nullish(),
    archiveConsent: z.boolean().default(false),
    promoConsent: z.boolean().default(false),
  })
  // Pour un média uploadé (photo/vidéo/capture), l'autorisation d'archivage + usage promo est obligatoire.
  .refine((d) => !d.isUpload || (d.archiveConsent && d.promoConsent), {
    message: "L'autorisation d'archivage et d'usage promotionnel est obligatoire pour un média déposé.",
    path: ['archiveConsent'],
  });

publicSpaceRouter.post(
  '/:token/coverage',
  validateBody(CoverageSchema),
  asyncHandler(async (req, res) => {
    const journalist = await requireJournalist(req.params.token!);
    const b = req.body as z.infer<typeof CoverageSchema>;
    const item = await createCoverage({
      eventId: journalist.eventId,
      journalistId: journalist.id,
      mediaCategory: b.mediaCategory,
      isUpload: b.isUpload,
      url: b.url,
      thumbnailUrl: b.thumbnailUrl ?? null,
      title: b.title ?? null,
      archiveConsent: b.archiveConsent,
      promoConsent: b.promoConsent,
    });
    sendData(res, item, 201);
  }),
);

publicSpaceRouter.delete(
  '/:token/coverage/:id',
  asyncHandler(async (req, res) => {
    const journalist = await requireJournalist(req.params.token!);
    await deleteCoverage(req.params.id!, journalist.id);
    sendData(res, { ok: true });
  }),
);

/** Signature d'upload Cloudinary tokenisée : le dossier est dérivé de l'événement du journaliste. */
publicSpaceRouter.post(
  '/:token/assets/sign',
  asyncHandler(async (req, res) => {
    const journalist = await requireJournalist(req.params.token!);
    sendData(res, await signUpload(journalist.eventId, Math.floor(Date.now() / 1000)));
  }),
);
