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
import { exchangeAccessToken, requestAccessLink } from '../../services/journalistAccessService';
import { issueJournalistSession, clearJournalistSession } from '../../lib/journalistSession';

export const publicJournalistAuthRouter = Router();

const LoginSchema = z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Login journaliste par email + mot de passe (compte par événement). Pose le cookie
 * de session d'espace ; le client va ensuite sur /espace (sans token dans l'URL).
 */
publicJournalistAuthRouter.post(
  '/login',
  validateBody(LoginSchema),
  asyncHandler(async (req, res) => {
    const { eventId, email, password } = req.body as z.infer<typeof LoginSchema>;
    const { firstName, ...claims } = await journalistLogin(eventId, email, password);
    issueJournalistSession(res, claims);
    sendData(res, { firstName });
  }),
);

const AccessSchema = z.object({ token: z.string().min(1) });

/**
 * Échange un lien d'accès (jeton brut court, comparé par hash) contre une session
 * d'espace. Le token ne transite qu'à l'ouverture du lien ; ensuite tout passe par
 * le cookie httpOnly.
 */
publicJournalistAuthRouter.post(
  '/access',
  validateBody(AccessSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body as z.infer<typeof AccessSchema>;
    const claims = await exchangeAccessToken(token);
    issueJournalistSession(res, claims);
    sendData(res, { ok: true });
  }),
);

/** Déconnexion de l'espace : efface les cookies de session. */
publicJournalistAuthRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    clearJournalistSession(res);
    sendData(res, { ok: true });
  }),
);

const RequestLinkSchema = z.object({ eventId: z.string().uuid(), email: z.string().email() });

/** Renvoie un lien d'accès par email (parcours sans mot de passe / lien expiré). Réponse générique. */
publicJournalistAuthRouter.post(
  '/request-link',
  validateBody(RequestLinkSchema),
  asyncHandler(async (req, res) => {
    const { eventId, email } = req.body as z.infer<typeof RequestLinkSchema>;
    await requestAccessLink(eventId, email);
    sendData(res, { ok: true });
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
