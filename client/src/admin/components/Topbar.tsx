import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronRight, UserRound, CalendarDays } from 'lucide-react';
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
  organizations: 'Organisations',
  integrations: 'Intégrations',
  avis: 'Votre avis',
  'avis-moderation': 'Modération des avis',
  security: 'Sécurité du compte',
  new: 'Nouvel événement',
};

interface JournalistHit {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  media: string | null;
  eventId: string;
  eventName: string;
}
interface SearchResults {
  journalists: JournalistHit[];
  events: { id: string; name: string }[];
}

const EMPTY: SearchResults = { journalists: [], events: [] };

/** Barre supérieure du workspace : fil d'ariane, recherche globale, notifications. */
export function Topbar() {
  const api = useAuthedApi();
  const navigate = useNavigate();
  const loc = useLocation();
  const match = useMatch('/admin/events/:eventId/*');
  const eventId = match?.params.eventId ?? null;
  const events = useFetch<EventSummary[]>(() => api.get<EventSummary[]>('/admin/events'), []);
  const ev = eventId ? events.data?.find((e) => e.id === eventId) ?? null : null;

  const segments = loc.pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  const pageLabel = PAGE_LABEL[last] ?? 'Vos événements';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Recherche debouncée : ≥ 2 caractères, course annulée si la saisie change.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await api.get<SearchResults>(`/admin/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) {
          setResults(res);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setResults(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, api]);

  // Fermeture au clic extérieur.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function go(to: string) {
    setOpen(false);
    setQuery('');
    setResults(EMPTY);
    navigate(to);
  }

  const q = query.trim();
  const hasResults = results.journalists.length > 0 || results.events.length > 0;

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

      <div className="search-wrap" ref={wrapRef}>
        <div className="search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => q.length >= 2 && setOpen(true)}
            placeholder="Rechercher un journaliste, un média…"
            aria-label="Rechercher"
          />
        </div>
        {open && q.length >= 2 && (
          <div className="search-results" role="listbox">
            {loading && !hasResults && <div className="sr-empty">Recherche…</div>}
            {!loading && !hasResults && <div className="sr-empty">Aucun résultat pour « {q} »</div>}

            {results.journalists.length > 0 && (
              <>
                <div className="sr-group">Journalistes</div>
                {results.journalists.map((j) => (
                  <button
                    key={j.id}
                    className="sr-item"
                    onClick={() => go(`/admin/events/${j.eventId}/accreditations`)}
                  >
                    <UserRound size={15} />
                    <span className="sr-main">
                      <strong>
                        {j.firstName} {j.lastName ?? ''}
                      </strong>
                      <span className="sr-sub">
                        {j.media ? `${j.media} · ` : ''}
                        {j.email} · {j.eventName}
                      </span>
                    </span>
                  </button>
                ))}
              </>
            )}

            {results.events.length > 0 && (
              <>
                <div className="sr-group">Événements</div>
                {results.events.map((e) => (
                  <button key={e.id} className="sr-item" onClick={() => go(`/admin/events/${e.id}/requests`)}>
                    <CalendarDays size={15} />
                    <span className="sr-main">
                      <strong>{e.name}</strong>
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {eventId && (
        <Link
          to={`/admin/events/${eventId}/messages`}
          className="icon-btn"
          title="Messages de l’événement"
          aria-label="Messages"
        >
          <Bell size={18} />
        </Link>
      )}
    </header>
  );
}
