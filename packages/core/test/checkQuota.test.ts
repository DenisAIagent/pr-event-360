import { describe, expect, it } from 'vitest';
import { checkQuota, resolveInterviewQuota } from '../src/quotas/checkQuota.js';

describe('resolveInterviewQuota', () => {
  it('utilise le quota spécifique de l’artiste s’il est défini', () => {
    expect(resolveInterviewQuota(5, 3)).toBe(5);
    expect(resolveInterviewQuota(0, 3)).toBe(0); // 0 explicite n’est pas écrasé
  });

  it('retombe sur le défaut de l’événement si le quota artiste est null/undefined', () => {
    expect(resolveInterviewQuota(null, 3)).toBe(3);
    expect(resolveInterviewQuota(undefined, 3)).toBe(3);
  });
});

describe('checkQuota', () => {
  it('indique une place disponible quand used < limit', () => {
    expect(checkQuota(2, 5)).toEqual({ limit: 5, used: 2, remaining: 3, hasRoom: true });
  });

  it('refuse quand le quota est atteint (used == limit)', () => {
    expect(checkQuota(5, 5)).toEqual({ limit: 5, used: 5, remaining: 0, hasRoom: false });
  });

  it('ne renvoie jamais un remaining négatif si used > limit', () => {
    expect(checkQuota(7, 5)).toEqual({ limit: 5, used: 7, remaining: 0, hasRoom: false });
  });

  it('un quota de 0 ne laisse aucune place', () => {
    expect(checkQuota(0, 0)).toMatchObject({ hasRoom: false, remaining: 0 });
  });

  it('rejette des entrées invalides', () => {
    expect(() => checkQuota(-1, 5)).toThrow();
    expect(() => checkQuota(2, -5)).toThrow();
  });
});
