import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSummary } from '../lib/types';
import { CopyLink } from '../components/CopyLink';
import { Countdown } from '../../components/Countdown';

const TABS = [
  { to: 'requests', label: 'Demandes' },
  { to: 'accreditations', label: 'Accréditations' },
  { to: 'lineup', label: 'Lineup & créneaux', editorOnly: true },
  { to: 'media', label: 'Médiathèque', editorOnly: true },
  { to: 'newsroom', label: 'Newsroom', editorOnly: true },
  { to: 'communications', label: 'Communications', editorOnly: true },
  { to: 'settings', label: 'Paramètres', editorOnly: true },
  { to: 'branding', label: 'Apparence', editorOnly: true },
  { to: 'preview', label: 'Aperçu', editorOnly: true },
  { to: 'messages', label: 'Messages' },
];

export function EventLayout() {
  const { eventId = '' } = useParams();
  const { user, logout } = useAuth();
  const isEditor = user?.role === 'admin' || user?.role === 'attache';
  const visibleTabs = TABS.filter((t) => !t.editorOnly || isEditor);
  const apiAuthed = useAuthedApi();
  const { data: event } = useFetch<EventSummary>(
    () => apiAuthed.get<EventSummary>(`/admin/events/${eventId}`),
    [eventId],
  );

  return (
    <div className="admin">
      <div className="admin-bar">
        <div className="admin-bar-inner">
          <div className="admin-brand">
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>
              PR Event <span>360</span>
            </Link>
          </div>
          <div className="admin-user">
            <span>{user?.fullName}</span>
            <button className="btn btn-ghost btn-sm" onClick={logout} style={{ color: 'var(--color-bg)' }}>
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="admin-shell">
        <Link to="/admin" className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          ← Tous les événements
        </Link>
        <h1 style={{ fontSize: 'var(--text-xl)', margin: 'var(--space-1) 0 var(--space-3)' }}>
          {event?.name ?? '…'}
        </h1>

        <section className="share-card">
          <div className="share-head">
            <strong>Lien d'inscription des journalistes</strong>
            <span className="muted">À partager (réseaux, email, site presse…)</span>
          </div>
          <CopyLink url={`${window.location.origin}/accreditation/${eventId}`} />
          {event?.accreditationDeadline && (
            <div className="deadline-card" style={{ marginTop: 'var(--space-3)' }}>
              <div className="deadline-head">
                <span className="deadline-icon" aria-hidden="true">⏳</span>
                <div>
                  <span className="deadline-label">Clôture des inscriptions</span>
                  <strong className="deadline-date">
                    {new Date(event.accreditationDeadline).toLocaleString('fr-FR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </strong>
                </div>
              </div>
              <Countdown deadline={event.accreditationDeadline} />
            </div>
          )}
          <ol className="share-steps">
            <li>Le journaliste ouvre ce lien et soumet sa demande d'accréditation.</li>
            <li>Vous l'acceptez dans l'onglet <strong>Accréditations</strong>.</li>
            <li>Il reçoit automatiquement par email un lien personnel vers le formulaire de demandes (interviews, reportages).</li>
            <li>Vous traitez ses demandes dans l'onglet <strong>Demandes</strong>.</li>
          </ol>
        </section>

        <nav className="tabs">
          {visibleTabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.label}
            </NavLink>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
