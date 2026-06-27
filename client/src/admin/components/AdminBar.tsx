import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { IntroTour } from './IntroTour';

const TOUR_SEEN_KEY = 'pr360.introSeen';

/** Barre supérieure du back-office : marque, navigation globale, utilisateur. */
export function AdminBar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [tourOpen, setTourOpen] = useState(false);

  // Ouvre la visite guidée automatiquement à la toute première connexion.
  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_SEEN_KEY)) {
        localStorage.setItem(TOUR_SEEN_KEY, '1');
        setTourOpen(true);
      }
    } catch {
      /* localStorage indisponible : on n'ouvre pas automatiquement. */
    }
  }, []);

  return (
    <div className="admin-bar">
      <div className="admin-bar-inner">
        <div className="admin-brand">
          <Link to="/admin" style={{ display: 'inline-flex' }}>
            <img src="/brand/logo-pr-event-360-reversed.png" alt="PR Event 360" className="brand-mark" />
          </Link>
        </div>

        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Événements
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/admin/team" className={({ isActive }) => (isActive ? 'active' : '')}>
                Équipe
              </NavLink>
              <NavLink to="/admin/integrations" className={({ isActive }) => (isActive ? 'active' : '')}>
                Intégrations
              </NavLink>
            </>
          )}
        </nav>

        <div className="admin-user">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setTourOpen(true)}
            style={{ color: 'var(--color-bg)' }}
            title="Découvrir l’application"
          >
            <Compass size={16} /> Découvrir
          </button>
          <span>{user?.fullName}</span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={logout}
            style={{ color: 'var(--color-bg)' }}
          >
            Déconnexion
          </button>
        </div>
      </div>

      <IntroTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
