/**
 * Vérification des quotas (déterminée à la volée à partir des comptages).
 *
 * Deux quotas dans le PRD :
 *  - interviews par artiste : plafonne les interviews ACCORDÉES
 *    (transmise prod, en attente artiste, acceptée).
 *  - photographes par scène : plafonne les reportages photo ACCEPTÉS par scène.
 *
 * Le comptage (`used`) est fourni par la couche données (requêtes SQL) ; ces
 * fonctions ne font que la logique de plafond — pures et testables.
 */

export interface QuotaStatus {
  limit: number;
  used: number;
  remaining: number; // jamais négatif
  hasRoom: boolean; // une nouvelle demande peut-elle être accordée ?
}

/**
 * Quota d'interviews effectif d'un artiste : son quota spécifique s'il est
 * défini, sinon le quota par défaut de l'événement.
 */
export function resolveInterviewQuota(
  artistQuota: number | null | undefined,
  eventDefaultQuota: number,
): number {
  return artistQuota ?? eventDefaultQuota;
}

/**
 * Quota photo effectif d'une scène : son quota spécifique s'il est défini,
 * sinon le quota par défaut de l'événement (photographes par scène).
 * Le quota vidéo, lui, n'a pas de défaut d'événement : NULL ⇒ illimité.
 */
export function resolvePhotoQuota(
  stageQuota: number | null | undefined,
  eventDefaultQuota: number,
): number {
  return stageQuota ?? eventDefaultQuota;
}

/** Statut de quota à partir d'un nombre de places utilisées et d'un plafond. */
export function checkQuota(used: number, limit: number): QuotaStatus {
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error(`Plafond de quota invalide : ${limit}`);
  }
  if (!Number.isFinite(used) || used < 0) {
    throw new Error(`Nombre de places utilisées invalide : ${used}`);
  }
  const remaining = Math.max(0, limit - used);
  return {
    limit,
    used,
    remaining,
    hasRoom: used < limit,
  };
}
