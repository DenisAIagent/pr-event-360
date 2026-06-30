import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { listPublicReviews } from '../../db/repositories/reviewRepo';

export const publicReviewsRouter = Router();

/** Avis publiables (approuvés + consentis) affichés sur la landing. Champs publics uniquement. */
publicReviewsRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const reviews = await listPublicReviews();
    sendData(
      res,
      reviews.map((r) => ({
        id: r.id,
        authorName: r.authorName,
        authorRole: r.authorRole,
        authorOrg: r.authorOrg,
        rating: r.rating,
        quote: r.quote,
      })),
    );
  }),
);
