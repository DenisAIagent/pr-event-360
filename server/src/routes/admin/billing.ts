import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import {
  billingPublicConfig,
  getOrgBillingStatus,
  isBillingEnabled,
  startCheckout,
  startOrgPurchase,
  type SignupCheckoutInput,
} from '../../services/billingService';
import { sharedStoreOrUndefined } from '../../lib/rateLimitStore';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ALL_PLAN_IDS } from '@pr-event-360/core';

export const billingRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  store: sharedStoreOrUndefined(),
});

// Catalogue public (offres + état checkout).
billingRouter.get(
  '/config',
  asyncHandler(async (_req, res) => {
    sendData(res, await billingPublicConfig());
  }),
);

// Démarre l'inscription payante multi-offre.
const CheckoutSchema = z.union([
  z.object({
    planId: z.enum(ALL_PLAN_IDS).default('event'),
    orgName: z.string().min(1).max(120),
    fullName: z.string().min(1),
    email: z.string().email(),
  }),
  z.object({
    planId: z.enum(ALL_PLAN_IDS).default('event'),
    orgName: z.string().min(1).max(120),
    googleCredential: z.string().min(1),
  }),
]);
billingRouter.post(
  '/checkout',
  limiter,
  validateBody(CheckoutSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof CheckoutSchema>;
    // Filtre les plans signup (pas media_plus / agency_extra / quote).
    const planId = body.planId === 'event' || body.planId === 'pack3' || body.planId === 'agency'
      ? body.planId
      : 'event';
    sendData(res, await startCheckout({ ...body, planId } as SignupCheckoutInput));
  }),
);

// ── Compte connecté ────────────────────────────────────────────────
billingRouter.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    sendData(res, await getOrgBillingStatus(req.user!.organizationId));
  }),
);

const PurchaseSchema = z.object({
  planId: z.enum(['event', 'pack3', 'agency', 'agency_extra', 'media_plus']),
  eventId: z.string().uuid().optional(),
});
billingRouter.post(
  '/purchase',
  requireAuth,
  requireRole('admin'),
  limiter,
  validateBody(PurchaseSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof PurchaseSchema>;
    if (!(await isBillingEnabled())) {
      sendData(res, {
        billingEnabled: false,
        message: 'Paiement en ligne non configuré. Contactez le support pour un devis.',
      });
      return;
    }
    sendData(
      res,
      await startOrgPurchase({
        organizationId: req.user!.organizationId,
        planId: body.planId,
        eventId: body.eventId,
        customerEmail: req.user!.email,
      }),
    );
  }),
);
