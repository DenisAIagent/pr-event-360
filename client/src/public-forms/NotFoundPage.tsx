import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';

/**
 * 404 publique du domaine plateforme. Auparavant une URL inconnue redirigeait
 * vers `/admin`, ce qui déposait un prospect sur un écran de connexion admin.
 * L'en-tête est fourni par la coquille `Shell` dans le routeur.
 */
export function NotFoundPage() {
  usePageTitle('Page introuvable — PR Event 360');
  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <span className="eyebrow">Erreur 404</span>
      <h1 style={{ fontSize: 'var(--text-display)', margin: 'var(--space-2) 0 var(--space-3)' }}>
        Page introuvable
      </h1>
      <p className="muted">Cette page n’existe pas ou a été déplacée.</p>
      <p style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Link to="/" className="btn btn-primary">
          Retour à l’accueil
        </Link>
        <Link to="/ressources" className="btn btn-ghost">
          Centre de ressources
        </Link>
      </p>
    </main>
  );
}
