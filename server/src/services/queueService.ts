import { resolveInterviewQuota, type RequestStatus, type RequestType } from '@pr-event-360/core';
import { AppError } from '../http/AppError';
import { nowMs } from '../lib/clock';
import { getConfig } from '../db/repositories/eventRepo';
import { listArtists } from '../db/repositories/lineupRepo';
import {
  acceptedPhotoCountsByEvent,
  acceptedVideoCountsByEvent,
  getEventKpis,
  grantedInterviewCountsByEvent,
  listEnrichedByEvent,
} from '../db/repositories/requestRepo';
import { countJournalistsByEvent } from '../db/repositories/journalistRepo';
import { scoreRequest } from './scoring';

export interface QueueItem {
  id: string;
  type: RequestType;
  status: RequestStatus;
  score: number;
  message: string | null;
  createdAt: string;
  requester: { id: string; firstName: string; lastName: string | null; email: string; media: string | null };
  subject: {
    artistId: string | null;
    artistName: string | null;
    stageId: string | null;
    stageName: string | null;
    slot: string | null;
    slotDay: string | null;
    slotStart: string | null;
    slotEnd: string | null;
  };
  quota: { used: number; limit: number } | null; // null si pas de quota applicable (ex. vidéo)
}

export interface QueueFilters {
  type?: RequestType;
  status?: RequestStatus;
}

/**
 * Normalise une date de créneau en `YYYY-MM-DD` sans décalage de fuseau.
 * node-pg renvoie les colonnes `date` comme objets Date à minuit local : on lit
 * donc les composantes locales (et non l'UTC, qui décalerait d'un jour).
 */
function toDateString(value: string | Date | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value.slice(0, 10) : null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * File du back-office triée par score DÉCROISSANT (le moteur calcule le score à
 * la volée), filtrable par type et statut. Chaque carte porte l'info de quota.
 */
export async function getQueue(eventId: string, filters: QueueFilters = {}): Promise<QueueItem[]> {
  const config = await getConfig(eventId);
  if (!config) throw AppError.notFound('Configuration introuvable');

  const [enriched, artists, grantedByArtist, acceptedPhotoByArtist, acceptedVideoByArtist] =
    await Promise.all([
      listEnrichedByEvent(eventId),
      listArtists(eventId),
      grantedInterviewCountsByEvent(eventId),
      acceptedPhotoCountsByEvent(eventId),
      acceptedVideoCountsByEvent(eventId),
    ]);

  const artistById = new Map(artists.map((a) => [a.id, a]));
  const now = nowMs();

  const items: QueueItem[] = enriched
    .filter((r) => (filters.type ? r.type === filters.type : true))
    .filter((r) => (filters.status ? r.status === filters.status : true))
    .map((r) => {
      // Tous les quotas sont propres à l'artiste (interviews / photo / vidéo).
      // NULL ⇒ illimité ⇒ pas de compteur affiché.
      let quota: QueueItem['quota'] = null;
      const artist = r.artistId ? artistById.get(r.artistId) : undefined;
      if (r.type === 'interview' && r.artistId) {
        quota = {
          used: grantedByArtist.get(r.artistId) ?? 0,
          limit: resolveInterviewQuota(artist?.itwQuota ?? null, config.defaultItwQuota),
        };
      } else if (r.type === 'photo_report' && r.artistId && artist?.photoQuota != null) {
        quota = { used: acceptedPhotoByArtist.get(r.artistId) ?? 0, limit: artist.photoQuota };
      } else if (r.type === 'video_report' && r.artistId && artist?.videoQuota != null) {
        quota = { used: acceptedVideoByArtist.get(r.artistId) ?? 0, limit: artist.videoQuota };
      }
      const slot =
        r.slotDay && r.slotStart ? `${r.slotDay} ${r.slotStart}–${r.slotEnd ?? ''}` : null;
      return {
        id: r.id,
        type: r.type,
        status: r.status,
        score: scoreRequest(r, config, now),
        message: r.message,
        createdAt: r.createdAt,
        requester: {
          id: r.journalistId,
          firstName: r.journalistFirstName,
          lastName: r.journalistLastName,
          email: r.journalistEmail,
          media: r.journalistMedia,
        },
        subject: {
          artistId: r.artistId,
          artistName: r.artistName,
          stageId: r.stageId,
          stageName: r.stageName,
          slot,
          slotDay: toDateString(r.slotDay),
          slotStart: r.slotStart,
          slotEnd: r.slotEnd,
        },
        quota,
      };
    });

  // Tri par score décroissant (la file respecte la priorité de traitement).
  items.sort((a, b) => b.score - a.score);
  return items;
}

/** Indicateurs synthétiques du back-office. */
export async function getDashboard(eventId: string) {
  const [kpis, journalists] = await Promise.all([
    getEventKpis(eventId),
    countJournalistsByEvent(eventId),
  ]);
  return { ...kpis, journalists };
}
