import { Link, useLocation, useMatch } from 'react-router-dom';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSummary } from '../lib/types';

const PAGE_LABEL: Record<string, string> = {
  requests: 'Demandes',
  accreditations: 'Accréditations',
  lineup: 'Configuration',
  media: 'Médiathèque',
  newsroom: 'Newsroom',
  communications: 'Communications',
  settings: 'Paramètres',
  branding: 'Apparence',
  preview: 'Aperçu',
  messages: 'Messages',
  team: 'Équipe',
  integrations: 'Intégrations',
  security: 'Sécurité du compte',
  new: 'Nouvel événement',
};

/** Barre supérieure du workspace : fil d'ariane, recherche, notifications. */
export function Topbar() {
  const api = useAuthedApi();
  const loc = useLocation();
  const match = useMatch('/admin/events/:eventId/*');
  const eventId = match?.params.eventId ?? null;
  const events = useFetch<EventSummary[]>(() => api.get<EventSummary[]>('/admin/events'), []);
  const ev = eventId ? events.data?.find((e) => e.id === eventId) ?? null : null;

  const segments = loc.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  const pageLabel = PAGE_LABEL[last] ?? 'Vos événements';

  return (
    <header className="topbar">
      <div className="crumbs">
        {ev ? (
          <>
            <span>{ev.name}</span>
            <ChevronRight size={13} />
            <b>{pageLabel}</b>
          </>
        ) : (
          <b>{pageLabel}</b>
        )}
      </div>
      <div className="spacer" />
      <div className="search">
        <Search size={16} />
        <input placeholder="Rechercher un journaliste, un média…" aria-label="Rechercher" />
      </div>
      <Link
        to={eventId ? `/admin/events/${eventId}/messages` : '/admin'}
        className="icon-btn"
        title="Messages & notifications"
        aria-label="Messages"
      >
        <Bell size={18} />
      </Link>
    </header>
  );
}
