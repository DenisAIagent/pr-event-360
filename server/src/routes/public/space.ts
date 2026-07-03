import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { AppError } from '../../http/AppError';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { findJournalistById } from '../../db/repositories/journalistRepo';
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
import { journalistSessionFromReq, csrfValid } from '../../lib/journalistSession';
import { ERROR_CODES } from '../../http/errorCodes';

export const publicSpaceRouter = Router();

// Étend Request avec le journaliste résolu depuis la session.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      journalist?: Journalist;
    }
  }
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Authentifie l'espace journaliste via le COOKIE de session (httpOnly), plus le
 * jeton CSRF (double-submit) sur les requêtes mutantes. Remplace l'ancien token
 * permanent en clair dans l'URL. Les droits (accréditation acceptée) sont relus en base.
 */
async function requireJournalistSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const claims = journalistSessionFromReq(req);
    if (!claims) throw AppError.unauthorized('Session expirée. Reconnectez-vous.', ERROR_CODES.JSPACE_SESSION_EXPIRED);
    const journalist = await findJournalistById(claims.jid);
    if (!journalist || journalist.eventId !== claims.eid) {
      throw AppError.unauthorized('Session expirée. Reconnectez-vous.', ERROR_CODES.JSPACE_SESSION_EXPIRED);
    }
    if (journalist.accStatus !== 'acceptee') {
      throw AppError.forbidden('Accréditation non encore acceptée', ERROR_CODES.JSPACE_NOT_ACCEPTED);
    }
    if (MUTATING.has(req.method) && !csrfValid(req)) {
      throw AppError.forbidden('Jeton CSRF manquant ou invalide', ERROR_CODES.CSRF_INVALID);
    }
    req.journalist = journalist;
    next();
  } catch (err) {
    next(err);
  }
}

const isEventEnded = (endDate: string | null): boolean =>
  endDate != null && new Date(endDate).getTime() < Date.now();

/**
 * Espace journaliste (session). Renvoie son profil, le lineup pour le sélecteur, et
 * la liste de ses demandes avec statut. Chaque journaliste ne voit que son espace.
 */
publicSpaceRouter.get(
  '/',
  requireJournalistSession,
  asyncHandler(async (req, res) => {
    const journalist = req.journalist!;
    const event = await getEventOrThrow(journalist.eventId);
    const [lineup, requests, branding, config, coverage] = await Promise.all([
      getPublicLineup(journalist.eventId, journalist.lang),
      listJournalistRequests(journalist),
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
  '/requests',
  requireJournalistSession,
  validateBody(RequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof RequestSchema>;
    const request = await submitRequest(req.journalist!, body);
    sendData(res, request, 201);
  }),
);

const PasswordSchema = z.object({ password: z.string().min(8, 'Au moins 8 caractères') });

/** Le journaliste (session) définit son mot de passe (premier réglage uniquement). */
publicSpaceRouter.post(
  '/password',
  requireJournalistSession,
  validateBody(PasswordSchema),
  asyncHandler(async (req, res) => {
    const { password } = req.body as z.infer<typeof PasswordSchema>;
    await setSpacePassword(req.journalist!.id, password);
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
  '/coverage',
  requireJournalistSession,
  validateBody(CoverageSchema),
  asyncHandler(async (req, res) => {
    const journalist = req.journalist!;
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
  '/coverage/:id',
  requireJournalistSession,
  asyncHandler(async (req, res) => {
    await deleteCoverage(req.params.id!, { journalistId: req.journalist!.id });
    sendData(res, { ok: true });
  }),
);

/** Signature d'upload Cloudinary : le dossier est dérivé de l'événement du journaliste. */
publicSpaceRouter.post(
  '/assets/sign',
  requireJournalistSession,
  asyncHandler(async (req, res) => {
    sendData(res, await signUpload(req.journalist!.eventId, Math.floor(Date.now() / 1000)));
  }),
);
