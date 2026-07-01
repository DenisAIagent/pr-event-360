import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { PageHero } from '../components/PageHero';
import { SkeletonCards } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
// shell fourni par AdminShell — la page ne rend que son contenu
import type { EventSummary } from '../lib/types';

export function EventsListPage() {
  const { user } = useAuth();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<EventSummary[]>(
    () => apiAuthed.get<EventSummary[]>('/admin/events'),
    [],
  );

  const canCreate = user?.role === 'admin' || user?.role === 'attache';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="stack">
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

        {loading && <SkeletonCards count={6} />}
        {error && <div className="banner banner-error">{error}</div>}

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {data?.map((ev) => (
            <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onDeleted={reload} />
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
  );
}

function EventCard({ ev, isAdmin, onDeleted }: { ev: EventSummary; isAdmin: boolean; onDeleted: () => void }) {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !(await confirm({
        title: 'Supprimer l’événement',
        message: `Supprimer définitivement « ${ev.name} » ? Tous les journalistes, demandes, communications, médias et réglages de cet événement seront effacés. Cette action est irréversible.`,
        confirmLabel: 'Tout supprimer',
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      await apiAuthed.delete(`/admin/events/${ev.id}`);
      toast.success(`Événement « ${ev.name} » supprimé.`);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <Link to={`/admin/events/${ev.id}`} className="event-card">
        <h3 style={{ fontSize: 'var(--text-lg)', paddingRight: isAdmin ? 'var(--space-5)' : 0 }}>{ev.name}</h3>
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
      {isAdmin && (
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          title="Supprimer l'événement"
          aria-label={`Supprimer ${ev.name}`}
          className="btn btn-ghost btn-sm"
          style={{
            position: 'absolute',
            top: 'var(--space-2)',
            right: 'var(--space-2)',
            color: 'var(--color-danger)',
            padding: '4px 6px',
            display: 'inline-flex',
          }}
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  );
}
