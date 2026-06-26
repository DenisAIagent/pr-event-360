import { priorityScore } from '@pr-event-360/core';
import type { EventConfig } from '../domain';
import type { EnrichedRequestRow } from '../db/repositories/requestRepo';

/**
 * Calcule le score de priorité d'une demande enrichie, en injectant l'instant
 * courant et les paramètres de bonus de l'événement dans le moteur pur.
 */
export function scoreRequest(
  row: EnrichedRequestRow,
  config: EventConfig,
  nowMs: number,
): number {
  return priorityScore({
    mediaWeight: row.mediaWeight,
    typeMultiplier: row.typeMultiplier,
    createdAtMs: row.createdAtMs,
    nowMs,
    bonusPerHour: config.ageBonusPerHour,
    bonusCap: config.ageBonusCap,
  });
}
