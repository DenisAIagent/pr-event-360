import { describe, expect, it } from 'vitest';
import { formatMinutesToTime, parseTimeToMinutes } from '../src/time.js';

describe('parseTimeToMinutes', () => {
  it('parse "HH:MM" et "HH:MM:SS"', () => {
    expect(parseTimeToMinutes('14:00')).toBe(840);
    expect(parseTimeToMinutes('09:30')).toBe(570);
    expect(parseTimeToMinutes('23:59:59')).toBe(1439);
  });

  it('tolère les espaces autour', () => {
    expect(parseTimeToMinutes('  08:15 ')).toBe(495);
  });

  it('rejette un format invalide', () => {
    expect(() => parseTimeToMinutes('8h15')).toThrow();
    expect(() => parseTimeToMinutes('')).toThrow();
  });

  it('rejette une heure hors plage', () => {
    expect(() => parseTimeToMinutes('24:00')).toThrow();
    expect(() => parseTimeToMinutes('10:60')).toThrow();
  });
});

describe('formatMinutesToTime', () => {
  it('formate en "HH:MM" zéro-paddé', () => {
    expect(formatMinutesToTime(840)).toBe('14:00');
    expect(formatMinutesToTime(495)).toBe('08:15');
    expect(formatMinutesToTime(0)).toBe('00:00');
  });

  it('aller-retour stable', () => {
    expect(formatMinutesToTime(parseTimeToMinutes('15:45'))).toBe('15:45');
  });

  it('rejette des minutes hors plage', () => {
    expect(() => formatMinutesToTime(-1)).toThrow();
    expect(() => formatMinutesToTime(24 * 60 + 1)).toThrow();
  });
});
