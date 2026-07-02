import {
  checkQuota,
  resolveInterviewQuota,
  selectNextForPromotion,
  type Lang,
  type RequestStatus,
  type RequestType,
} from '@pr-event-360/core';
import { withTransaction } from '../db/pool';
import { AppError } from '../http/AppError';
import { nowMs } from '../lib/clock';
import { getConfig } from '../db/repositories/eventRepo';
import { findArtist, findSlot, findStage } from '../db/repositories/lineupRepo';
import { findJournalistByToken } from '../db/repositories/journalistRepo';
import {
  addHistory,
  countAcceptedPhotos,
  countAcceptedVideos,
  countGrantedInterviews,
  findRequestById,
  insertRequest,
  listEnrichedByEvent,
  listEnrichedByJournalist,
  listHistory,
  updateRequestStatus,
  type EnrichedRequestRow,
} from '../db/repositories/requestRepo';
import { getEventOrThrow } from './eventService';
import { scoreRequest } from './scoring';
import { sendNotification } from './notifications/notificationService';
import { TRIGGERS, REQUEST_TYPE_LABELS } from './notifications/templates';
import type { EventConfig, Journalist, RequestRecord } from '../domain';

// Statuts qu'un attaché peut poser manuellement (liste d'attente = système only).
const ADMIN_SETTABLE: RequestStatus[] = [
  'pas_encore_traite',
  'en_cours',
  'transmise_prod',
  'attente_artiste',
  'acceptee',
  'refusee',
];

export interface SubmitRequestInput {
  token: string;
  type: RequestType;
  artistId?: string | null;
  slotId?: string | null;
  stageId?: string | null;
  message?: string | null;
}

/**
 * Soumission d'une demande par le journaliste (accès par token). Vérifie le
 * quota correspondant : si atteint, la demande est placée AUTOMATIQUEMENT en
 * « Liste d'attente » ; sinon « Pas encore traité ». Envoie l'accusé de réception.
 */
export async function submitRequest(input: SubmitRequestInput): Promise<RequestRecord> {
  const journalist = await requireAccreditedJournalist(input.token);
  const event = await getEventOrThrow(journalist.eventId);
  const config = await getConfig(journalist.eventId);
  if (!config) throw AppError.notFound('Configuration de l’événement introuvable');

  // Garde-fou multi-tenant : une scène ciblée doit appartenir à l'événement du
  // journaliste (le stageId vient du client, un UUID d'un autre event passerait Zod).
  if (input.stageId && !(await findStage(input.stageId, journalist.eventId))) {
    throw AppError.badRequest('Scène inconnue pour cet événement');
  }

  // Validation de cohérence cible selon le type.
  let initialStatus: RequestStatus = 'pas_encore_traite';

  if (input.type === 'interview') {
    if (!input.artistId) throw AppError.badRequest('Un artiste est requis pour une interview');
    const artist = await findArtist(input.artistId, journalist.eventId);
    if (!artist) throw AppError.badRequest('Artiste inconnu pour cet événement');
    if (input.slotId) {
      const slot = await findSlot(input.slotId);
      if (!slot || slot.artistId !== artist.id) {
        throw AppError.badRequest('Créneau invalide pour cet artiste');
      }
    }
    const used = await countGrantedInterviews(artist.id);
    const limit = resolveInterviewQuota(artist.itwQuota, config.defaultItwQuota);
    if (!checkQuota(used, limit).hasRoom) initialStatus = 'liste_attente';
  } else {
    // photo_report / video_report → artiste requis. Le quota est propre à
    // l'artiste (photographes/vidéastes) ; NULL ⇒ illimité.
    if (!input.artistId) throw AppError.badRequest('Un artiste est requis pour un reportage');
    const artist = await findArtist(input.artistId, journalist.eventId);
    if (!artist) throw AppError.badRequest('Artiste inconnu pour cet événement');
    if (input.type === 'photo_report' && artist.photoQuota != null) {
      const used = await countAcceptedPhotos(artist.id);
      if (!checkQuota(used, artist.photoQuota).hasRoom) initialStatus = 'liste_attente';
    } else if (input.type === 'video_report' && artist.videoQuota != null) {
      const used = await countAcceptedVideos(artist.id);
      if (!checkQuota(used, artist.videoQuota).hasRoom) initialStatus = 'liste_attente';
    }
  }

  const request = await withTransaction(async (db) => {
    const created = await insertRequest(
      {
        eventId: journalist.eventId,
        journalistId: journalist.id,
        type: input.type,
        artistId: input.artistId,
        slotId: input.slotId,
        stageId: input.stageId,
        message: input.message,
        status: initialStatus,
      },
      db,
    );
    await addHistory({ requestId: created.id, status: initialStatus, note: 'Création' }, db);
    return created;
  });

  // Accusé de réception : précise le type + l'artiste (pas d'ambiguïté en cas de demandes multiples).
  const recvArtist = input.artistId ? await findArtist(input.artistId, journalist.eventId) : null;
  await sendNotification({
    eventId: event.id,
    eventName: event.name,
    journalist,
    triggerKey: TRIGGERS.REQUEST_RECEIVED,
    variables: {
      type: REQUEST_TYPE_LABELS[journalist.lang]?.[input.type] ?? input.type,
      artist: recvArtist?.name ?? '—',
    },
  });

  return request;
}

