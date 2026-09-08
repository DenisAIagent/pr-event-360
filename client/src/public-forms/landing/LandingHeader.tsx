import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { PRIMARY_CTA_LABEL } from '../../lib/contact';
// Le composant porte ses propres styles : les pages légales et le centre de
// ressources n'importent pas la feuille de la landing.
import './landing.css';

const NAV_LINKS = [
  ['/#demo', 'Vidéo'],
  ['/#features', 'Fonctionnalités'],
  ['/#pricing', 'Tarifs'],
] as const;

/** Vrai dès que la page a défilé : l'en-tête gagne alors son voile et son filet. */
function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => {
      const next = window.scrollY > threshold;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [threshold]);
  return scrolled;
}

/**
 * En-tête public partagé par la landing, le centre de ressources et les pages
 * légales. Transparent et flouté : sur la landing il se pose sur la photographie
 * du hero ; ailleurs, sur le canvas de la page.
 *
 * Les ancres pointent vers `/#…` et non `#…` : depuis `/ressources`, un simple
 * fragment ne mènerait nulle part. Quand le chemin courant est déjà `/`, le
 * navigateur traite `/#features` comme un saut d'ancre, sans recharger.
 */
export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const scrolled = useScrolled();

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
    <header className={`lp-header${scrolled || open ? ' is-scrolled' : ''}`}>
      <div className="lp-wrap lp-header-inner">
        <Link to="/" className="lp-logo" aria-label="PR Event 360 — accueil">
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" width={158} height={44} />
        </Link>

        <nav className="lp-nav" aria-label="Navigation principale">
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
          <Link to="/ressources">Ressources</Link>
        </nav>

        <div className="lp-header-actions">
          <Link to="/admin/login" className="lp-login">
            Connexion
          </Link>
          <Link className="btn btn-outline btn-sm" to="/admin/abonnement">
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
          {NAV_LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={close}>
              {label}
            </a>
          ))}
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
