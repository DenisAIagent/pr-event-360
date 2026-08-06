import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler } from '../../http/asyncHandler';
import { AppError } from '../../http/AppError';
import { sendData } from '../../http/respond';
import { validateBody } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';
import { issueSession, clearSession, csrfValid } from '../../lib/session';
import { login, completeMfaLogin, registerUser } from '../../services/authService';
import {
  authRateLimitKey,
  authRateLimitStoreOrUndefined,
} from '../../lib/rateLimitStore';
import { startMfaSetup, confirmMfa, disableMfa, getMfaStatus } from '../../services/mfaService';
import { mfaRequiredFor } from '../../lib/mfaPolicy';
import { requestPasswordReset, resetPassword } from '../../services/passwordResetService';
import { acceptInvitation, getInvitationByToken } from '../../services/invitationService';
import { googleClientId, isGoogleEnabled, loginWithGoogle } from '../../services/googleAuthService';
import { getOrgInvite, acceptOrgInvite } from '../../services/orgInviteService';
import { passwordSchema } from '../../lib/passwordPolicy';
import { findUserById } from '../../db/repositories/userRepo';

/** Si le résultat contient un jeton, ouvre la session (cookie httpOnly + CSRF) avant de répondre. */
function withSession<T extends object>(res: Response, result: T, status = 200): void {
  const token = (result as { token?: unknown }).token;
  if (typeof token === 'string') issueSession(res, token);
  if (typeof token === 'string') {
    const { token: _token, ...safeResult } = result as T & { token: string };
    sendData(res, safeResult, status);
    return;
  }
  sendData(res, result, status);
}

export const authRouter = Router();

const authStore = authRateLimitStoreOrUndefined();

// Limite de débit sur la réinitialisation de mot de passe (surface publique) :
// anti force brute sur les jetons et anti-énumération des comptes.
// Store auth fail-closed si Redis configuré (sinon MemoryStore local).
const resetLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  store: authStore,
  keyGenerator: (req: Request) =>
    authRateLimitKey('reset', req.ip, (req.body as { email?: unknown } | undefined)?.email),
});
// Anti force brute / credential-stuffing : clé IP + email normalisé.
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  store: authStore,
  keyGenerator: (req: Request) =>
    authRateLimitKey('login', req.ip, (req.body as { email?: unknown } | undefined)?.email),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  // Body parsé par express.json global : le keyGenerator lit email avant validateBody.
  loginLimiter,
  validateBody(LoginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof LoginSchema>;
    const result = await login(email, password);
    withSession(res, result); // ouvre la session si login direct (pas de MFA)
  }),
);

// Session courante (le front ne peut pas lire le cookie httpOnly) : hydrate l'UI au démarrage.
// Profil complet depuis la DB (pas seulement les claims JWT) pour ne jamais faire
// confiance au localStorage côté client.
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    let mfaSetupRequired = false;
    if (mfaRequiredFor(req.user!.role, req.user!.isPlatformAdmin)) {
      mfaSetupRequired = !(await getMfaStatus(req.user!.sub)).enabled;
    }
    const full = await findUserById(req.user!.sub);
    if (!full) throw AppError.unauthorized('Compte introuvable');
    // Conserve l'organizationId du contexte super-admin (switch org) si présent.
    const user = {
      ...full,
      organizationId: req.user!.organizationId,
    };
    sendData(res, { user, mfaSetupRequired });
  }),
);

// Déconnexion : efface les cookies de session + CSRF. Garde CSRF (double-submit)
// sans requireAuth : bloque le logout-CSRF forcé, mais laisse un compte suspendu ou
// une session expirée nettoyer ses cookies (pas de relecture des droits en base).
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    if (!csrfValid(req)) throw AppError.forbidden('Jeton CSRF manquant ou invalide');
    clearSession(res);
    sendData(res, { ok: true });
  }),
);

// ── Double authentification (TOTP) ──────────────────────────────────
const MfaCodeSchema = z.object({ code: z.string().min(6).max(8) });
const mfaLoginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  store: authStore,
  keyGenerator: (req: Request) => authRateLimitKey('mfa', req.ip, undefined),
});

// 2e étape du login : challenge (issu de /login) + code TOTP → jeton de session.
authRouter.post(
  '/login/mfa',
  mfaLoginLimiter,
  validateBody(z.object({ challenge: z.string().min(1), code: z.string().min(6).max(8) })),
  asyncHandler(async (req, res) => {
    const { challenge, code } = req.body as { challenge: string; code: string };
    withSession(res, await completeMfaLogin(challenge, code));
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
  validateBody(z.object({ currentCode: z.string().min(6).max(8).optional() })),
  asyncHandler(async (req, res) => {
    const { currentCode } = req.body as { currentCode?: string };
    sendData(res, await startMfaSetup(req.user!.sub, req.user!.email, currentCode));
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
  password: passwordSchema(),
  fullName: z.string().min(1),
  role: z.enum(['attache', 'assistant']).optional(),
});

// Création de comptes réservée à un utilisateur déjà authentifié, dans SON organisation.
authRouter.post(
  '/register',
  requireAuth,
  requireRole('admin'),
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
    withSession(res, await acceptOrgInvite(token, body), 201);
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
    // Résultat service = { token, user } (compte lié) OU { needsSignup }.
    // Le token est posé en cookie httpOnly par withSession, jamais renvoyé au JS.
    withSession(res, (await loginWithGoogle(credential)) as { token?: string });
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
  password: passwordSchema(),
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
  password: passwordSchema(),
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
