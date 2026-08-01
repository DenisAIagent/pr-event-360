import type { AccreditationStatus, AccreditationType, RequestStatus, RequestType } from '@pr-event-360/core';
import { listAccreditations } from './accreditationService';
import { getQueue, type QueueFilters, type QueueItem } from './queueService';
import { listCoverageByEvent } from '../db/repositories/coverageRepo';
import { findEventById, getBranding } from '../db/repositories/eventRepo';
import { AppError } from '../http/AppError';
import { toCsv } from '../lib/csv';

const ACC_STATUS_LABEL: Record<AccreditationStatus, string> = {
  pas_encore_traite: 'En attente',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
};

const ACC_TYPE_LABEL: Record<AccreditationType, string> = {
  presse: 'Journaliste',
  photo: 'Photographe',
  video: 'Vidéaste',
};

const REQ_TYPE_LABEL: Record<RequestType, string> = {
  interview: 'Interview',
  photo_report: 'Reportage photo',
  video_report: 'Reportage vidéo',
};

const REQ_STATUS_LABEL: Record<RequestStatus, string> = {
  pas_encore_traite: 'Pas encore traitée',
  en_cours: 'En cours',
  transmise_prod: 'Transmise prod',
  attente_artiste: 'Attente artiste',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  liste_attente: "Liste d'attente",
};

function fullName(first: string, last: string | null | undefined): string {
  return `${first} ${last ?? ''}`.trim();
}

function isoDate(value: string | null | undefined): string {
  if (!value) return '';
  try {
    return new Date(value).toISOString();
  } catch {
    return String(value);
  }
}

/** CSV accréditations (journalistes de l'événement). */
export async function exportAccreditationsCsv(eventId: string): Promise<string> {
  const list = await listAccreditations(eventId);
  const headers = [
    'prenom',
    'nom',
    'email',
    'telephone',
    'media',
    'type',
    'langue',
    'statut',
    'engagement_publication',
    'delai_retombees_j',
    'consentement',
    'cree_le',
  ];
  const rows = list.map((j) => [
    j.firstName,
    j.lastName ?? '',
    j.email,
    j.phone ?? '',
    j.media ?? '',
    j.accreditationType ? ACC_TYPE_LABEL[j.accreditationType] : '',
    j.lang.toUpperCase(),
    ACC_STATUS_LABEL[j.accStatus],
    j.commitPublish ? 'oui' : 'non',
    j.publishDelayDays,
    j.consent ? 'oui' : 'non',
    isoDate(j.createdAt),
  ]);
  return toCsv(headers, rows);
}

function queueToRows(items: QueueItem[]): Array<Array<string | number>> {
  return items.map((i) => [
    i.id,
    REQ_TYPE_LABEL[i.type] ?? i.type,
    REQ_STATUS_LABEL[i.status] ?? i.status,
    i.score,
    fullName(i.requester.firstName, i.requester.lastName),
    i.requester.email,
    i.requester.media ?? '',
    i.subject.artistName ?? '',
    i.subject.stageName ?? '',
    i.subject.slotDay ?? '',
    i.subject.slotStart ?? '',
    i.subject.slotEnd ?? '',
    i.message ?? '',
    isoDate(i.createdAt),
  ]);
}

const REQUEST_HEADERS = [
  'id',
  'type',
  'statut',
  'score',
  'journaliste',
  'email',
  'media',
  'participant',
  'lieu',
  'creneau_jour',
  'creneau_debut',
  'creneau_fin',
  'message',
  'cree_le',
];

/** CSV file des demandes (filtres optionnels type/statut). */
export async function exportRequestsCsv(eventId: string, filters: QueueFilters = {}): Promise<string> {
  const items = await getQueue(eventId, filters);
  return toCsv(REQUEST_HEADERS, queueToRows(items));
}

/** CSV planning : interviews acceptées avec créneau attribué. */
export async function exportPlanningCsv(eventId: string): Promise<string> {
  const items = (await getQueue(eventId, { type: 'interview', status: 'acceptee' })).filter(
    (i) => i.subject.slotDay && i.subject.slotStart,
  );
  items.sort((a, b) =>
    `${a.subject.slotDay}${a.subject.slotStart}`.localeCompare(`${b.subject.slotDay}${b.subject.slotStart}`),
  );
  return toCsv(REQUEST_HEADERS, queueToRows(items));
}