/** Liste des demandes d'un journaliste (espace public), avec historique. */
export async function listJournalistRequests(token: string) {
  const journalist = await requireAccreditedJournalist(token);
  const requests = await listEnrichedByJournalist(journalist.id);
  return Promise.all(
    requests.map(async (r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      artistName: r.artistName,
      stageName: r.stageName,
      slotDay: r.slotDay,
      slotStart: r.slotStart,
      slotEnd: r.slotEnd,
      history: await listHistory(r.id),
    })),
  );
}

/**
 * Transition de statut par l'attaché. Horodate dans l'historique, notifie aux
 * étapes clés (acceptée / refusée) et, si une place se libère, PROMEUT la
 * meilleure demande en liste d'attente.
 */
export async function changeRequestStatus(
  eventId: string,
  requestId: string,
  newStatus: RequestStatus,
  changedBy: string,
  note?: string,
): Promise<RequestRecord> {
  if (!ADMIN_SETTABLE.includes(newStatus)) {
    throw AppError.badRequest('Statut non assignable manuellement');
  }
  const event = await getEventOrThrow(eventId);
  const request = await findRequestById(requestId);
  if (!request || request.eventId !== eventId) {
    throw AppError.notFound('Demande introuvable pour cet événement');
  }
  const journalist = await findJournalistByIdViaRequest(request);

  const updated = await withTransaction(async (db) => {
    const result = await updateRequestStatus(requestId, newStatus, db);
    if (!result) throw AppError.notFound('Demande introuvable');
    await addHistory({ requestId, status: newStatus, changedBy, note }, db);
    return result;
  });

  // Notifications hors transaction, aux étapes clés. On précise toujours le TYPE de demande
  // et l'ARTISTE concerné (objet + corps) pour lever toute ambiguïté en cas de demandes multiples.
  if (journalist && (newStatus === 'acceptee' || newStatus === 'refusee')) {
    const artist = request.artistId ? await findArtist(request.artistId, eventId) : null;
    const slot = request.slotId ? await findSlot(request.slotId) : null;
    const variables: Record<string, string> = {
      type: REQUEST_TYPE_LABELS[journalist.lang]?.[request.type] ?? request.type,
      artist: artist?.name ?? '—',
      slot: slot ? ` Créneau : ${slot.day} ${slot.startTime}–${slot.endTime}.` : '',
      reportage: '',
    };
    // Reportage photo/vidéo accepté → joindre règle de prise de vue + autorisation + contrat.
    const isReportage = request.type === 'photo_report' || request.type === 'video_report';
    if (isReportage && newStatus === 'acceptee') {
      variables.reportage = await buildReportageBlock(eventId, journalist.lang);
    }
    await sendNotification({
      eventId: event.id,
      eventName: event.name,
      journalist,
      triggerKey: newStatus === 'acceptee' ? TRIGGERS.REQUEST_ACCEPTED : TRIGGERS.REQUEST_REJECTED,
      variables,
    });
  }

  // Une place a pu se libérer → tenter une promotion depuis la liste d'attente.
  await tryPromote(eventId, request);
  return updated;
}

