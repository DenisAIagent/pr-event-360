import { formatMinutesToTime, parseTimeToMinutes } from '../time.js';

/** Tranche de disponibilité saisie par l'attaché. */
export interface AvailabilityWindow {
  day: string; // ISO date "YYYY-MM-DD" — transmis tel quel aux créneaux
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface SlotConfig {
  durationMin: number; // durée d'une interview
  bufferMin: number; // battement entre deux interviews
}

/** Créneau d'interview généré. */
export interface GeneratedSlot {
  day: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

/**
 * Découpe UNE tranche de disponibilité en créneaux d'interview.
 *
 * Pas d'avancement = durée + battement. Un créneau n'est émis que s'il tient
 * ENTIÈREMENT dans la fenêtre (start + durée <= fin). Le battement après le
 * dernier créneau n'est pas requis (il sépare deux interviews, pas la fin).
 *
 * Exemple PRD : 14:00–16:00, 15 min + 5 min de battement
 *   → 14:00, 14:20, 14:40, 15:00, 15:20, 15:40 (6 créneaux).
 *
 * Fonction PURE : aucune lecture d'horloge, aucune I/O.
 */
export function generateSlots(
  window: AvailabilityWindow,
  config: SlotConfig,
): GeneratedSlot[] {
  const { durationMin, bufferMin } = config;
  if (!Number.isInteger(durationMin) || durationMin <= 0) {
    throw new Error(`Durée d'interview invalide : ${durationMin} (doit être > 0)`);
  }
  if (!Number.isInteger(bufferMin) || bufferMin < 0) {
    throw new Error(`Battement invalide : ${bufferMin} (doit être >= 0)`);
  }

  const start = parseTimeToMinutes(window.startTime);
  const end = parseTimeToMinutes(window.endTime);
  if (end <= start) {
    throw new Error(
      `Fenêtre invalide : fin (${window.endTime}) <= début (${window.startTime})`,
    );
  }

  const step = durationMin + bufferMin;
  const slots: GeneratedSlot[] = [];
  for (let t = start; t + durationMin <= end; t += step) {
    slots.push({
      day: window.day,
      startTime: formatMinutesToTime(t),
      endTime: formatMinutesToTime(t + durationMin),
    });
  }
  return slots;
}

/**
 * Génère les créneaux de PLUSIEURS tranches (cas réel : un artiste a une ou
 * plusieurs fenêtres). Concatène les résultats dans l'ordre des fenêtres.
 */
export function generateSlotsForWindows(
  windows: readonly AvailabilityWindow[],
  config: SlotConfig,
): GeneratedSlot[] {
  return windows.flatMap((w) => generateSlots(w, config));
}
