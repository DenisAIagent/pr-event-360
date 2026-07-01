import { useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { MapPin, CalendarDays, Languages, Music2, Link2, Check } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSummary } from '../lib/types';
import { useToast } from '../components/Toast';

function formatRange(start: string | null, end: string | null): string {
  if (!start) return '';
  const s = new Date(start);
  if (!end) return s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const e = new Date(end);
  return `${s.toLocaleDateString('fr-FR', { day: 'numeric' })}–${e.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })}`;
}

function daysUntil(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

/** Coquille d'un événement : bandeau de contexte + contenu d'onglet (Outlet). */
export function EventLayout() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const { data: event } = useFetch<EventSummary>(
    () => apiAuthed.get<EventSummary>(`/admin/events/${eventId}`),
    [eventId],
  );

  async function copyRegistration() {
    const url = `${window.location.origin}/accreditation/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    toast.success('Lien d’inscription copié.');
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="stack">
      <div className="ev-banner">
        <div className="ev-ico">
          <Music2 size={24} />
        </div>
        <div className="ev-meta">
          <h2>{event?.name ?? '…'}</h2>
          <p>
            <span>
              <MapPin size={13} /> {event?.location ?? 'Lieu non précisé'}
            </span>
            {event?.startDate && (
              <span>
                <CalendarDays size={13} /> {formatRange(event.startDate, event.endDate)}
              </span>
            )}
            {event && event.languages.length > 0 && (
              <span>
                <Languages size={13} /> {event.languages.map((l) => l.toUpperCase()).join(' · ')}
              </span>
            )}
          </p>
        </div>
        <div className="ev-actions">
          <button type="button" className="ev-share" onClick={copyRegistration}>
            {copied ? <Check size={14} /> : <Link2 size={14} />}
            {copied ? 'Lien copié' : "Copier le lien d'inscription"}
          </button>
          {event?.accreditationDeadline && (
            <div className="deadline">
              <div className="k">Clôture accréditations</div>
              <div className="v">
                J–<small>{daysUntil(event.accreditationDeadline)}</small>
              </div>
            </div>
          )}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
