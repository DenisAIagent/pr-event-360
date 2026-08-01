import { Router, type Request, type Response } from 'express';
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
import { issueJournalistAccessToken } from '../../services/journalistAccessService';
import { exportOwnJournalistPersonalData } from '../../services/gdprExportService';
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_VALUES } from '../../domain';
import type { Journalist } from '../../domain';
import {
  createCoverage,
  deleteCoverage,
  listCoverageByJournalist,
} from '../../db/repositories/coverageRepo';
import { signUpload } from '../../services/storageService';
import {
  cancelConferenceRegistration,
  listPressConferencesForJournalist,
  registerJournalistForConference,
} from '../../services/pressConferenceService';
import { passwordSchema } from '../../lib/passwordPolicy';
import {
  clearJournalistSession,
  issueJournalistSession,
  journalistTokenFromCookie,
} from '../../lib/journalistSession';

export const publicSpaceRouter = Router();

/** Résout le journaliste depuis son token d'espace (accès accepté requis). */
async function requireJournalist(token: string): Promise<Journalist> {
  const journalist = await findJournalistByToken(token);
  if (!journalist) throw AppError.notFound('Espace introuvable');
  if (journalist.accStatus !== 'acceptee') throw AppError.forbidden('Accréditation non encore acceptée');
  return journalist;
}

/**
 * Token d'espace : paramètre d'URL (lien magique / rétrocompat) ou cookie de session
 * lorsque le segment est `me` (session post-échange).
 */
function resolveSpaceToken(req: Request): string {
  const param = req.params.token;
  if (param && param !== 'me') return param;
  const cookie = journalistTokenFromCookie(req);
  if (cookie) return cookie;
  if (param === 'me') throw AppError.unauthorized('Session journaliste expirée ou absente');
  throw AppError.notFound('Espace introuvable');
}

const isEventEnded = (endDate: string | null): boolean =>
  endDate != null && new Date(endDate).getTime() < Date.now();

async function buildSpacePayload(token: string) {
  const journalist = await requireJournalist(token);
  const event = await getEventOrThrow(journalist.eventId);
  const [lineup, requests, branding, config, coverage, pressConferences] = await Promise.all([
    getPublicLineup(journalist.eventId, journalist.lang),
    listJournalistRequests(token),
    getBranding(journalist.eventId),
    getConfig(journalist.eventId),
    listCoverageByJournalist(journalist.id),
    listPressConferencesForJournalist(journalist),
  ]);
  return {
    event: {
      id: event.id,
      name: event.name,
      eventType: event.eventType,
      languages: event.languages,
      branding,
      ended: isEventEnded(event.endDate),
    },
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
    pressConferences,
  };
}

/**
 * Échange le lien magique (ou un bearer encore valide) contre une session cookie HttpOnly.
 * Le jeton est ROTATÉ : l'ancien lien URL meurt immédiatement (anti-fuite historique/logs).
 * Déclaré AVANT `/:token` pour ne pas être capturé comme token.
 */
publicSpaceRouter.post(
  '/session',
  validateBody(z.object({ token: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const { token: raw } = req.body as { token: string };
    const journalist = await requireJournalist(raw);
    const fresh = await issueJournalistAccessToken(journalist.id);
    issueJournalistSession(res, fresh);
    sendData(res, { ok: true });
  }),
);

/** Ferme la session journaliste (efface le cookie). */
publicSpaceRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearJournalistSession(res);
    sendData(res, { ok: true });
  }),
);

/**
 * Espace journaliste (accès par token URL ou session cookie via `/me`).
 * Chaque journaliste ne voit que son propre espace.
 */
publicSpaceRouter.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const token = resolveSpaceToken(req);
    // Pose/rafraîchit le cookie si l'accès se fait encore par l'URL (premier clic).
    if (req.params.token && req.params.token !== 'me') {
      issueJournalistSession(res, token);
    }
    sendData(res, await buildSpacePayload(token));
  }),
);

publicSpaceRouter.post(
  '/:token/press-conferences/:conferenceId/register',
  asyncHandler(async (req, res) => {
    const journalist = await requireJournalist(resolveSpaceToken(req));
    sendData(res, await registerJournalistForConference(journalist, req.params.conferenceId!));
  }),
);

publicSpaceRouter.delete(
  '/:token/press-conferences/:conferenceId/registration',
  asyncHandler(async (req, res) => {
    const journalist = await requireJournalist(resolveSpaceToken(req));
    await cancelConferenceRegistration(journalist, req.params.conferenceId!);
    sendData(res, { cancelled: true });
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
    message: 'Un participant est requis',
    path: ['artistId'],
  });

publicSpaceRouter.post(
  '/:token/requests',
  validateBody(RequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof RequestSchema>;
    const token = resolveSpaceToken(req);
    const request = await submitRequest({ token, ...body });
    sendData(res, request, 201);
  }),
);

const PasswordSchema = z.object({ password: passwordSchema('Au moins 12 caractères') });

/** Le journaliste définit son mot de passe d'espace (premier réglage uniquement). */
publicSpaceRouter.post(
  '/:token/password',
  validateBody(PasswordSchema),
  asyncHandler(async (req, res) => {
    const { password } = req.body as z.infer<typeof PasswordSchema>;
    await setSpacePassword(resolveSpaceToken(req), password);
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
  .refine((d) => !d.isUpload || (d.archiveConsent && d.promoConsent), {
    message: "L'autorisation d'archivage et d'usage promotionnel est obligatoire pour un média déposé.",
    path: ['archiveConsent'],
  });

publicSpaceRouter.post(
  '/:token/coverage',
  validateBody(CoverageSchema),
  asyncHandler(async (req, res) => {
    const journalist = await requireJournalist(resolveSpaceToken(req));
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
    const journalist = await requireJournalist(resolveSpaceToken(req));
    await deleteCoverage(req.params.id!, { journalistId: journalist.id });
    sendData(res, { ok: true });
  }),
);

/** Signature d'upload Cloudinary tokenisée : le dossier est dérivé de l'événement du journaliste. */
publicSpaceRouter.post(
  '/:token/assets/sign',
  asyncHandler(async (req, res) => {
    const journalist = await requireJournalist(resolveSpaceToken(req));
    sendData(res, await signUpload(journalist.eventId, Math.floor(Date.now() / 1000)));
  }),
);

/**
 * Export RGPD art. 15/20 — JSON structuré téléchargeable par le journaliste lui-même.
 * Content-Disposition pour un enregistrement local sans stocker le fichier côté serveur.
 */
publicSpaceRouter.get(
  '/:token/export',
  asyncHandler(async (req, res: Response) => {
    const journalist = await requireJournalist(resolveSpaceToken(req));
    const payload = await exportOwnJournalistPersonalData(journalist);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pr360-export-${journalist.id.slice(0, 8)}.json"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ success: true, data: payload });
  }),
);
