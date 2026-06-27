import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useParams, useLocation, Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { EventSummary } from '../lib/types';
import { CopyLink } from '../components/CopyLink';
import { PageHero } from '../components/PageHero';
import { Countdown } from '../../components/Countdown';
import { Icon } from '../../components/Icon';

type Tab = { to: string; label: string; editorOnly?: boolean };

// 3 onglets « cœur » à plat ; le reste regroupé pour rester sous la limite de Miller.
const PRIMARY: Tab[] = [
  { to: 'requests', label: 'Demandes' },
  { to: 'accreditations', label: 'Accréditations' },
  { to: 'lineup', label: 'Configuration', editorOnly: true },
];
const CONTENU: Tab[] = [
  { to: 'media', label: 'Médiathèque' },
  { to: 'newsroom', label: 'Newsroom' },
  { to: 'communications', label: 'Communications' },
];
const REGLAGES: Tab[] = [
  { to: 'settings', label: 'Paramètres' },
  { to: 'branding', label: 'Apparence' },
  { to: 'preview', label: 'Aperçu' },
  { to: 'messages', label: 'Messages' },
];

/** Menu déroulant groupant des onglets secondaires. Reste « actif » si un enfant l'est. */
function TabGroup({ label, items }: { label: string; items: Tab[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const active = items.some((it) => pathname.endsWith(`/${it.to}`));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="tab-group" ref={ref}>
      <button
        type="button"
        className={`tab-group-btn${active ? ' active' : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label} <ChevronDown size={15} />
      </button>
      {open && (
        <div className="tab-group-menu">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}
            >
              {it.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export function EventLayout() {
  const { eventId = '' } = useParams();
  const { user, logout } = useAuth();
  const isEditor = user?.role === 'admin' || user?.role === 'attache';
  const primaryVisible = PRIMARY.filter((t) => !t.editorOnly || isEditor);
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
            <Link to="/admin" style={{ display: 'inline-flex' }}>
              <img src="/brand/logo-pr-event-360-reversed.png" alt="PR Event 360" className="brand-mark" />
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
        <PageHero
          eyebrow={
            <Link to="/admin" style={{ color: 'inherit', textDecoration: 'none' }}>
              ← Tous les événements
            </Link>
          }
          title={event?.name ?? '…'}
          subtitle={
            event
              ? `${event.location ?? 'Lieu non précisé'} · ${event.languages.map((l) => l.toUpperCase()).join(' / ')}`
              : undefined
          }
        />

        <section className="share-card">
          <div className="share-head">
            <strong>Lien d'inscription des journalistes</strong>
            <span className="muted">À partager (réseaux, email, site presse…)</span>
          </div>
          <CopyLink url={`${window.location.origin}/accreditation/${eventId}`} />
          {event?.accreditationDeadline && (
            <div className="deadline-card" style={{ marginTop: 'var(--space-3)' }}>
              <div className="deadline-head">
                <span className="deadline-icon" aria-hidden="true"><Icon name="clock" /></span>
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
          {primaryVisible.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'active' : '')}>
              {t.label}
            </NavLink>
          ))}
          {isEditor ? (
            <>
              <TabGroup label="Contenu" items={CONTENU} />
              <TabGroup label="Réglages" items={REGLAGES} />
            </>
          ) : (
            <NavLink to="messages" className={({ isActive }) => (isActive ? 'active' : '')}>
              Messages
            </NavLink>
          )}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
