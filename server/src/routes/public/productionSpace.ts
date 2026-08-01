import { Router, type Request } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { AppError } from '../../http/AppError';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import {
  clearProductionSession,
  csrfValid,
  issueProductionSession,
  productionSessionFromReq,
} from '../../lib/productionSession';
import {
  requireContactByAccessToken,
  rotateAfterExchange,
} from '../../services/productionContactService';
import { findProductionContact } from '../../db/repositories/productionRepo';
import { buildProductionSpace, submitProductionReview } from '../../services/productionReviewService';
import type { ProductionContact } from '../../db/repositories/productionRepo';

export const publicProductionRouter = Router();

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Garde de l'espace production, calquée sur `resolveSpaceJournalist` :
 * le JWT ne sert que de pointeur d'identité, le périmètre est relu en base à
 * chaque requête, et les mutations exigent le jeton CSRF.
 */
async function resolveContact(req: Request): Promise<ProductionContact> {
  const claims = productionSessionFromReq(req);
  if (!claims) throw AppError.unauthorized('Session production expirée ou absente');
  const contact = await findProductionContact(claims.cid, claims.eid);
  if (!contact) throw AppError.unauthorized('Session production invalide');
  if (MUTATING.has(req.method) && !csrfValid(req)) {
    throw AppError.forbidden('Jeton CSRF manquant ou invalide');
  }
  return contact;
}

/**
 * Échange le jeton du lien contre une session, puis fait tourner le jeton :
 * le lien reçu par email cesse immédiatement d'être rejouable.
 */
publicProductionRouter.post(
  '/session',
  validateBody(z.object({ token: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const { token } = req.body as { token: string };
    const contact = await requireContactByAccessToken(token);
    await rotateAfterExchange(contact.id);
    issueProductionSession(res, { cid: contact.id, eid: contact.eventId });
    sendData(res, { ok: true });
  }),
);

publicProductionRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearProductionSession(res);
    sendData(res, { ok: true });
  }),
);

publicProductionRouter.get(
  '/space',
  asyncHandler(async (req, res) => {
    const contact = await resolveContact(req);
    sendData(res, await buildProductionSpace(contact));
  }),
);

const ReviewSchema = z.object({
  verdict: z.enum(['favorable', 'defavorable']),
  comment: z.string().max(2000).nullish(),
});

publicProductionRouter.post(
  '/requests/:requestId/review',
  validateBody(ReviewSchema),
  asyncHandler(async (req, res) => {
    const contact = await resolveContact(req);
    const body = req.body as z.infer<typeof ReviewSchema>;
    await submitProductionReview({
      contact,
      requestId: req.params.requestId!,
      verdict: body.verdict,
      comment: body.comment ?? null,
    });
    sendData(res, await buildProductionSpace(contact));
  }),
);
