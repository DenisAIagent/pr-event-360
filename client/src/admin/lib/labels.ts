import type { AccStatus, RequestStatus, RequestType } from './types';

/** Libellés FR (back-office) — un bouton « Accepter » mène à l'état « Acceptée ». */
export const STATUS_LABEL: Record<RequestStatus, string> = {
  pas_encore_traite: 'Pas encore traité',
  en_cours: 'En cours de traitement',
  transmise_prod: 'Transmise à la prod artiste',
  attente_artiste: 'En attente de réponse artiste',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
  liste_attente: "Liste d'attente",
};

export const STATUS_BADGE: Record<RequestStatus, string> = {
  pas_encore_traite: 'badge-pending',
  en_cours: 'badge-progress',
  transmise_prod: 'badge-progress',
  attente_artiste: 'badge-progress',
  acceptee: 'badge-success',
  refusee: 'badge-danger',
  liste_attente: 'badge-waitlist',
};

export const ACC_STATUS_LABEL: Record<AccStatus, string> = {
  pas_encore_traite: 'Pas encore traité',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
};

export const TYPE_LABEL: Record<RequestType, string> = {
  interview: 'Interview',
  photo_report: 'Reportage photo',
  video_report: 'Reportage vidéo',
};

// Transitions proposées dans la file (le statut « liste_attente » est système).
export const SETTABLE_STATUSES: RequestStatus[] = [
  'pas_encore_traite',
  'en_cours',
  'transmise_prod',
  'attente_artiste',
  'acceptee',
  'refusee',
];

/** Date d'un créneau (YYYY-MM-DD) → « lun. 10 juil. ». */
export function formatSlotDate(slotDay: string | null): string {
  if (!slotDay) return '';
  const d = new Date(`${slotDay}T00:00:00`);
  if (Number.isNaN(d.getTime())) return slotDay;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Créneau complet → « lun. 10 juil. · 14:00–14:15 », ou null si pas de créneau. */
export function formatSlot(subject: {
  slotDay: string | null;
  slotStart: string | null;
  slotEnd: string | null;
}): string | null {
  if (!subject.slotDay || !subject.slotStart) return null;
  const time = `${subject.slotStart.slice(0, 5)}${subject.slotEnd ? `–${subject.slotEnd.slice(0, 5)}` : ''}`;
  return `${formatSlotDate(subject.slotDay)} · ${time}`;
}

export const TRIGGER_LABEL: Record<string, string> = {
  accreditation_received: "Réception d'accréditation",
  accreditation_accepted: "Acceptation d'accréditation",
  accreditation_rejected: "Refus d'accréditation",
  request_received: 'Réception de demande',
  request_accepted: 'Acceptation de demande',
  request_rejected: 'Refus de demande',
};
