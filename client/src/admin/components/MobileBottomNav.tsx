import { NavLink, useMatch } from 'react-router-dom';
import { Inbox, UserCheck, CalendarCheck, LayoutGrid, Menu } from 'lucide-react';
import { useMobileNav } from './AdminShell';

/**
 * Barre de navigation basse (mobile uniquement, CSS).
 * Raccourcis terrain quand un événement est actif.
 */
export function MobileBottomNav() {
  const match = useMatch('/admin/events/:eventId/*');
  const eventId = match?.params.eventId;
  const { openMenu } = useMobileNav();

  if (!eventId) {
    return (
      <nav className="m-bottom-nav" aria-label="Navigation mobile">
        <NavLink to="/admin" end className={({ isActive }) => `m-tab${isActive ? ' active' : ''}`}>
          <LayoutGrid size={20} />
          <span>Événements</span>
        </NavLink>
        <button type="button" className="m-tab" onClick={openMenu}>
          <Menu size={20} />
          <span>Menu</span>
        </button>
      </nav>
    );
  }

  const base = `/admin/events/${eventId}`;
  return (
    <nav className="m-bottom-nav" aria-label="Navigation mobile">
      <NavLink to={`${base}/requests`} className={({ isActive }) => `m-tab${isActive ? ' active' : ''}`}>
        <Inbox size={20} />
        <span>Demandes</span>
      </NavLink>
      <NavLink to={`${base}/accreditations`} className={({ isActive }) => `m-tab${isActive ? ' active' : ''}`}>
        <UserCheck size={20} />
        <span>Accrédités</span>
      </NavLink>
      <NavLink to={`${base}/jour`} className={({ isActive }) => `m-tab m-tab-primary${isActive ? ' active' : ''}`}>
        <CalendarCheck size={20} />
        <span>Jour J</span>
      </NavLink>
      <button type="button" className="m-tab" onClick={openMenu}>
        <Menu size={20} />
        <span>Menu</span>
      </button>
    </nav>
  );
}
