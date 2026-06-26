import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

/** Barre supérieure du back-office : marque, navigation globale, utilisateur. */
export function AdminBar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

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
    </div>
  );
}
