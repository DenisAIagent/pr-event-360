import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { isBillingEnabled, priceLabel, startCheckout, type CheckoutInput } from '../../services/billingService';

export const billingRouter = Router();

const limiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true });

// Config publique : le client sait s'il peut proposer l'abonnement + le prix affiché.
billingRouter.get(
  '/config',
  asyncHandler(async (_req, res) => {
    sendData(res, { billingEnabled: isBillingEnabled(), priceLabel: priceLabel() });
  }),
);

// Démarre le paiement (email + mot de passe OU Google) → renvoie l'URL Stripe Checkout.
const CheckoutSchema = z.union([
  z.object({
    orgName: z.string().min(1).max(120),
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
  }),
  z.object({
    orgName: z.string().min(1).max(120),
    googleCredential: z.string().min(1),
  }),
]);
billingRouter.post(
  '/checkout',
  limiter,
  validateBody(CheckoutSchema),
  asyncHandler(async (req, res) => {
    sendData(res, await startCheckout(req.body as CheckoutInput));
  }),
);
