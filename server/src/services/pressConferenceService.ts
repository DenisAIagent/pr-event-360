import type {
  AccreditationType,
  PressConferenceRegistrationStatus,
} from '@pr-event-360/core';
import { decidePressConferenceRegistration } from '@pr-event-360/core';
import { withTransaction } from '../db/pool';
import { AppError } from '../http/AppError';
import type { Journalist, PressConference } from '../domain';
import {
  countConferenceOccupied,
  deletePressConference,
  findConferenceRegistration,
  findFirstWaitlisted,
  findPressConference,
  insertPressConference,
  listConferenceParticipants,
  listConferenceRegistrations,
  listPressConferences,
  registrationCounts,
  replaceConferenceParticipants,
  updatePressConference,
  upsertConferenceRegistration,
  type SavePressConferenceInput,
} from '../db/repositories/pressConferenceRepo';
import { findJournalistById } from '../db/repositories/journalistRepo';
import { getEventOrThrow } from './eventService';
import { sendNotification } from './notifications/notificationService';
import { TRIGGERS } from './notifications/templates';
import { loadEnv } from '../config/env';
import type { Queryable } from '../db/types';

export interface SaveConferenceInput extends SavePressConferenceInput {
  participantIds: string[];
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function validateDates(input: SaveConferenceInput): void {
  const starts = Date.parse(input.startsAt);
  const ends = input.endsAt ? Date.parse(input.endsAt) : null;
  if (!Number.isFinite(starts)) throw AppError.badRequest('Date de début invalide');
  if (ends != null && (!Number.isFinite(ends) || ends <= starts)) {
    throw AppError.badRequest('La fin doit être postérieure au début');
  }
  if (input.embargoUntil && !Number.isFinite(Date.parse(input.embargoUntil))) {
    throw AppError.badRequest("Date d'embargo invalide");
  }
}

export async function createPressConference(eventId: string, input: SaveConferenceInput) {
  validateDates(input);
  const participantIds = uniqueIds(input.participantIds);
  const conference = await withTransaction(async (db) => {
    const created = await insertPressConference(eventId, input, db);
    const inserted = await replaceConferenceParticipants(created.id, eventId, participantIds, db);
    if (inserted !== participantIds.length) throw AppError.badRequest('Un participant ne fait pas partie de cet événement');
    return created;
  });
  return enrichConference(conference);
}

export async function editPressConference(eventId: string, id: string, input: SaveConferenceInput) {
  validateDates(input);
  const participantIds = uniqueIds(input.participantIds);
  const conference = await withTransaction(async (db) => {
    const updated = await updatePressConference(id, eventId, input, db);
    if (!updated) throw AppError.notFound('Conférence de presse introuvable');
    const inserted = await replaceConferenceParticipants(id, eventId, participantIds, db);
    if (inserted !== participantIds.length) throw AppError.badRequest('Un participant ne fait pas partie de cet événement');
    return updated;
  });
  return enrichConference(conference);
}

export async function removePressConference(eventId: string, id: string): Promise<void> {
  const deleted = await deletePressConference(id, eventId);
  if (!deleted) throw AppError.notFound('Conférence de presse introuvable');
}

export async function enrichConference(conference: PressConference) {
  const [participants, counts] = await Promise.all([
    listConferenceParticipants(conference.id),
    registrationCounts(conference.id),
  ]);
  const occupied = counts.registered + counts.checked_in;
  return {
    ...conference,
    participants,
    counts,
    occupied,
    available: conference.capacity == null ? null : Math.max(0, conference.capacity - occupied),
  };
}

export async function listPressConferencesAdmin(eventId: string) {
  return Promise.all((await listPressConferences(eventId)).map(enrichConference));
}

export async function listPressConferencesForPreview(eventId: string) {
  const conferences = await listPressConferencesAdmin(eventId);
  return conferences
    .filter((conference) => conference.status !== 'draft' && conference.registrationMode !== 'invite_only')
    .map((conference) => ({ ...conference, registrationStatus: null, eligible: true }));
}

export async function getConferenceRegistrationsAdmin(eventId: string, conferenceId: string) {
  if (!(await findPressConference(conferenceId, eventId))) throw AppError.notFound('Conférence de presse introuvable');
  return listConferenceRegistrations(conferenceId, eventId);
}

function journalistType(journalist: Journalist): AccreditationType {
  return journalist.accreditationType ?? 'presse';
}

function assertEligible(conference: PressConference, journalist: Journalist): void {
  if (journalist.eventId !== conference.eventId || journalist.accStatus !== 'acceptee') {
    throw AppError.forbidden('Accréditation acceptée requise');
  }
  if (!conference.allowedAccreditationTypes.includes(journalistType(journalist))) {
    throw AppError.forbidden("Votre type d'accréditation n'est pas éligible à cette conférence");
  }
}

export async function listPressConferencesForJournalist(journalist: Journalist) {
  const conferences = await listPressConferences(journalist.eventId);
  const visible = await Promise.all(
    conferences
      .filter((conference) => conference.status !== 'draft')
      .map(async (conference) => {
        const registration = await findConferenceRegistration(conference.id, journalist.id);
        if (conference.registrationMode === 'invite_only' && !registration) return null;
        const enriched = await enrichConference(conference);
        return {
          ...enriched,
          registrationStatus: registration?.status ?? null,
          eligible: conference.allowedAccreditationTypes.includes(journalistType(journalist)),
        };
      }),
  );
  return visible.filter((conference) => conference != null);
}

async function decideRegistrationStatus(
  conference: PressConference,
  journalist: Journalist,
  existingStatus: PressConferenceRegistrationStatus | null,
  db: Queryable,
): Promise<PressConferenceRegistrationStatus> {
  assertEligible(conference, journalist);
  if (conference.status !== 'published') throw AppError.conflict('Les inscriptions ne sont pas ouvertes');
  if (Date.parse(conference.startsAt) <= Date.now()) throw AppError.conflict('Cette conférence a déjà commencé');
  const occupied = await countConferenceOccupied(conference.id, db);
  const decision = decidePressConferenceRegistration({
    registrationMode: conference.registrationMode,
    capacity: conference.capacity,
    occupied,
    existingStatus,
  });
  if (!decision.allowed) throw AppError.forbidden('Cette conférence est accessible uniquement sur invitation');
  return decision.status;
}

export async function registerJournalistForConference(journalist: Journalist, conferenceId: string) {
  const result = await withTransaction(async (db) => {
    const conference = await findPressConference(conferenceId, journalist.eventId, db, true);
    if (!conference) throw AppError.notFound('Conférence de presse introuvable');
    const existing = await findConferenceRegistration(conferenceId, journalist.id, db);
    const status = await decideRegistrationStatus(conference, journalist, existing?.status ?? null, db);
    const registration = await upsertConferenceRegistration(conferenceId, journalist.id, status, db);
    return { conference, registration, changed: existing?.status !== registration.status };
  });
  if (result.changed) await notifyRegistration(journalist, result.conference, result.registration.status);
  return { ...result.registration, conference: await enrichConference(result.conference) };
}

async function promoteWaitlisted(conference: PressConference, db: Queryable) {
  const occupied = await countConferenceOccupied(conference.id, db);
  if (conference.capacity != null && occupied >= conference.capacity) return null;
  const next = await findFirstWaitlisted(conference.id, db);
  if (!next) return null;
  await upsertConferenceRegistration(conference.id, next.journalistId, 'registered', db);
  return next.journalistId;
}

export async function cancelConferenceRegistration(journalist: Journalist, conferenceId: string) {
  const promotedId = await withTransaction(async (db) => {
    const conference = await findPressConference(conferenceId, journalist.eventId, db, true);
    if (!conference) throw AppError.notFound('Conférence de presse introuvable');
    const existing = await findConferenceRegistration(conferenceId, journalist.id, db);
    if (!existing) throw AppError.notFound('Inscription introuvable');
    const freed = existing.status === 'registered' || existing.status === 'checked_in';
    const status: PressConferenceRegistrationStatus = existing.status === 'invited' ? 'declined' : 'cancelled';
    await upsertConferenceRegistration(conferenceId, journalist.id, status, db);
    return freed ? promoteWaitlisted(conference, db) : null;
  });
  if (promotedId) await notifyPromotion(promotedId, conferenceId, journalist.eventId);
}

export async function inviteJournalists(eventId: string, conferenceId: string, journalistIds: string[]) {
  const ids = uniqueIds(journalistIds);
  const conference = await findPressConference(conferenceId, eventId);
  if (!conference) throw AppError.notFound('Conférence de presse introuvable');
  if (conference.status === 'draft') throw AppError.conflict('Publiez la conférence avant d’envoyer des invitations');
  const invited: Journalist[] = [];
  await withTransaction(async (db) => {
    for (const id of ids) {
      const journalist = await findJournalistById(id, db);
      if (!journalist || journalist.eventId !== eventId || journalist.accStatus !== 'acceptee') {
        throw AppError.badRequest('Un journaliste sélectionné ne possède pas une accréditation acceptée');
      }
      assertEligible(conference, journalist);
      const existing = await findConferenceRegistration(conferenceId, id, db);
      if (!existing || ['declined', 'cancelled'].includes(existing.status)) {
        await upsertConferenceRegistration(conferenceId, id, 'invited', db);
        invited.push(journalist);
      }
    }
  });
  const event = await getEventOrThrow(eventId);
  const link = `${loadEnv().CLIENT_URL}/evenement/${eventId}/connexion`;
  await Promise.all(invited.map((journalist) => sendNotification({
    eventId,
    eventName: event.name,
    journalist,
    triggerKey: TRIGGERS.PRESS_CONFERENCE_INVITATION,
    variables: { conference: conference.title, date: formatConferenceDate(conference, journalist.lang), link },
  })));
  return { invited: invited.length };
}

export async function setConferenceRegistrationStatus(
  eventId: string,
  conferenceId: string,
  journalistId: string,
  requestedStatus: PressConferenceRegistrationStatus,
) {
  let promotedId: string | null = null;
  const result = await withTransaction(async (db) => {
    const conference = await findPressConference(conferenceId, eventId, db, true);
    if (!conference) throw AppError.notFound('Conférence de presse introuvable');
    const journalist = await findJournalistById(journalistId, db);
    if (!journalist || journalist.eventId !== eventId) throw AppError.notFound('Journaliste introuvable');
    const existing = await findConferenceRegistration(conferenceId, journalistId, db);
    const wasOccupied = existing?.status === 'registered' || existing?.status === 'checked_in';
    let status = requestedStatus;
    if (status === 'registered') {
      const occupied = await countConferenceOccupied(conferenceId, db);
      if (conference.capacity != null && occupied >= conference.capacity && !wasOccupied) status = 'waitlisted';
    }
    const saved = await upsertConferenceRegistration(conferenceId, journalistId, status, db);
    if (wasOccupied && status !== 'registered' && status !== 'checked_in') {
      promotedId = await promoteWaitlisted(conference, db);
    }
    return { conference, journalist, saved };
  });
  if (result.saved.status === 'registered') await notifyRegistration(result.journalist, result.conference, 'registered');
  if (promotedId) await notifyPromotion(promotedId, conferenceId, eventId);
  return result.saved;
}

function formatConferenceDate(conference: PressConference, lang: string): string {
  return new Date(conference.startsAt).toLocaleString(lang, { dateStyle: 'long', timeStyle: 'short' });
}

async function notifyRegistration(
  journalist: Journalist,
  conference: PressConference,
  status: PressConferenceRegistrationStatus,
) {
  if (!['registered', 'pending', 'waitlisted'].includes(status)) return;
  const event = await getEventOrThrow(conference.eventId);
  const triggerKey = status === 'registered'
    ? TRIGGERS.PRESS_CONFERENCE_REGISTERED
    : status === 'pending'
      ? TRIGGERS.PRESS_CONFERENCE_PENDING
      : TRIGGERS.PRESS_CONFERENCE_WAITLISTED;
  await sendNotification({
    eventId: event.id,
    eventName: event.name,
    journalist,
    triggerKey,
    variables: { conference: conference.title, date: formatConferenceDate(conference, journalist.lang) },
  });
}

async function notifyPromotion(journalistId: string, conferenceId: string, eventId: string) {
  const [journalist, conference] = await Promise.all([
    findJournalistById(journalistId),
    findPressConference(conferenceId, eventId),
  ]);
  if (!journalist || !conference) return;
  await notifyRegistration(journalist, conference, 'registered');
}
