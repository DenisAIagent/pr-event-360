import { generateSlots, type Lang } from '@pr-event-360/core';
import { withTransaction } from '../db/pool';
import { AppError } from '../http/AppError';
import { getConfig } from '../db/repositories/eventRepo';
import {
  findStage,
  insertArtist,
  insertSlots,
  insertStage,
  insertWindow,
  listArtists,
  listSlotsByArtist,
  listStages,
} from '../db/repositories/lineupRepo';
import type { Artist, InterviewSlot, Stage } from '../domain';

export async function addStage(
  eventId: string,
  input: { name: string; photoQuota?: number | null; videoQuota?: number | null },
): Promise<Stage> {
  try {
    return await insertStage({ eventId, ...input });
  } catch (err) {
    if (isUnique(err)) throw AppError.conflict('Une scène porte déjà ce nom dans cet événement');
    throw err;
  }
}

export interface WindowInput {
  day: string;
  startTime: string;
  endTime: string;
}

export interface AddArtistInput {
  eventId: string;
  name: string;
  stageId?: string | null;
  itwQuota?: number | null;
  windows?: WindowInput[];
}

/**
 * Ajoute un artiste, ses fenêtres de disponibilité, et GÉNÈRE automatiquement
 * ses créneaux d'interview (durée + buffer de l'événement) via le moteur métier.
 * Le tout est atomique.
 */
export async function addArtist(
  input: AddArtistInput,
): Promise<{ artist: Artist; slots: InterviewSlot[] }> {
  const config = await getConfig(input.eventId);
  if (!config) throw AppError.notFound('Configuration de l’événement introuvable');

  if (input.stageId) {
    const stage = await findStage(input.stageId, input.eventId);
    if (!stage) throw AppError.badRequest('Scène inconnue pour cet événement');
  }

  return withTransaction(async (db) => {
    const artist = await insertArtist(
      { eventId: input.eventId, name: input.name, stageId: input.stageId, itwQuota: input.itwQuota },
      db,
    );

    const allSlots: InterviewSlot[] = [];
    for (const w of input.windows ?? []) {
      const win = await insertWindow({ artistId: artist.id, ...w }, db);
      // Découpage déterministe par le moteur pur (testé au Module 1).
      const generated = generateSlots(
        { day: win.day, startTime: win.startTime, endTime: win.endTime },
        { durationMin: config.itwDurationMin, bufferMin: config.itwBufferMin },
      );
      const persisted = await insertSlots(
        generated.map((s) => ({
          artistId: artist.id,
          windowId: win.id,
          day: s.day,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        db,
      );
      allSlots.push(...persisted);
    }

    return { artist, slots: allSlots };
  });
}

/** Lineup complet pour l'événement : artistes + scènes + créneaux. */
export async function getLineup(eventId: string) {
  const [artists, stages] = await Promise.all([listArtists(eventId), listStages(eventId)]);
  const withSlots = await Promise.all(
    artists.map(async (a) => ({ ...a, slots: await listSlotsByArtist(a.id) })),
  );
  return { stages, artists: withSlots };
}

export async function getStages(eventId: string): Promise<Stage[]> {
  return listStages(eventId);
}

// Données publiques du lineup pour alimenter le sélecteur du formulaire (par token).
export async function getPublicLineup(eventId: string, _lang: Lang) {
  const [artists, stages] = await Promise.all([listArtists(eventId), listStages(eventId)]);
  const artistsWithSlots = await Promise.all(
    artists.map(async (a) => ({
      id: a.id,
      name: a.name,
      stageId: a.stageId,
      slots: (await listSlotsByArtist(a.id)).map((s) => ({
        id: s.id,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    })),
  );
  return { stages: stages.map((s) => ({ id: s.id, name: s.name })), artists: artistsWithSlots };
}

function isUnique(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}
