import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import {
  journalistLogin,
  requestJournalistPasswordReset,
  resetJournalistPassword,
} from '../../services/journalistAuthService';

export const publicJournalistAuthRouter = Router();

const LoginSchema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Login journaliste par email + mot de passe (compte par événement). Renvoie le token
 * d'espace : le client redirige ensuite vers /espace/:token.
 */
publicJournalistAuthRouter.post(
  '/login',
  validateBody(LoginSchema),
  asyncHandler(async (req, res) => {
    const { eventId, email, password } = req.body as z.infer<typeof LoginSchema>;
    const result = await journalistLogin(eventId, email, password);
    sendData(res, result);
  }),
);

const ForgotSchema = z.object({ eventId: z.string().uuid(), email: z.string().email() });

/** Demande de réinitialisation : réponse générique (anti-énumération). */
publicJournalistAuthRouter.post(
  '/forgot-password',
  validateBody(ForgotSchema),
  asyncHandler(async (req, res) => {
    const { eventId, email } = req.body as z.infer<typeof ForgotSchema>;
    await requestJournalistPasswordReset(eventId, email);
    sendData(res, { ok: true });
  }),
);

const ResetSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

/** Consomme le jeton reçu par email et pose le nouveau mot de passe. */
publicJournalistAuthRouter.post(
  '/reset-password',
  validateBody(ResetSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as z.infer<typeof ResetSchema>;
    await resetJournalistPassword(token, password);
    sendData(res, { ok: true });
  }),
);
