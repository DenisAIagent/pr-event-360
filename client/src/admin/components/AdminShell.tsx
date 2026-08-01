import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileBottomNav } from './MobileBottomNav';

interface MobileNavCtx {
  open: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

const MobileNavContext = createContext<MobileNavCtx | null>(null);

export function useMobileNav(): MobileNavCtx {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav hors AdminShell');
  return ctx;
}

/** Coquille du back-office : rail navy + workspace, avec drawer + bottom nav mobile. */
export function AdminShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const openMenu = useCallback(() => setOpen(true), []);
  const closeMenu = useCallback(() => setOpen(false), []);
  const toggleMenu = useCallback(() => setOpen((v) => !v), []);

  // Ferme le drawer à chaque navigation.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Bloque le scroll body quand le menu est ouvert.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape ferme le menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const value: MobileNavCtx = { open, openMenu, closeMenu, toggleMenu };

  return (
    <MobileNavContext.Provider value={value}>
      <div className={`app${open ? ' nav-open' : ''}`}>
        {/* Backdrop mobile */}
        <button
          type="button"
          className="nav-backdrop"
          aria-label="Fermer le menu"
          tabIndex={open ? 0 : -1}
          onClick={closeMenu}
        />
        <Sidebar />
        <main className="work">
          <Topbar />
          <div className="canvas">
            <Outlet />
          </div>
          <MobileBottomNav />
        </main>
      </div>
    </MobileNavContext.Provider>
  );
}

/** Optionnel : wrapper pour tests / story. */
export function MobileNavProvider({ children, value }: { children: ReactNode; value: MobileNavCtx }) {
  return <MobileNavContext.Provider value={value}>{children}</MobileNavContext.Provider>;
}
