import { describe, expect, it } from 'vitest';
import { EVENT_PROFILES, EVENT_TYPES, getEventProfile } from '../src/index.js';

describe('event profiles', () => {
  it('defines a complete profile for every supported event type', () => {
    expect(Object.keys(EVENT_PROFILES).sort()).toEqual([...EVENT_TYPES].sort());
    for (const type of EVENT_TYPES) {
      const profile = getEventProfile(type);
      expect(profile.type).toBe(type);
      expect(profile.participantSingular).not.toBe('');
      expect(profile.venueSingular).not.toBe('');
    }
  });

  it('keeps historical events on the music profile when no type is present', () => {
    expect(getEventProfile(undefined).type).toBe('music');
  });
});
