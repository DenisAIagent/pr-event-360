import { describe, expect, it } from 'vitest';
import {
  generateSlots,
  generateSlotsForWindows,
  type AvailabilityWindow,
} from '../src/slots/generateSlots.js';

const W = (startTime: string, endTime: string, day = '2026-07-10'): AvailabilityWindow => ({
  day,
  startTime,
  endTime,
});

describe('generateSlots', () => {
  it('reproduit l’exemple du PRD : 14:00–16:00, 15 + 5 → 14:00,14:20,…,15:40', () => {
    const slots = generateSlots(W('14:00', '16:00'), { durationMin: 15, bufferMin: 5 });
    expect(slots.map((s) => s.startTime)).toEqual([
      '14:00',
      '14:20',
      '14:40',
      '15:00',
      '15:20',
      '15:40',
    ]);
    expect(slots[0]).toEqual({ day: '2026-07-10', startTime: '14:00', endTime: '14:15' });
    expect(slots.at(-1)).toEqual({ day: '2026-07-10', startTime: '15:40', endTime: '15:55' });
  });

  it('n’émet que des créneaux qui tiennent entièrement dans la fenêtre', () => {
    // 10:00–10:30, 20 + 10 → un seul créneau (10:00–10:20) ; le suivant déborderait.
    const slots = generateSlots(W('10:00', '10:30'), { durationMin: 20, bufferMin: 10 });
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ startTime: '10:00', endTime: '10:20' });
  });

  it('gère un battement nul (créneaux contigus)', () => {
    const slots = generateSlots(W('09:00', '10:00'), { durationMin: 30, bufferMin: 0 });
    expect(slots.map((s) => s.startTime)).toEqual(['09:00', '09:30']);
  });

  it('retourne un tableau vide si aucun créneau ne tient', () => {
    const slots = generateSlots(W('12:00', '12:10'), { durationMin: 15, bufferMin: 5 });
    expect(slots).toEqual([]);
  });

  it('propage le jour de la fenêtre sur chaque créneau', () => {
    const slots = generateSlots(W('08:00', '08:40', '2026-07-11'), {
      durationMin: 20,
      bufferMin: 0,
    });
    expect(slots.every((s) => s.day === '2026-07-11')).toBe(true);
  });

  it('rejette une durée <= 0', () => {
    expect(() => generateSlots(W('14:00', '16:00'), { durationMin: 0, bufferMin: 5 })).toThrow();
  });

  it('rejette un battement négatif', () => {
    expect(() => generateSlots(W('14:00', '16:00'), { durationMin: 15, bufferMin: -1 })).toThrow();
  });

  it('rejette une fenêtre où la fin précède le début', () => {
    expect(() => generateSlots(W('16:00', '14:00'), { durationMin: 15, bufferMin: 5 })).toThrow();
  });

  it('ne mute pas et concatène plusieurs fenêtres dans l’ordre', () => {
    const windows = [W('14:00', '14:40'), W('15:00', '15:40', '2026-07-11')];
    const slots = generateSlotsForWindows(windows, { durationMin: 20, bufferMin: 0 });
    expect(slots.map((s) => `${s.day} ${s.startTime}`)).toEqual([
      '2026-07-10 14:00',
      '2026-07-10 14:20',
      '2026-07-11 15:00',
      '2026-07-11 15:20',
    ]);
  });
});