/** CSV retombées presse. */
export async function exportCoverageCsv(eventId: string): Promise<string> {
  const [items, journalists] = await Promise.all([
    listCoverageByEvent(eventId),
    listAccreditations(eventId),
  ]);
  const byId = new Map(journalists.map((j) => [j.id, j]));
  const headers = [
    'journaliste',
    'email',
    'media',
    'categorie',
    'titre',
    'url',
    'upload',
    'consent_archive',
    'consent_promo',
    'depose_le',
  ];
  const rows = items.map((c) => {
    const j = byId.get(c.journalistId);
    return [
      j ? fullName(j.firstName, j.lastName) : c.journalistId,
      j?.email ?? '',
      j?.media ?? '',
      c.mediaCategory,
      c.title ?? '',
      c.url,
      c.isUpload ? 'oui' : 'non',
      c.archiveConsent ? 'oui' : 'non',
      c.promoConsent ? 'oui' : 'non',
      isoDate(c.createdAt),
    ];
  });
  return toCsv(headers, rows);
}

export interface EventBilan {
  event: {
    id: string;
    name: string;
    location: string | null;
    startDate: string | null;
    endDate: string | null;
    eventType: string;
  };
  branding: { logoUrl: string | null; accentColor: string | null } | null;
  generatedAt: string;
  kpis: {
    journalistsTotal: number;
    byAccStatus: Record<string, number>;
    byAccType: Record<string, number>;
    requestsTotal: number;
    byRequestStatus: Record<string, number>;
    byRequestType: Record<string, number>;
    coverageTotal: number;
    coverageByCategory: Record<string, number>;
    contributorsCount: number;
    pendingCoverageCount: number;
  };
  highlights: {
    topMedia: Array<{ name: string; count: number }>;
    topParticipants: Array<{ name: string; count: number }>;
  };
}

/** Agrégats pour le bilan presse imprimable. */
export async function buildEventBilan(eventId: string): Promise<EventBilan> {
  const event = await findEventById(eventId);
  if (!event) throw AppError.notFound('Événement introuvable');

  const [journalists, queue, coverage, branding] = await Promise.all([
    listAccreditations(eventId),
    getQueue(eventId),
    listCoverageByEvent(eventId),
    getBranding(eventId),
  ]);

  const byAccStatus: Record<string, number> = {};
  const byAccType: Record<string, number> = {};
  const mediaCount = new Map<string, number>();
  for (const j of journalists) {
    byAccStatus[j.accStatus] = (byAccStatus[j.accStatus] ?? 0) + 1;
    if (j.accreditationType) {
      byAccType[j.accreditationType] = (byAccType[j.accreditationType] ?? 0) + 1;
    }
    const mediaKey = (j.media ?? '').trim() || '(non renseigné)';
    mediaCount.set(mediaKey, (mediaCount.get(mediaKey) ?? 0) + 1);
  }

  const byRequestStatus: Record<string, number> = {};
  const byRequestType: Record<string, number> = {};
  const participantCount = new Map<string, number>();
  for (const r of queue) {
    byRequestStatus[r.status] = (byRequestStatus[r.status] ?? 0) + 1;
    byRequestType[r.type] = (byRequestType[r.type] ?? 0) + 1;
    if (r.subject.artistName) {
      participantCount.set(
        r.subject.artistName,
        (participantCount.get(r.subject.artistName) ?? 0) + 1,
      );
    }
  }

  const coverageByCategory: Record<string, number> = {};
  const coverageByJournalist = new Set<string>();
  for (const c of coverage) {
    coverageByCategory[c.mediaCategory] = (coverageByCategory[c.mediaCategory] ?? 0) + 1;
    coverageByJournalist.add(c.journalistId);
  }

  const accepted = journalists.filter((j) => j.accStatus === 'acceptee');
  const pendingCoverageCount = accepted.filter((j) => !coverageByJournalist.has(j.id)).length;

  const topMedia = [...mediaCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topParticipants = [...participantCount.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    event: {
      id: event.id,
      name: event.name,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      eventType: event.eventType,
    },
    branding: branding
      ? { logoUrl: branding.logoUrl, accentColor: branding.accentColor }
      : null,
    generatedAt: new Date().toISOString(),
    kpis: {
      journalistsTotal: journalists.length,
      byAccStatus,
      byAccType,
      requestsTotal: queue.length,
      byRequestStatus,
      byRequestType,
      coverageTotal: coverage.length,
      coverageByCategory,
      contributorsCount: coverageByJournalist.size,
      pendingCoverageCount,
    },
    highlights: { topMedia, topParticipants },
  };
}
