import type { AccreditationType, Lang } from '@pr-event-360/core';
import { withTransaction } from '../db/pool';
import { AppError } from '../http/AppError';
import { loadEnv } from '../config/env';
import { generateJournalistToken } from '../lib/token';
import { getEventOrThrow, isRegistrationClosed } from './eventService';
import { findMediaType } from '../db/repositories/eventRepo';
import {
  existsJournalistByEventEmail,
  findJournalistById,
  insertJournalist,
  listJournalistsByEvent,
  updateAccreditation,
} from '../db/repositories/journalistRepo';
import { sendNotification } from './notifications/notificationService';
import { TRIGGERS } from './notifications/templates';
import type { Journalist } from '../domain';

const env = loadEnv();

export interface SubmitAccreditationInput {
  eventId: string;
  firstName: string;
  lastName?: string | null;
  email: string;
  phone?: string | null;
  media?: string | null;
  mediaTypeId?: string | null;
  audience?: string | null;
  prevArticle?: string | null;
  lang: Lang;
  accreditationType?: AccreditationType | null;
  commitPublish: boolean;
  publishDelayDays?: number;
  consent: boolean;
}

/**
 * Soumission publique d'accréditation. Crée le journaliste (« Pas encore traité »)
 * et envoie l'email de réception. La langue doit être active pour l'événement.
 */
export async function submitAccreditation(input: SubmitAccreditationInput): Promise<Journalist> {
  const event = await getEventOrThrow(input.eventId);
  if (isRegistrationClosed(event, Date.now())) {
    throw AppError.badRequest('Les inscriptions pour cet événement sont closes.');
  }
  if (!event.languages.includes(input.lang)) {
    throw AppError.badRequest(`Langue non disponible pour cet événement : ${input.lang}`);
  }
  if (input.mediaTypeId) {
    const mt = await findMediaType(input.mediaTypeId, input.eventId);
    if (!mt) throw AppError.badRequest('Type de média inconnu pour cet événement');
  }
  // Anti-doublon : une seule demande par email et par événement. Le pré-contrôle
  // couvre le cas courant ; l'index unique (event_id, lower(email)) tranche la course
  // entre deux soumissions concurrentes — on retraduit la violation 23505 en 400.
  if (await existsJournalistByEventEmail(input.eventId, input.email)) {
    throw AppError.badRequest('Une demande d’accréditation existe déjà pour cet email sur cet événement.');
  }

  let journalist: Journalist;
  try {
    journalist = await withTransaction((db) => insertJournalist({ ...input }, db));
  } catch (e) {
    if (e instanceof Error && 'code' in e && (e as { code?: string }).code === '23505') {
      throw AppError.badRequest('Une demande d’accréditation existe déjà pour cet email sur cet événement.');
    }
    throw e;
  }

  // Envoi HORS transaction (I/O réseau en mode live) : accusé de réception.
  await sendNotification({
    eventId: event.id,
    eventName: event.name,
    journalist,
    triggerKey: TRIGGERS.ACCREDITATION_RECEIVED,
  });

  return journalist;
}

export async function listAccreditations(eventId: string): Promise<Journalist[]> {
  return listJournalistsByEvent(eventId);
}

/**
 * Traitement back-office de l'accréditation.
 *  - « accept » : génère un token unique, passe à « acceptée », email avec lien.
 *  - « reject » : passe à « refusée », email de refus.
 * Statut + notification sont écrits de façon atomique.
 */
export async function processAccreditation(
  eventId: string,
  journalistId: string,
  action: 'accept' | 'reject',
): Promise<Journalist> {
  const event = await getEventOrThrow(eventId);
  const journalist = await findJournalistById(journalistId);
  if (!journalist || journalist.eventId !== eventId) {
    throw AppError.notFound('Journaliste introuvable pour cet événement');
  }

  if (action === 'accept') {
    const token = journalist.token ?? generateJournalistToken();
    const updated = await withTransaction((db) =>
      updateAccreditation(journalistId, 'acceptee', token, db),
    );
    if (!updated) throw AppError.notFound('Journaliste introuvable');

    const link = `${env.CLIENT_URL}/espace/${updated.token}`;
    const base = {
      eventId: event.id,
      eventName: event.name,
      journalist: updated,
      triggerKey: TRIGGERS.ACCREDITATION_ACCEPTED,
      variables: { link },
    } as const;
    // Email + SMS urgent à l'acceptation (le SMS ne part que si un téléphone existe).
    await sendNotification(base);
    await sendNotification({ ...base, channel: 'sms' });
    return updated;
  }

  const updated = await withTransaction((db) =>
    updateAccreditation(journalistId, 'refusee', null, db),
  );
  if (!updated) throw AppError.notFound('Journaliste introuvable');
  await sendNotification({
    eventId: event.id,
    eventName: event.name,
    journalist: updated,
    triggerKey: TRIGGERS.ACCREDITATION_REJECTED,
  });
  return updated;
}
