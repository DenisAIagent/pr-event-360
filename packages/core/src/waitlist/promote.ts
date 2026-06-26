/**
 * Promotion depuis la liste d'attente.
 *
 * Quand une place se libère (annulation, refus), la demande en liste d'attente
 * au MEILLEUR score de priorité devient éligible à la promotion. À score égal,
 * on départage par ancienneté (la plus ancienne d'abord) pour rester équitable.
 *
 * Fonctions PURES : on reçoit des candidats avec score déjà calculé.
 */
export interface WaitlistCandidate {
  id: string;
  score: number;
  createdAtMs: number; // départage à score égal : plus ancien = prioritaire
}

/** Trie une copie des candidats par priorité décroissante (ne mute pas l'entrée). */
export function rankWaitlist<T extends WaitlistCandidate>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // score décroissant
    return a.createdAtMs - b.createdAtMs; // puis plus ancien d'abord
  });
}

/**
 * Sélectionne la prochaine demande à promouvoir, ou `null` si la liste est vide.
 */
export function selectNextForPromotion<T extends WaitlistCandidate>(
  candidates: readonly T[],
): T | null {
  if (candidates.length === 0) return null;
  return rankWaitlist(candidates)[0] ?? null;
}

/**
 * Sélectionne les `freedSpots` meilleures demandes à promouvoir quand plusieurs
 * places se libèrent d'un coup. Retourne au plus `freedSpots` éléments.
 */
export function selectForPromotion<T extends WaitlistCandidate>(
  candidates: readonly T[],
  freedSpots: number,
): T[] {
  if (!Number.isInteger(freedSpots) || freedSpots < 0) {
    throw new Error(`Nombre de places libérées invalide : ${freedSpots}`);
  }
  if (freedSpots === 0) return [];
  return rankWaitlist(candidates).slice(0, freedSpots);
}
