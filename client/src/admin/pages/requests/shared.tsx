import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { QueueItem, RequestStatus, RequestType } from '../../lib/types';
import { SETTABLE_STATUSES, STATUS_LABEL, TYPE_LABEL, formatSlot } from '../../lib/labels';
import { InfoBubble } from '../../components/InfoBubble';

export type View = 'queue' | 'byArtist' | 'byStage' | 'planning';

export const QUEUE_COLUMNS = ['Score', 'Type', 'Journaliste', 'Média', 'Email', 'Statut'];
export const PLANNING_COLUMNS = ['Créneau', 'Artiste', 'Journaliste', 'Média', 'Statut'];

export const TYPE_FILTERS: { value: RequestType | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'interview', label: 'Interviews' },
  { value: 'photo_report', label: 'Reportages photo' },
  { value: 'video_report', label: 'Reportages vidéo' },
];

export const ALL_STATUSES: RequestStatus[] = [
  'pas_encore_traite',
  'en_cours',
  'transmise_prod',
  'attente_artiste',
  'acceptee',
  'refusee',
  'liste_attente',
];

/** Message de confirmation adapté au changement de statut d'une demande. */
export function statusMessage(status: RequestStatus): string {
  if (status === 'acceptee') return 'Demande acceptée.';
  if (status === 'refusee') return 'Demande refusée.';
  if (status === 'liste_attente') return "Demande placée en liste d'attente.";
  return `Statut mis à jour : ${STATUS_LABEL[status]}.`;
}

export function requesterName(item: QueueItem): string {
  return `${item.requester.firstName} ${item.requester.lastName ?? ''}`.trim();
}

export function toCells(item: QueueItem): string[] {
  const slot = formatSlot(item.subject);
  return [
    String(Math.round(item.score)),
    `${TYPE_LABEL[item.type]}${slot ? ` (${slot})` : ''}`,
    requesterName(item),
    item.requester.media ?? '—',
    item.requester.email,
    STATUS_LABEL[item.status],
  ];
}

export function timeRange(item: QueueItem): string {
  const s = item.subject.slotStart?.slice(0, 5) ?? '';
  const e = item.subject.slotEnd?.slice(0, 5);
  return e ? `${s}–${e}` : s;
}

export function nowStr(): string {
  return new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}

/** Filtre de statut (barre d'outils), partagé par les trois vues. */
export function StatusFilter({
  value,
  onChange,
}: {
  value: RequestStatus | 'all';
  onChange: (s: RequestStatus | 'all') => void;
}) {
  return (
    <select
      className="status-select"
      value={value}
      onChange={(e) => onChange(e.target.value as RequestStatus | 'all')}
      aria-label="Filtrer par statut"
    >
      <option value="all">Tous les statuts</option>
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

/**
 * Sélecteur de changement de statut d'une demande — source unique de vérité,
 * partagée par les 3 rendus de ligne (file, groupé, planning). Auparavant
 * dupliqué verbatim trois fois.
 */
export function StatusSelect({
  item,
  onChange,
}: {
  item: QueueItem;
  onChange: (id: string, s: RequestStatus) => void;
}) {
  const settable = SETTABLE_STATUSES.includes(item.status);
  return (
    <select
      className="status-select"
      value={settable ? item.status : ''}
      onChange={(e) => onChange(item.id, e.target.value as RequestStatus)}
      aria-label="Changer le statut"
    >
      {!settable && <option value="">{STATUS_LABEL[item.status]} → …</option>}
      {SETTABLE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

export function Kpi({
  num,
  label,
  icon: KpiIcon,
  variant = 'k-navy',
  help,
}: {
  num: number;
  label: string;
  icon: LucideIcon;
  variant?: string;
  help?: React.ReactNode;
}) {
  return (
    <div className={`kpi ${variant}`}>
      <div className="top">
        <div className="ico">
          <KpiIcon size={16} />
        </div>
        {help && <InfoBubble>{help}</InfoBubble>}
      </div>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}
