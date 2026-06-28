import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Coquille du back-office : rail navy à gauche + workspace (topbar + contenu routé). */
export function AdminShell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="work">
        <Topbar />
        <div className="canvas">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
