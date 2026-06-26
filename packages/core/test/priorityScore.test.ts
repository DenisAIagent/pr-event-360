import { describe, expect, it } from 'vitest';
import { ageBonus, priorityScore } from '../src/scoring/priorityScore.js';

const HOUR = 3_600_000;
const T0 = 1_700_000_000_000; // instant de création de référence

describe('priorityScore', () => {
  it('reproduit l’exemple du PRD : TV nationale × interview = 100 × 1.5 = 150 (sans ancienneté)', () => {
    const score = priorityScore({
      mediaWeight: 100,
      typeMultiplier: 1.5,
      createdAtMs: T0,
      nowMs: T0,
    });
    expect(score).toBe(150);
  });

  it('reproduit le contre-exemple : blog × 0.8 = 16', () => {
    const score = priorityScore({
      mediaWeight: 20,
      typeMultiplier: 0.8,
      createdAtMs: T0,
      nowMs: T0,
    });
    expect(score).toBeCloseTo(16);
  });

  it('ajoute +1 par heure pleine d’attente', () => {
    const score = priorityScore({
      mediaWeight: 10,
      typeMultiplier: 1,
      createdAtMs: T0,
      nowMs: T0 + 3 * HOUR,
    });
    expect(score).toBe(13); // 10 + 3
  });

  it('ne compte que les heures PLEINES (59 min → +0)', () => {
    const score = priorityScore({
      mediaWeight: 10,
      typeMultiplier: 1,
      createdAtMs: T0,
      nowMs: T0 + HOUR - 60_000,
    });
    expect(score).toBe(10);
  });

  it('plafonne le bonus d’ancienneté à 24', () => {
    const score = priorityScore({
      mediaWeight: 0,
      typeMultiplier: 1,
      createdAtMs: T0,
      nowMs: T0 + 100 * HOUR,
    });
    expect(score).toBe(24);
  });

  it('respecte un bonusPerHour et un bonusCap personnalisés', () => {
    const score = priorityScore({
      mediaWeight: 0,
      typeMultiplier: 1,
      createdAtMs: T0,
      nowMs: T0 + 10 * HOUR,
      bonusPerHour: 2,
      bonusCap: 12,
    });
    expect(score).toBe(12); // 10×2=20 plafonné à 12
  });

  it('ne donne jamais de bonus négatif si nowMs < createdAtMs', () => {
    expect(ageBonus(T0, T0 - 5 * HOUR)).toBe(0);
  });
});
