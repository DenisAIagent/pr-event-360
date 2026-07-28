import type { EventType } from './types.js';

export interface EventProfile {
  type: EventType;
  label: string;
  description: string;
  participantSingular: string;
  participantPlural: string;
  venueSingular: string;
  venuePlural: string;
  setupStepLabel: string;
  programLabel: string;
}

/**
 * Taxonomie d'affichage. Les noms techniques `artist` et `stage` restent stables
 * dans l'API afin de préserver les événements historiques et leurs intégrations.
 */
export const EVENT_PROFILES: Record<EventType, EventProfile> = {
  music: {
    type: 'music',
    label: 'Festival / concert',
    description: 'Artistes, scènes, interviews et accès photo/vidéo.',
    participantSingular: 'Artiste',
    participantPlural: 'Artistes',
    venueSingular: 'Scène',
    venuePlural: 'Scènes',
    setupStepLabel: 'Scènes & artistes',
    programLabel: 'Line-up',
  },
  trade_show: {
    type: 'trade_show',
    label: 'Salon / foire',
    description: 'Exposants, marques, stands et espaces de rencontre.',
    participantSingular: 'Exposant',
    participantPlural: 'Exposants',
    venueSingular: 'Espace',
    venuePlural: 'Espaces',
    setupStepLabel: 'Espaces & exposants',
    programLabel: 'Exposants',
  },
  conference: {
    type: 'conference',
    label: 'Conférence / séminaire',
    description: 'Intervenants, salles, sessions et créneaux presse.',
    participantSingular: 'Intervenant',
    participantPlural: 'Intervenants',
    venueSingular: 'Salle',
    venuePlural: 'Salles',
    setupStepLabel: 'Salles & intervenants',
    programLabel: 'Programme',
  },
  corporate: {
    type: 'corporate',
    label: 'Événement corporate',
    description: 'Porte-paroles, lancements, conventions et rencontres presse.',
    participantSingular: 'Porte-parole',
    participantPlural: 'Porte-paroles',
    venueSingular: 'Espace',
    venuePlural: 'Espaces',
    setupStepLabel: 'Espaces & porte-paroles',
    programLabel: 'Programme',
  },
  other: {
    type: 'other',
    label: 'Autre événement',
    description: 'Un profil générique pour tout autre format événementiel.',
    participantSingular: 'Participant',
    participantPlural: 'Participants',
    venueSingular: 'Espace',
    venuePlural: 'Espaces',
    setupStepLabel: 'Espaces & participants',
    programLabel: 'Programme',
  },
};

export function getEventProfile(type: EventType | null | undefined): EventProfile {
  return EVENT_PROFILES[type ?? 'music'] ?? EVENT_PROFILES.music;
}
