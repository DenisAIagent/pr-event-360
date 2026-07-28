import { describe, expect, it } from 'vitest';
import { decidePressConferenceRegistration } from '../src/index.js';

describe('decidePressConferenceRegistration', () => {
  it('confirme immédiatement une inscription ouverte quand une place reste disponible', () => {
    expect(decidePressConferenceRegistration({
      registrationMode: 'open', capacity: 10, occupied: 9, existingStatus: null,
    })).toEqual({ allowed: true, status: 'registered' });
  });

  it('place en attente sans dépasser la capacité', () => {
    expect(decidePressConferenceRegistration({
      registrationMode: 'open', capacity: 10, occupied: 10, existingStatus: null,
    })).toEqual({ allowed: true, status: 'waitlisted' });
  });

  it('soumet à validation RP en mode approbation', () => {
    expect(decidePressConferenceRegistration({
      registrationMode: 'approval', capacity: 1, occupied: 1, existingStatus: null,
    })).toEqual({ allowed: true, status: 'pending' });
  });

  it('refuse une session sur invitation en l’absence d’invitation', () => {
    expect(decidePressConferenceRegistration({
      registrationMode: 'invite_only', capacity: null, occupied: 0, existingStatus: null,
    })).toEqual({ allowed: false, reason: 'invitation_required' });
  });

  it('applique la capacité à une invitation confirmée', () => {
    expect(decidePressConferenceRegistration({
      registrationMode: 'invite_only', capacity: 20, occupied: 20, existingStatus: 'invited',
    })).toEqual({ allowed: true, status: 'waitlisted' });
  });

  it('reste idempotent pour une inscription déjà confirmée', () => {
    expect(decidePressConferenceRegistration({
      registrationMode: 'open', capacity: 1, occupied: 1, existingStatus: 'registered',
    })).toEqual({ allowed: true, status: 'registered' });
  });
});
