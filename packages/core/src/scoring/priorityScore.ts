/**
 * Score de priorité d'une demande (paramétrable par événement) :
 *
 *   Score = (poids du type de média) × (multiplicateur du type de demande)
 *           + bonus d'ancienneté
 *
 * Bonus d'ancienneté : +`bonusPerHour` point par HEURE PLEINE d'attente,
 * plafonné à `bonusCap` (24 par défaut) — pour qu'une vieille demande ne soit
 * jamais indéfiniment doublée.
 *
 * Fonction PURE : l'instant courant `nowMs` est INJECTÉ (pas de Date.now()),
 * ce qui rend le score totalement déterministe et testable.
 */
export interface PriorityScoreInput {
  mediaWeight: number; // poids du type de média (ex. TV nationale = 100)
  typeMultiplier: number; // multiplicateur du type de demande (ex. interview = 1.5)
  createdAtMs: number; // horodatage de création de la demande (epoch ms)
  nowMs: number; // instant de référence (epoch ms)
  bonusPerHour?: number; // défaut 1
  bonusCap?: number; // défaut 24
}

const MS_PER_HOUR = 3_600_000;

/** Bonus d'ancienneté isolé (heures pleines × poids, plafonné). */
export function ageBonus(
  createdAtMs: number,
  nowMs: number,
  bonusPerHour = 1,
  bonusCap = 24,
): number {
  const elapsedMs = Math.max(0, nowMs - createdAtMs);
  const fullHours = Math.floor(elapsedMs / MS_PER_HOUR);
  return Math.min(fullHours * bonusPerHour, bonusCap);
}

export function priorityScore(input: PriorityScoreInput): number {
  const {
    mediaWeight,
    typeMultiplier,
    createdAtMs,
    nowMs,
    bonusPerHour = 1,
    bonusCap = 24,
  } = input;
  const base = mediaWeight * typeMultiplier;
  return base + ageBonus(createdAtMs, nowMs, bonusPerHour, bonusCap);
}
