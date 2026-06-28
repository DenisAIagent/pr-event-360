import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { journalistLogin } from '../../services/journalistAuthService';

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