/** Promotion : si le quota concerné a de la place, fait remonter la meilleure attente. */
async function tryPromote(eventId: string, changed: RequestRecord): Promise<void> {
  const config = await getConfig(eventId);
  if (!config) return;

  if (changed.type === 'interview' && changed.artistId) {
    const artist = await findArtist(changed.artistId, eventId);
    if (!artist) return;
    const used = await countGrantedInterviews(artist.id);
    const limit = resolveInterviewQuota(artist.itwQuota, config.defaultItwQuota);
    if (!checkQuota(used, limit).hasRoom) return;
    await promoteBest(eventId, config, (row) => row.type === 'interview' && row.artistId === artist.id);
  } else if (changed.type === 'photo_report' && changed.artistId) {
    const artist = await findArtist(changed.artistId, eventId);
    // Pas de quota photo défini ⇒ illimité ⇒ aucune promotion à déclencher.
    if (!artist || artist.photoQuota == null) return;
    const used = await countAcceptedPhotos(changed.artistId);
    if (!checkQuota(used, artist.photoQuota).hasRoom) return;
    await promoteBest(
      eventId,
      config,
      (row) => row.type === 'photo_report' && row.artistId === changed.artistId,
    );
  } else if (changed.type === 'video_report' && changed.artistId) {
    const artist = await findArtist(changed.artistId, eventId);
    // Pas de quota vidéo défini ⇒ illimité ⇒ aucune promotion à déclencher.
    if (!artist || artist.videoQuota == null) return;
    const used = await countAcceptedVideos(changed.artistId);
    if (!checkQuota(used, artist.videoQuota).hasRoom) return;
    await promoteBest(
      eventId,
      config,
      (row) => row.type === 'video_report' && row.artistId === changed.artistId,
    );
  }
}

async function promoteBest(
  eventId: string,
  config: EventConfig,
  matches: (row: EnrichedRequestRow) => boolean,
): Promise<void> {
  const enriched = await listEnrichedByEvent(eventId);
  const now = nowMs();
  const candidates = enriched
    .filter((r) => r.status === 'liste_attente' && matches(r))
    .map((r) => ({
      id: r.id,
      score: scoreRequest(r, config, now),
      createdAtMs: r.createdAtMs,
    }));
  const winner = selectNextForPromotion(candidates);
  if (!winner) return;
  await withTransaction(async (db) => {
    await updateRequestStatus(winner.id, 'pas_encore_traite', db);
    await addHistory(
      { requestId: winner.id, status: 'pas_encore_traite', note: 'Promotion automatique depuis la liste d’attente' },
      db,
    );
  });
}

async function requireAccreditedJournalist(token: string): Promise<Journalist> {
  const journalist = await findJournalistByToken(token);
  if (!journalist) throw AppError.notFound('Espace introuvable');
  if (journalist.accStatus !== 'acceptee') {
    throw AppError.forbidden('Accréditation non encore acceptée');
  }
  return journalist;
}

async function findJournalistByIdViaRequest(request: RequestRecord): Promise<Journalist | null> {
  // La notification a besoin de la langue/email du demandeur.
  const { findJournalistById } = await import('../db/repositories/journalistRepo');
  return findJournalistById(request.journalistId);
}

const REPORTAGE_LABELS: Record<Lang, { rule: string; terms: string; contract: string }> = {
  fr: { rule: 'Règles de prise de vue', terms: "Autorisation d'utilisation des photos/vidéos", contract: '⚠ Un contrat est à signer sur place.' },
  en: { rule: 'Shooting rules', terms: 'Photo/video usage authorisation', contract: '⚠ A contract must be signed on site.' },
  pt: { rule: 'Regras de captação', terms: 'Autorização de utilização das fotos/vídeos', contract: '⚠ Um contrato deve ser assinado no local.' },
  es: { rule: 'Reglas de captación', terms: 'Autorización de uso de fotos/vídeos', contract: '⚠ Debe firmarse un contrato in situ.' },
};

/** Bloc « reportage » joint à l'email d'acceptation : règle de prise de vue + autorisation + contrat. */
async function buildReportageBlock(eventId: string, lang: Lang): Promise<string> {
  const config = await getConfig(eventId);
  if (!config) return '';
  const L = REPORTAGE_LABELS[lang] ?? REPORTAGE_LABELS.fr;
  const parts: string[] = [];
  if (config.photoRule) parts.push(`${L.rule} : ${config.photoRule}`);
  if (config.onsiteContract) parts.push(L.contract);
  if (config.photoTerms) parts.push(`${L.terms} :\n${config.photoTerms}`);
  return parts.length ? `\n\n${parts.join('\n\n')}` : '';
}
