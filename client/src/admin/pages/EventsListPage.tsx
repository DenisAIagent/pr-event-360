import { Link } from 'react-router-dom';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { AdminBar } from '../components/AdminBar';
import type { EventSummary } from '../lib/types';

export function EventsListPage() {
  const { user } = useAuth();
  const apiAuthed = useAuthedApi();
  const { data, loading, error } = useFetch<EventSummary[]>(
    () => apiAuthed.get<EventSummary[]>('/admin/events'),
    [],
  );

  const canCreate = user?.role === 'admin' || user?.role === 'attache';

  return (
    <div className="admin">
      <AdminBar />

      <div className="admin-shell">
        <div className="section-head">
          <h1 style={{ fontSize: 'var(--text-xl)' }}>Événements</h1>
          {canCreate && (
            <Link to="/admin/events/new" className="btn btn-primary btn-sm">
              Nouvel événement
            </Link>
          )}
        </div>

        {loading && <p className="muted">Chargement…</p>}
        {error && <div className="banner banner-error">{error}</div>}

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {data?.map((ev) => (
            <Link key={ev.id} to={`/admin/events/${ev.id}`} className="event-card">
              <h3 style={{ fontSize: 'var(--text-lg)' }}>{ev.name}</h3>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)' }}>
                {ev.location ?? '—'} · {ev.languages.map((l) => l.toUpperCase()).join(' / ')}
              </p>
            </Link>
          ))}
          {data?.length === 0 && !loading && (
            <p className="muted">
              Aucun événement.{' '}
              {canCreate && <Link to="/admin/events/new" className="auth-link">Créez-en un →</Link>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
