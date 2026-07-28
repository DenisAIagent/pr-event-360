import type {
  PressConferenceRegistrationMode,
  PressConferenceRegistrationStatus,
} from '../types.js';

export interface PressConferenceRegistrationDecisionInput {
  registrationMode: PressConferenceRegistrationMode;
  capacity: number | null;
  occupied: number;
  existingStatus: PressConferenceRegistrationStatus | null;
}

export type PressConferenceRegistrationDecision =
  | { allowed: true; status: PressConferenceRegistrationStatus }
  | { allowed: false; reason: 'invitation_required' };

/** Décision pure ; le verrouillage et l'éligibilité restent à la charge du service appelant. */
export function decidePressConferenceRegistration(
  input: PressConferenceRegistrationDecisionInput,
): PressConferenceRegistrationDecision {
  if (input.existingStatus === 'registered' || input.existingStatus === 'checked_in') {
    return { allowed: true, status: input.existingStatus };
  }
  if (
    input.registrationMode === 'invite_only'
    && input.existingStatus !== 'invited'
    && input.existingStatus !== 'waitlisted'
  ) {
    return { allowed: false, reason: 'invitation_required' };
  }
  if (input.registrationMode === 'approval' && input.existingStatus !== 'invited') {
    return { allowed: true, status: 'pending' };
  }
  if (input.capacity != null && input.occupied >= input.capacity) {
    return { allowed: true, status: 'waitlisted' };
  }
  return { allowed: true, status: 'registered' };
}
