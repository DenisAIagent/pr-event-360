import QRCode from 'qrcode';
import { AppError } from '../http/AppError';
import { encodeCheckInCode, decodeCheckInCode } from '../lib/checkInCode';
import {
  clearJournalistCheckedIn,
  countCheckedInByEvent,
  findJournalistById,
  listJournalistsByEvent,
  setJournalistCheckedIn,
} from '../db/repositories/journalistRepo';
import { findEventById, getBranding } from '../db/repositories/eventRepo';
import { getQueue } from './queueService';
import { listPressConferences } from '../db/repositories/pressConferenceRepo';
import { setConferenceRegistrationStatus } from './pressConferenceService';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDay(iso: string | undefined): string {
  if (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return dayKey(new Date());
}

export interface DayOfSnapshot {
  event: {
    id: string;
    name: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  date: string;
  stats: {
    accredited: number;
    checkedIn: number;
    interviewsToday: number;
    conferencesToday: number;
  };
  interviews: Array<{
    id: string;
    journalistName: string;
    media: string | null;
    email: string;
    participant: string | null;
    slotStart: string | null;
    slotEnd: string | null;
    status: string;
    assignedTo: string | null;
  }>;
  conferences: Array<{
    id: string;
    title: string;
    startsAt: string;
    endsAt: string | null;
    venue: string | null;
    status: string;
  }>;
  arrivals: Array<{
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    media: string | null;
    accreditationType: string | null;
    checkedInAt: string | null;
  }>;
}

/** Vue opérationnelle Jour J pour un événement. */
export async function getDayOfSnapshot(eventId: string, dateIso?: string): Promise<DayOfSnapshot> {
  const event = await findEventById(eventId);
  if (!event) throw AppError.notFound('Événement introuvable');
  const date = parseDay(dateIso);

  const [journalists, queue, conferences, checkedInCount] = await Promise.all([
    listJournalistsByEvent(eventId),
    getQueue(eventId, { type: 'interview' }),
    listPressConferences(eventId),
    countCheckedInByEvent(eventId),
  ]);

  const accepted = journalists.filter((j) => j.accStatus === 'acceptee');

  const interviews = queue
    .filter((i) => i.subject.slotDay === date)
    .map((i) => ({
      id: i.id,
      journalistName: `${i.requester.firstName} ${i.requester.lastName ?? ''}`.trim(),
      media: i.requester.media,
      email: i.requester.email,
      participant: i.subject.artistName,
      slotStart: i.subject.slotStart,
      slotEnd: i.subject.slotEnd,
      status: i.status,
      assignedTo: i.assignedTo?.fullName ?? null,
    }))
    .sort((a, b) => (a.slotStart ?? '').localeCompare(b.slotStart ?? ''));

  const conferencesToday = conferences
    .filter((c) => c.status !== 'draft' && dayKey(new Date(c.startsAt)) === date)
    .map((c) => ({
      id: c.id,
      title: c.title,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      venue: c.venue,
      status: c.status,
    }))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const arrivals = accepted
    .map((j) => ({
      id: j.id,
      firstName: j.firstName,
      lastName: j.lastName,
      email: j.email,
      media: j.media,
      accreditationType: j.accreditationType,
      checkedInAt: j.checkedInAt,
    }))
    .sort((a, b) => {
      // Non check-in d'abord, puis par nom
      if (!!a.checkedInAt !== !!b.checkedInAt) return a.checkedInAt ? 1 : -1;
      return `${a.firstName}${a.lastName}`.localeCompare(`${b.firstName}${b.lastName}`, 'fr');
    });

  return {
    event: {
      id: event.id,
      name: event.name,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
    },
    date,
    stats: {
      accredited: accepted.length,
      checkedIn: checkedInCount,
      interviewsToday: interviews.length,
      conferencesToday: conferencesToday.length,
    },
    interviews,
    conferences: conferencesToday,
    arrivals,
  };
}

export interface CheckInResult {
  alreadyCheckedIn: boolean;
  journalist: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string;
    media: string | null;
    accreditationType: string | null;
    checkedInAt: string | null;
  };
}

/** Check-in d'arrivée par id ou code QR signé. */
export async function checkInArrival(
  eventId: string,
  input: { journalistId?: string; code?: string },
): Promise<CheckInResult> {
  let journalistId = input.journalistId;
  if (input.code) {
    const decoded = decodeCheckInCode(input.code);
    if (!decoded || decoded.eventId !== eventId) {
      throw AppError.badRequest('Code QR invalide pour cet événement');
    }
    journalistId = decoded.journalistId;
  }
  if (!journalistId) throw AppError.badRequest('journalistId ou code requis');

  const existing = await findJournalistById(journalistId);
  if (!existing || existing.eventId !== eventId) {
    throw AppError.notFound('Journaliste introuvable pour cet événement');
  }
  if (existing.accStatus !== 'acceptee') {
    throw AppError.conflict('Seules les accréditations acceptées peuvent être check-in');
  }

  const already = !!existing.checkedInAt;
  const updated = already
    ? existing
    : await setJournalistCheckedIn(eventId, journalistId);
  if (!updated) throw AppError.notFound('Journaliste introuvable');

  return {
    alreadyCheckedIn: already,
    journalist: {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      media: updated.media,
      accreditationType: updated.accreditationType,
      checkedInAt: updated.checkedInAt,
    },
  };
}

export async function undoCheckInArrival(eventId: string, journalistId: string): Promise<CheckInResult> {
  const updated = await clearJournalistCheckedIn(eventId, journalistId);
  if (!updated) throw AppError.notFound('Journaliste introuvable pour cet événement');
  return {
    alreadyCheckedIn: false,
    journalist: {
      id: updated.id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      media: updated.media,
      accreditationType: updated.accreditationType,
      checkedInAt: updated.checkedInAt,
    },
  };
}

/** Badge QR pour un journaliste accepté (admin ou espace). */
export async function buildJournalistBadge(eventId: string, journalistId: string) {
  const [event, journalist, branding] = await Promise.all([
    findEventById(eventId),
    findJournalistById(journalistId),
    getBranding(eventId),
  ]);
  if (!event) throw AppError.notFound('Événement introuvable');
  if (!journalist || journalist.eventId !== eventId) {
    throw AppError.notFound('Journaliste introuvable pour cet événement');
  }
  if (journalist.accStatus !== 'acceptee') {
    throw AppError.conflict('Badge disponible uniquement pour une accréditation acceptée');
  }

  const code = encodeCheckInCode(eventId, journalistId);
  const qrDataUrl = await QRCode.toDataURL(code, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 280,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  return {
    code,
    qrDataUrl,
    event: { id: event.id, name: event.name, location: event.location },
    branding: branding
      ? { logoUrl: branding.logoUrl, accentColor: branding.accentColor }
      : null,
    journalist: {
      id: journalist.id,
      firstName: journalist.firstName,
      lastName: journalist.lastName,
      email: journalist.email,
      media: journalist.media,
      accreditationType: journalist.accreditationType,
      checkedInAt: journalist.checkedInAt,
    },
  };
}

/** Check-in conférence de presse (statut checked_in). */
export async function checkInConference(
  eventId: string,
  conferenceId: string,
  journalistId: string,
) {
  return setConferenceRegistrationStatus(eventId, conferenceId, journalistId, 'checked_in');
}
