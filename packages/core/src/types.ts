/**
 * Types & enums du domaine — source de vérité unique, partagée par le serveur
 * et le moteur métier. Les valeurs des chaînes correspondent EXACTEMENT aux
 * enums PostgreSQL (voir les migrations) pour éviter toute désynchronisation.
 *
 * Module 0 : types uniquement. Les fonctions pures (génération de créneaux,
 * score de priorité, quotas, promotion liste d'attente) arrivent au Module 1.
 */

export const LANGS = ['fr', 'en', 'pt', 'es'] as const;
export type Lang = (typeof LANGS)[number];

export const EVENT_TYPES = ['music', 'trade_show', 'conference', 'corporate', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const PRESS_CONFERENCE_STATUSES = ['draft', 'published', 'closed', 'completed'] as const;
export type PressConferenceStatus = (typeof PRESS_CONFERENCE_STATUSES)[number];

export const PRESS_CONFERENCE_REGISTRATION_MODES = ['open', 'approval', 'invite_only'] as const;
export type PressConferenceRegistrationMode = (typeof PRESS_CONFERENCE_REGISTRATION_MODES)[number];

export const PRESS_CONFERENCE_REGISTRATION_STATUSES = [
  'invited',
  'pending',
  'registered',
  'waitlisted',
  'declined',
  'checked_in',
  'cancelled',
] as const;
export type PressConferenceRegistrationStatus =
  (typeof PRESS_CONFERENCE_REGISTRATION_STATUSES)[number];

export const ACCREDITATION_TYPES = ['presse', 'photo', 'video'] as const;
export type AccreditationType = (typeof ACCREDITATION_TYPES)[number];

export const ACCREDITATION_STATUSES = ['pas_encore_traite', 'acceptee', 'refusee'] as const;
export type AccreditationStatus = (typeof ACCREDITATION_STATUSES)[number];

export const REQUEST_TYPES = ['interview', 'photo_report', 'video_report'] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_STATUSES = [
  'pas_encore_traite',
  'en_cours',
  'transmise_prod',
  'attente_artiste',
  'acceptee',
  'refusee',
  'liste_attente',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/**
 * Statuts qui consomment une place de quota (interviews accordées).
 * Référence pour quotaService au Module 2.
 */
export const GRANTED_INTERVIEW_STATUSES: readonly RequestStatus[] = [
  'transmise_prod',
  'attente_artiste',
  'acceptee',
];

export const USER_ROLES = ['admin', 'attache', 'assistant'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Rôles autorisés à éditer la configuration d'un événement (hors traitement courant). */
export const EVENT_EDITOR_ROLES = ['admin', 'attache'] as const;
