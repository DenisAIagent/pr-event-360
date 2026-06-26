import { Link } from 'react-router-dom';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { AdminBar } from '../components/AdminBar';
import { PageHero } from '../components/PageHero';
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
        <PageHero
          eyebrow="Tableau de bord"
          title="Vos événements"
          subtitle={
            data ? `${data.length} événement${data.length > 1 ? 's' : ''} · relations presse à 360°` : '…'
          }
          action={
            canCreate && (
              <Link to="/admin/events/new" className="btn btn-primary">
                Nouvel événement
              </Link>
            )
          }
        />

        {loading && <p className="muted">Chargement…</p>}
        {error && <div className="banner banner-error">{error}</div>}

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {data?.map((ev) => (
            <Link key={ev.id} to={`/admin/events/${ev.id}`} className="event-card">
              <h3 style={{ fontSize: 'var(--text-lg)' }}>{ev.name}</h3>
              <p className="muted" style={{ margin: 'var(--space-1) 0 var(--space-3)', fontSize: 'var(--text-sm)' }}>
                {ev.location ?? 'Lieu non précisé'}
              </p>
              <div className="event-card-foot">
                <span className="inline-actions" style={{ gap: 4 }}>
                  {ev.languages.map((l) => (
                    <span key={l} className="lang-pill">
                      {l.toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="event-card-go">Ouvrir →</span>
              </div>
            </Link>
          ))}
          {data?.length === 0 && !loading && (
            <p className="muted">
              Aucun événement.{' '}
              {canCreate && (
                <Link to="/admin/events/new" className="auth-link">
                  Créez-en un →
                </Link>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
