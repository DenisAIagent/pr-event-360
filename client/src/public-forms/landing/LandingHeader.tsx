import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PRIMARY_CTA_LABEL } from '../../lib/contact';
// Le composant porte ses propres styles : les pages légales et le centre de
// ressources n'importent pas la feuille de la landing.
import './landing.css';

/**
 * En-tête public partagé par la landing, le centre de ressources et les pages
 * légales — ces dernières n'avaient auparavant aucune navigation, leur seul
 * retour étant un lien en bas de page.
 *
 * Les ancres pointent vers `/#…` et non `#…` : depuis `/ressources`, un simple
 * fragment ne mènerait nulle part. Quand le chemin courant est déjà `/`, le
 * navigateur traite `/#features` comme un saut d'ancre, sans recharger.
 */
export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header className="lp-header">
      <div className="lp-wrap lp-header-inner">
        <Link to="/" className="lp-logo" aria-label="PR Event 360 — accueil">
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" />
        </Link>

        <nav className="lp-nav" aria-label="Navigation principale">
          <a href="/#features">Fonctionnalités</a>
          <a href="/#pricing">Tarifs</a>
          <Link to="/ressources">Ressources</Link>
        </nav>

        <div className="lp-header-actions">
          <Link to="/admin/login" className="lp-login">
            Connexion
          </Link>
          <Link className="btn btn-primary btn-sm" to="/admin/abonnement">
            {PRIMARY_CTA_LABEL}
          </Link>
        </div>

        <button
          type="button"
          className="lp-burger"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <div id={panelId} className={`lp-panel${open ? ' is-open' : ''}`} hidden={!open}>
        <nav className="lp-panel-nav" aria-label="Navigation mobile">
          <a href="/#features" onClick={close}>
            Fonctionnalités
          </a>
          <a href="/#pricing" onClick={close}>
            Tarifs
          </a>
          <Link to="/ressources" onClick={close}>
            Ressources
          </Link>
          <Link to="/admin/login" onClick={close}>
            Connexion
          </Link>
          <Link className="btn btn-primary" to="/admin/abonnement" onClick={close}>
            {PRIMARY_CTA_LABEL}
          </Link>
        </nav>
      </div>
    </header>
  );
}
