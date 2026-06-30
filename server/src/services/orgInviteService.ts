import argon2 from 'argon2';
import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { generateResetToken, hashResetToken } from '../lib/token';
import {
  createOrgInvite,
  deleteOrgInvitesForEmail,
  findValidOrgInviteByHash,
  markOrgInviteAccepted,
} from '../db/repositories/orgInviteRepo';
import { findUserByEmail } from '../db/repositories/userRepo';
import { createOrgAndAdmin } from './orgService';
import { verifyGoogleCredential } from './googleAuthService';
import type { User } from '../domain';

const env = loadEnv();
const TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours

/**
 * Le super-admin invite un email à s'inscrire (accès offert). Renvoie un LIEN copiable
 * (à partager soi-même) ; l'organisation sera créée par l'invité à l'acceptation.
 */
export async function createOrgInviteLink(
  email: string,
  invitedBy: string,
): Promise<{ inviteUrl: string; email: string }> {
  const e = email.toLowerCase();
  if (await findUserByEmail(e)) throw AppError.conflict('Un compte existe déjà avec cet email.');
  await deleteOrgInvitesForEmail(e);
  const raw = generateResetToken();
  await createOrgInvite({ email: e, tokenHash: hashResetToken(raw), invitedBy, expiresAt: new Date(Date.now() + TTL_MS) });
  return { inviteUrl: `${env.PUBLIC_BASE_URL}/admin/inscription?invite=${raw}`, email: e };
}

/** Pré-remplissage de la page d'inscription invitée. */
export async function getOrgInvite(rawToken: string): Promise<{ email: string }> {
  const inv = await findValidOrgInviteByHash(hashResetToken(rawToken));
  if (!inv) throw AppError.badRequest('Invitation invalide ou expirée.');
  return { email: inv.email };
}

/** L'invité crée son organisation (mot de passe OU Google) — sans paiement. */
export async function acceptOrgInvite(
  rawToken: string,
  body: { orgName: string; fullName?: string; password?: string; googleCredential?: string },
): Promise<{ token: string; user: User }> {
  const inv = await findValidOrgInviteByHash(hashResetToken(rawToken));
  if (!inv) throw AppError.badRequest('Invitation invalide ou expirée.');

  let email: string;
  let fullName: string;
  let passwordHash: string | null = null;
  let googleId: string | null = null;
  let provider: 'password' | 'google';

  if (body.googleCredential) {
    const g = await verifyGoogleCredential(body.googleCredential);
    // L'invitation est nominative : le compte Google doit correspondre à l'adresse invitée
    // (sinon n'importe quel détenteur du lien pourrait réclamer l'organisation).
    if (g.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw AppError.forbidden("Le compte Google ne correspond pas à l'adresse invitée.");
    }
    email = g.email;
    fullName = g.name;
    googleId = g.googleId;
    provider = 'google';
  } else {
    if (!body.fullName || !body.password || body.password.length < 8) {
      throw AppError.badRequest('Nom complet et mot de passe (8 caractères min.) requis.');
    }
    email = inv.email;
    fullName = body.fullName;
    provider = 'password';
    passwordHash = await argon2.hash(body.password);
  }

  const result = await createOrgAndAdmin({ orgName: body.orgName, fullName, email, passwordHash, googleId, authProvider: provider });
  await markOrgInviteAccepted(inv.id);
  return result;
}
