import argon2 from 'argon2';
import type { UserRole } from '@pr-event-360/core';
import { loadEnv } from '../config/env';
import { AppError } from '../http/AppError';
import { withTransaction } from '../db/pool';
import { generateResetToken as generateToken, hashResetToken as hashToken } from '../lib/token';
import {
  createInvitation,
  deletePendingInvitationsForEmail,
  findInvitationById,
  findValidInvitationByHash,
  markInvitationAccepted,
  type Invitation,
} from '../db/repositories/invitationRepo';
import { createUser, findUserByEmail } from '../db/repositories/userRepo';
import { addEventMember, findEventById } from '../db/repositories/eventRepo';
import { getEmailProvider } from './notifications/providers';
import type { User } from '../domain';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

export interface InviteInput {
  organizationId: string;
  email: string;
  role: UserRole;
  eventIds: string[];
  invitedBy: string;
}

/**
 * Crée une invitation et envoie le lien d'activation par email. Refuse si un compte
 * existe déjà pour cet email. Les événements assignés DOIVENT appartenir à l'organisation
 * de l'invitant (sinon fuite inter-organisations via event_members).
 */
export async function inviteCollaborator(input: InviteInput): Promise<Invitation> {
  const email = input.email.toLowerCase();

  const existing = await findUserByEmail(email);
  if (existing) throw AppError.conflict('Un compte existe déjà avec cet email');

  // Garde-fou multi-locataire : chaque événement assigné doit être dans l'organisation.
  for (const eventId of input.eventIds) {
    const ev = await findEventById(eventId);
    if (!ev || ev.organizationId !== input.organizationId) {
      throw AppError.badRequest('Événement invalide pour cette organisation');
    }
  }

  // Une seule invitation active à la fois pour un email donné.
  await deletePendingInvitationsForEmail(email);

  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const invitation = await createInvitation({
    organizationId: input.organizationId,
    email,
    role: input.role,
    eventIds: input.eventIds,
    tokenHash: hashToken(rawToken),
    invitedBy: input.invitedBy,
    expiresAt,
  });

  await deliverInvite(email, rawToken);
  return invitation;
}

/**
 * Renvoie une invitation : régénère un jeton frais (l'ancien lien devient caduc) et
 * renvoie l'email. Le jeton brut n'étant jamais stocké, on ne peut pas « ré-envoyer
 * le même lien » — on en émet un nouveau, ce qui est aussi plus sûr.
 */
export async function resendInvitation(
  invitationId: string,
  invitedBy: string,
  organizationId: string,
): Promise<Invitation> {
  const inv = await findInvitationById(invitationId);
  if (!inv || inv.organizationId !== organizationId) throw AppError.notFound('Invitation introuvable.');
  if (inv.acceptedAt) throw AppError.conflict('Cette invitation a déjà été acceptée.');
  return inviteCollaborator({
    organizationId: inv.organizationId,
    email: inv.email,
    role: inv.role,
    eventIds: inv.eventIds,
    invitedBy,
  });
}

/** Récupère une invitation valide pour pré-remplir la page d'acceptation. */
export async function getInvitationByToken(rawToken: string): Promise<Invitation> {
  const invitation = await findValidInvitationByHash(hashToken(rawToken));
  if (!invitation) throw AppError.badRequest('Invitation invalide ou expirée');
  return invitation;
}

/**
 * Accepte une invitation : crée le compte (mot de passe choisi par le collaborateur),
 * l'assigne aux événements prévus, et marque l'invitation comme consommée. Atomique.
 */
export async function acceptInvitation(
  rawToken: string,
  fullName: string,
  password: string,
): Promise<User> {
  return withTransaction(async (db) => {
    const invitation = await findValidInvitationByHash(hashToken(rawToken), db);
    if (!invitation) throw AppError.badRequest('Invitation invalide ou expirée');

    const already = await findUserByEmail(invitation.email, db);
    if (already) throw AppError.conflict('Un compte existe déjà avec cet email');

    const passwordHash = await argon2.hash(password);
    const user = await createUser(
      {
        email: invitation.email,
        passwordHash,
        fullName,
        role: invitation.role,
        organizationId: invitation.organizationId,
      },
      db,
    );

    for (const eventId of invitation.eventIds) {
      await addEventMember(eventId, user.id, db);
    }

    await markInvitationAccepted(invitation.id, db);
    return user;
  });
}

/** Envoie le lien d'activation (ou le journalise en mode simulation). */
async function deliverInvite(toEmail: string, rawToken: string): Promise<void> {
  const env = loadEnv();
  const acceptUrl = `${env.CLIENT_URL}/admin/accept-invite?token=${encodeURIComponent(rawToken)}`;

  const subject = 'Invitation à rejoindre PR Event 360';
  const body = [
    'Bonjour,',
    '',
    "Vous avez été invité(e) à rejoindre l'équipe back-office de PR Event 360.",
    'Cliquez sur le lien ci-dessous (valable 7 jours) pour créer votre compte :',
    '',
    acceptUrl,
    '',
    "Si vous ne vous attendiez pas à cette invitation, ignorez simplement cet email.",
  ].join('\n');

  const result = await (await getEmailProvider()).send({ to: toEmail, subject, body });
  if (result.status === 'simulated') {
    console.info(`[invitation][simulation] lien pour ${toEmail} : ${acceptUrl}`);
  } else if (result.status === 'failed') {
    console.error(`[invitation] échec d'envoi à ${toEmail} via ${result.provider}: ${result.error ?? ''}`);
  }
}
