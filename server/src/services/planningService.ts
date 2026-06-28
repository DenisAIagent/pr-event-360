import { AppError } from '../http/AppError';
import { nowMs } from '../lib/clock';
import { withTransaction } from '../db/pool';
import { getConfig } from '../db/repositories/eventRepo';
import { listSlotsByArtist } from '../db/repositories/lineupRepo';
import {
  clearInterviewSlots,
  listEnrichedByEvent,
  setRequestSlot,
  type EnrichedRequestRow,
} from '../db/repositories/requestRepo';
import { scoreRequest } from './scoring';

export interface PlanningResult {
  assigned: number;
  unscheduled: number;
}

/**
 * Génère le planning des interviews : pour chaque artiste, les demandes
 * ACCEPTÉES sont classées par score de priorité décroissant et placées dans ses
 * créneaux disponibles (meilleur score → créneau le plus tôt). Recalculable :
 * on repart toujours d'une ardoise vierge (tous les créneaux d'interview libérés).
 * Les demandes acceptées au-delà du nombre de créneaux restent sans créneau.
 */
export async function generatePlanning(eventId: string): Promise<PlanningResult> {
  const config = await getConfig(eventId);
  if (!config) throw AppError.notFound('Configuration introuvable');
  const now = nowMs();

  return withTransaction(async (db) => {
    const enriched = await listEnrichedByEvent(eventId, db);

    const acceptedByArtist = new Map<string, EnrichedRequestRow[]>();
    for (const r of enriched) {
      if (r.type === 'interview' && r.status === 'acceptee' && r.artistId) {
        const arr = acceptedByArtist.get(r.artistId) ?? [];
        arr.push(r);
        acceptedByArtist.set(r.artistId, arr);
      }
    }

    await clearInterviewSlots(eventId, db);

    let assigned = 0;
    let unscheduled = 0;
    for (const [artistId, requests] of acceptedByArtist) {
      const slots = await listSlotsByArtist(artistId, db); // déjà triés chrono
      const sorted = [...requests].sort(
        (a, b) => scoreRequest(b, config, now) - scoreRequest(a, config, now),
      );
      for (let i = 0; i < sorted.length; i++) {
        const req = sorted[i];
        if (!req) continue;
        const slot = slots[i];
        if (slot) {
          await setRequestSlot(req.id, slot.id, db);
          assigned++;
        } else {
          unscheduled++;
        }
      }
    }
    return { assigned, unscheduled };
  });
}
