import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { login, registerUser } from '../../services/authService';
import { requestPasswordReset, resetPassword } from '../../services/passwordResetService';
import { acceptInvitation, getInvitationByToken } from '../../services/invitationService';

export const authRouter = Router();

// Limite de débit sur la réinitialisation de mot de passe (surface publique) :
// anti force brute sur les jetons et anti-énumération des comptes.
const resetLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true });

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  validateBody(LoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof LoginSchema>;
    const result = await login(email, password);
    sendData(res, result);
  }),
);

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
  fullName: z.string().min(1),
  role: z.enum(['attache', 'assistant']).optional(),
});

// Création de comptes réservée à un utilisateur déjà authentifié (le 1er compte
// est créé via le script de seed). Évite l'auto-enrôlement non contrôlé.
authRouter.post(
  '/register',
  requireAuth,
  validateBody(RegisterSchema),
  asyncHandler(async (req, res) => {
    const user = await registerUser(req.body as z.infer<typeof RegisterSchema>);
    sendData(res, user, 201);
  }),
);

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

// Demande de réinitialisation. Réponse TOUJOURS générique (succès), que le compte
// existe ou non, pour ne pas révéler les emails enregistrés.
authRouter.post(
  '/forgot-password',
  resetLimiter,
  validateBody(ForgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof ForgotPasswordSchema>;
    await requestPasswordReset(email);
    sendData(res, {
      message: 'Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé.',
    });
  }),
);

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
});

// Consomme le jeton et définit le nouveau mot de passe (usage unique).
authRouter.post(
  '/reset-password',
  resetLimiter,
  validateBody(ResetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body as z.infer<typeof ResetPasswordSchema>;
    await resetPassword(token, password);
    sendData(res, { message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  }),
);

// ── Invitations (acceptation publique via lien tokenisé) ────────────
// Pré-remplissage de la page d'acceptation : renvoie l'email/rôle de l'invitation.
authRouter.get(
  '/invite',
  resetLimiter,
  asyncHandler(async (req, res) => {
    const token = z.string().min(1).parse(req.query.token);
    const invitation = await getInvitationByToken(token);
    sendData(res, { email: invitation.email, role: invitation.role });
  }),
);

const AcceptInviteSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1, 'Nom requis'),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
});
authRouter.post(
  '/accept-invite',
  resetLimiter,
  validateBody(AcceptInviteSchema),
  asyncHandler(async (req, res) => {
    const { token, fullName, password } = req.body as z.infer<typeof AcceptInviteSchema>;
    await acceptInvitation(token, fullName, password);
    sendData(res, { message: 'Compte créé. Vous pouvez vous connecter.' }, 201);
  }),
);
