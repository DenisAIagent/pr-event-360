import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { AppError } from '../../http/AppError';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requirePlatformAdmin } from '../../middleware/auth';
import { findUserById } from '../../db/repositories/userRepo';
import {
  findReviewByUser,
  listAllReviews,
  setReviewStatus,
  upsertReview,
} from '../../db/repositories/reviewRepo';

// ── Avis de l'utilisateur courant ───────────────────────────────────
export const reviewRouter = Router();
reviewRouter.use(requireAuth);

reviewRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const review = await findReviewByUser(req.user!.sub);
    const me = await findUserById(req.user!.sub);
    // Suggestions de pré-remplissage si l'utilisateur n'a pas encore d'avis.
    sendData(res, {
      review,
      suggested: { authorName: me?.fullName ?? '', authorOrg: me?.organizationName ?? '' },
    });
  }),
);

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  quote: z.string().min(1).max(1000),
  authorName: z.string().min(1).max(120),
  authorRole: z.string().max(80).nullish(),
  authorOrg: z.string().max(120).nullish(),
  consentPublic: z.boolean().default(false),
});

reviewRouter.post(
  '/',
  validateBody(ReviewSchema),
  asyncHandler(async (req, res) => {
    const b = req.body as z.infer<typeof ReviewSchema>;
    const review = await upsertReview({
      userId: req.user!.sub,
      organizationId: req.user!.organizationId ?? null,
      authorName: b.authorName,
      authorRole: b.authorRole ?? null,
      authorOrg: b.authorOrg ?? null,
      rating: b.rating,
      quote: b.quote,
      consentPublic: b.consentPublic,
    });
    sendData(res, review, 201);
  }),
);

// ── Modération (super-admin) ────────────────────────────────────────
export const reviewAdminRouter = Router();
reviewAdminRouter.use(requireAuth, requirePlatformAdmin);

reviewAdminRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendData(res, await listAllReviews());
  }),
);

const StatusSchema = z.object({ status: z.enum(['pending', 'approved', 'rejected']) });
reviewAdminRouter.post(
  '/:id/status',
  validateBody(StatusSchema),
  asyncHandler(async (req, res) => {
    const { status } = req.body as z.infer<typeof StatusSchema>;
    const updated = await setReviewStatus(req.params.id!, status);
    if (!updated) throw AppError.notFound('Avis introuvable');
    sendData(res, updated);
  }),
);
