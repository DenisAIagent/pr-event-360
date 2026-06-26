import { describe, expect, it } from 'vitest';
import {
  rankWaitlist,
  selectForPromotion,
  selectNextForPromotion,
  type WaitlistCandidate,
} from '../src/waitlist/promote.js';

const c = (id: string, score: number, createdAtMs: number): WaitlistCandidate => ({
  id,
  score,
  createdAtMs,
});

describe('rankWaitlist', () => {
  it('trie par score décroissant', () => {
    const ranked = rankWaitlist([c('a', 10, 0), c('b', 150, 0), c('c', 80, 0)]);
    expect(ranked.map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('départage les scores égaux par ancienneté (plus ancien d’abord)', () => {
    const ranked = rankWaitlist([c('jeune', 50, 2000), c('vieux', 50, 1000)]);
    expect(ranked.map((x) => x.id)).toEqual(['vieux', 'jeune']);
  });

  it('ne mute pas le tableau d’entrée', () => {
    const input = [c('a', 1, 0), c('b', 2, 0)];
    const snapshot = input.map((x) => x.id);
    rankWaitlist(input);
    expect(input.map((x) => x.id)).toEqual(snapshot);
  });
});

describe('selectNextForPromotion', () => {
  it('retourne le meilleur candidat', () => {
    const best = selectNextForPromotion([c('a', 10, 0), c('b', 150, 0)]);
    expect(best?.id).toBe('b');
  });

  it('retourne null sur une liste vide', () => {
    expect(selectNextForPromotion([])).toBeNull();
  });
});

describe('selectForPromotion', () => {
  it('retourne les N meilleurs quand plusieurs places se libèrent', () => {
    const picked = selectForPromotion([c('a', 10, 0), c('b', 150, 0), c('c', 80, 0)], 2);
    expect(picked.map((x) => x.id)).toEqual(['b', 'c']);
  });

  it('ne retourne pas plus que le nombre de candidats disponibles', () => {
    expect(selectForPromotion([c('a', 10, 0)], 5)).toHaveLength(1);
  });

  it('retourne un tableau vide si aucune place libérée', () => {
    expect(selectForPromotion([c('a', 10, 0)], 0)).toEqual([]);
  });

  it('rejette un nombre de places invalide', () => {
    expect(() => selectForPromotion([], -1)).toThrow();
  });
});
