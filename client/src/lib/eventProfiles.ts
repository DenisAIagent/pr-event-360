export const EVENT_TYPES = ['music', 'trade_show', 'conference', 'corporate', 'other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

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

export const EVENT_PROFILES: Record<EventType, EventProfile> = {
  music: {
    type: 'music', label: 'Festival / concert', description: 'Artistes, scènes, interviews et accès photo/vidéo.',
    participantSingular: 'Artiste', participantPlural: 'Artistes', venueSingular: 'Scène', venuePlural: 'Scènes',
    setupStepLabel: 'Scènes & artistes', programLabel: 'Line-up',
  },
  trade_show: {
    type: 'trade_show', label: 'Salon / foire', description: 'Exposants, marques, stands et espaces de rencontre.',
    participantSingular: 'Exposant', participantPlural: 'Exposants', venueSingular: 'Espace', venuePlural: 'Espaces',
    setupStepLabel: 'Espaces & exposants', programLabel: 'Exposants',
  },
  conference: {
    type: 'conference', label: 'Conférence / séminaire', description: 'Intervenants, salles, sessions et créneaux presse.',
    participantSingular: 'Intervenant', participantPlural: 'Intervenants', venueSingular: 'Salle', venuePlural: 'Salles',
    setupStepLabel: 'Salles & intervenants', programLabel: 'Programme',
  },
  corporate: {
    type: 'corporate', label: 'Événement corporate', description: 'Porte-paroles, lancements, conventions et rencontres presse.',
    participantSingular: 'Porte-parole', participantPlural: 'Porte-paroles', venueSingular: 'Espace', venuePlural: 'Espaces',
    setupStepLabel: 'Espaces & porte-paroles', programLabel: 'Programme',
  },
  other: {
    type: 'other', label: 'Autre événement', description: 'Un profil générique pour tout autre format événementiel.',
    participantSingular: 'Participant', participantPlural: 'Participants', venueSingular: 'Espace', venuePlural: 'Espaces',
    setupStepLabel: 'Espaces & participants', programLabel: 'Programme',
  },
};

export function getEventProfile(type: EventType | null | undefined): EventProfile {
  return EVENT_PROFILES[type ?? 'music'] ?? EVENT_PROFILES.music;
}

type PublicLang = 'fr' | 'en' | 'pt' | 'es';

const PUBLIC_TERMS: Record<PublicLang, Record<EventType, { participant: string; venue: string }>> = {
  fr: {
    music: { participant: 'Artiste', venue: 'Scène' }, trade_show: { participant: 'Exposant', venue: 'Espace' },
    conference: { participant: 'Intervenant', venue: 'Salle' }, corporate: { participant: 'Porte-parole', venue: 'Espace' },
    other: { participant: 'Participant', venue: 'Espace' },
  },
  en: {
    music: { participant: 'Artist', venue: 'Stage' }, trade_show: { participant: 'Exhibitor', venue: 'Area' },
    conference: { participant: 'Speaker', venue: 'Room' }, corporate: { participant: 'Spokesperson', venue: 'Area' },
    other: { participant: 'Participant', venue: 'Area' },
  },
  pt: {
    music: { participant: 'Artista', venue: 'Palco' }, trade_show: { participant: 'Expositor', venue: 'Espaço' },
    conference: { participant: 'Orador', venue: 'Sala' }, corporate: { participant: 'Porta-voz', venue: 'Espaço' },
    other: { participant: 'Participante', venue: 'Espaço' },
  },
  es: {
    music: { participant: 'Artista', venue: 'Escenario' }, trade_show: { participant: 'Expositor', venue: 'Espacio' },
    conference: { participant: 'Ponente', venue: 'Sala' }, corporate: { participant: 'Portavoz', venue: 'Espacio' },
    other: { participant: 'Participante', venue: 'Espacio' },
  },
};

export function getPublicEventTerms(type: EventType, lang: PublicLang) {
  return PUBLIC_TERMS[lang]?.[type] ?? PUBLIC_TERMS.fr[type];
}
