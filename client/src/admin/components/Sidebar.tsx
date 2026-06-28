import { useEffect, useState } from 'react';
import { Link, NavLink, useMatch } from 'react-router-dom';
import {
  Inbox,
  UserCheck,
  SlidersHorizontal,
  Image,
  Newspaper,
  Megaphone,
  Settings,
  Palette,
  Eye,
  MessageSquare,
  LayoutGrid,
  Users,
  Plug,
  Compass,
  LogOut,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { IntroTour } from './IntroTour';
import type { EventSummary } from '../lib/types';

const TOUR_SEEN_KEY = 'pr360.introSeen';

interface NavDef {
  to: string;
  label: string;
  icon: LucideIcon;
}

function NavItem({ to, label, icon: Icon, end }: NavDef & { end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

/** Rail navy : marque, sélecteur d'événement, navigation contextuelle, utilisateur. */
export function Sidebar() {
  const { user, logout } = useAuth();
  const api = useAuthedApi();
  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'admin' || user?.role === 'attache';
  const [tourOpen, setTourOpen] = useState(false);

  // Visite guidée à la première connexion (logique reprise de l'ancien AdminBar).
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_SEEN_KEY)) {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        setTourOpen(true);
      }
    } catch {
      /* localStorage indisponible */
    }
  }, []);

  const match = useMatch('/admin/events/:eventId/*');
  const eventId = match?.params.eventId ?? null;
  const events = useFetch<EventSummary[]>(() => api.get<EventSummary[]>('/admin/events'), []);
  const activeEvent = eventId ? events.data?.find((e) => e.id === eventId) ?? null : null;

  const initials =
    (user?.fullName ?? '')
      .split(' ')
      .map((s) => s[0])
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';
  const roleLabel =
    user?.role === 'admin' ? 'Administrateur' : user?.role === 'attache' ? 'Attaché de presse' : 'Assistant';

  const base = eventId ? `/admin/events/${eventId}` : '';
  const PRIMARY: NavDef[] = [
    { to: `${base}/requests`, label: 'Demandes', icon: Inbox },
    { to: `${base}/accreditations`, label: 'Accréditations', icon: UserCheck },
  ];
  const CONTENU: NavDef[] = [
    { to: `${base}/media`, label: 'Médiathèque', icon: Image },
    { to: `${base}/newsroom`, label: 'Newsroom', icon: Newspaper },
    { to: `${base}/communications`, label: 'Communications', icon: Megaphone },
  ];
  const REGLAGES: NavDef[] = [
    { to: `${base}/settings`, label: 'Paramètres', icon: Settings },
    { to: `${base}/branding`, label: 'Apparence', icon: Palette },
    { to: `${base}/preview`, label: 'Aperçu', icon: Eye },
    { to: `${base}/messages`, label: 'Messages', icon: MessageSquare },
  ];

  return (
    <aside className="rail">
      <div className="brand">
        <Link to="/admin" style={{ display: 'inline-flex' }}>
          <img src="/brand/logo-pr-event-360-reversed.png" alt="PR Event 360" className="brand-mark" />
        </Link>
      </div>

      <Link to="/admin" className="ev-switch">
        <div className="lbl">{eventId ? 'Événement actif' : 'Tableau de bord'}</div>
        <div className="val">
          <strong>{activeEvent?.name ?? 'Tous les événements'}</strong>
          <ChevronDown size={15} />
        </div>
      </Link>

      <nav>
        {eventId && (
          <>
            {PRIMARY.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
            {isEditor && <NavItem to={`${base}/lineup`} label="Configuration" icon={SlidersHorizontal} />}

            {isEditor && (
              <>
                <div className="nav-group">Contenu</div>
                {CONTENU.map((n) => (
                  <NavItem key={n.to} {...n} />
                ))}
                <div className="nav-group">Réglages</div>
                {REGLAGES.map((n) => (
                  <NavItem key={n.to} {...n} />
                ))}
              </>
            )}
            {!isEditor && <NavItem to={`${base}/messages`} label="Messages" icon={MessageSquare} />}

            <div className="nav-group">Back-office</div>
          </>
        )}

        <NavItem to="/admin" label="Événements" icon={LayoutGrid} end />
        {isAdmin && (
          <>
            <NavItem to="/admin/team" label="Équipe" icon={Users} />
            <NavItem to="/admin/integrations" label="Intégrations" icon={Plug} />
          </>
        )}
      </nav>

      <div className="rail-foot">
        <div className="ava">{initials}</div>
        <Link to="/admin/security" className="who" title="Sécurité du compte">
          <b>{user?.fullName}</b>
          <span>{roleLabel}</span>
        </Link>
        <div className="rail-foot-actions">
          <button onClick={() => setTourOpen(true)} title="Découvrir l’application" aria-label="Découvrir">
            <Compass size={16} />
          </button>
          <button onClick={logout} title="Déconnexion" aria-label="Déconnexion">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <IntroTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </aside>
  );
}
