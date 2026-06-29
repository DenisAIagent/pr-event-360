import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { login, completeMfaLogin, registerUser } from '../../services/authService';
import { startMfaSetup, confirmMfa, disableMfa, getMfaStatus } from '../../services/mfaService';
import { requestPasswordReset, resetPassword } from '../../services/passwordResetService';
import { acceptInvitation, getInvitationByToken } from '../../services/invitationService';
import { googleClientId, isGoogleEnabled, loginWithGoogle } from '../../services/googleAuthService';
import { getOrgInvite, acceptOrgInvite } from '../../services/orgInviteService';

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

// ── Double authentification (TOTP) ──────────────────────────────────
const MfaCodeSchema = z.object({ code: z.string().min(6).max(8) });
const mfaLoginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true });

// 2e étape du login : challenge (issu de /login) + code TOTP → jeton de session.
authRouter.post(
  '/login/mfa',
  mfaLoginLimiter,
  validateBody(z.object({ challenge: z.string().min(1), code: z.string().min(6).max(8) })),
  asyncHandler(async (req, res) => {
    const { challenge, code } = req.body as { challenge: string; code: string };
    sendData(res, await completeMfaLogin(challenge, code));
  }),
);

// État MFA du compte connecté.
authRouter.get(
  '/mfa/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    sendData(res, await getMfaStatus(req.user!.sub));
  }),
);

// Démarre l'enrôlement : renvoie le QR code à scanner.
authRouter.post(
  '/mfa/setup',
  requireAuth,
  asyncHandler(async (req, res) => {
    sendData(res, await startMfaSetup(req.user!.sub, req.user!.email));
  }),
);

// Active la MFA après vérification d'un premier code.
authRouter.post(
  '/mfa/enable',
  requireAuth,
  validateBody(MfaCodeSchema),
  asyncHandler(async (req, res) => {
    await confirmMfa(req.user!.sub, (req.body as { code: string }).code);
    sendData(res, { enabled: true });
  }),
);

// Désactive la MFA (exige un code valide).
authRouter.post(
  '/mfa/disable',
  requireAuth,
  validateBody(MfaCodeSchema),
  asyncHandler(async (req, res) => {
    await disableMfa(req.user!.sub, (req.body as { code: string }).code);
    sendData(res, { enabled: false });
  }),
);

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum'),
  fullName: z.string().min(1),
  role: z.enum(['attache', 'assistant']).optional(),
});

// Création de comptes réservée à un utilisateur déjà authentifié, dans SON organisation.
authRouter.post(
  '/register',
  requireAuth,
  validateBody(RegisterSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof RegisterSchema>;
    const user = await registerUser({ ...body, organizationId: req.user!.organizationId });
    sendData(res, user, 201);
  }),
);

// Config publique d'auth : indique au client si « Continuer avec Google » est disponible.
authRouter.get(
  '/config',
  asyncHandler(async (_req, res) => {
    sendData(res, { googleEnabled: isGoogleEnabled(), googleClientId: googleClientId() });
  }),
);

// Invitation à s'inscrire (super-admin) : l'invité crée lui-même son organisation, sans paiement.
authRouter.get(
  '/org-invite',
  resetLimiter,
  asyncHandler(async (req, res) => {
    sendData(res, await getOrgInvite(String(req.query.token ?? '')));
  }),
);
const OrgInviteAcceptSchema = z.object({
  token: z.string().min(1),
  orgName: z.string().min(1).max(120),
  fullName: z.string().optional(),
  password: z.string().optional(),
  googleCredential: z.string().optional(),
});
authRouter.post(
  '/org-invite/accept',
  resetLimiter,
  validateBody(OrgInviteAcceptSchema),
  asyncHandler(async (req, res) => {
    const { token, ...body } = req.body as z.infer<typeof OrgInviteAcceptSchema>;
    sendData(res, await acceptOrgInvite(token, body), 201);
  }),
);

// CONNEXION via Google (réservée aux comptes inscrits) : le client envoie l'ID token Google.
// Un compte inconnu renvoie { needsSignup: true } — aucune création ici (passe par l'abonnement).
const GoogleLoginSchema = z.object({ credential: z.string().min(1) });
authRouter.post(
  '/google',
  resetLimiter,
  validateBody(GoogleLoginSchema),
  asyncHandler(async (req, res) => {
    const { credential } = req.body as z.infer<typeof GoogleLoginSchema>;
    sendData(res, await loginWithGoogle(credential));
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
