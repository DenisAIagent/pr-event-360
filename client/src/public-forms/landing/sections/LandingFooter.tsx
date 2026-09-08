import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, DEMO_SUBJECT, contactMailto } from '../../../lib/contact';

const DEMO_MAILTO = contactMailto(DEMO_SUBJECT);

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src="/brand/logo-pr-event-360-white.png" alt="PR Event 360" width={115} height={32} />
            <p className="lp-footer-baseline">
              Connecter · Informer · Rayonner. Les relations presse événementielles, à 360°.
            </p>
          </div>
          <nav className="lp-footer-col" aria-labelledby="lp-foot-product">
            <h3 id="lp-foot-product">Produit</h3>
            <ul>
              <li>
                <a href="/#demo">Vidéo de présentation</a>
              </li>
              <li>
                <a href="/#features">Fonctionnalités</a>
              </li>
              <li>
                <a href="/#pricing">Tarifs</a>
              </li>
              <li>
                <Link to="/admin/login">Connexion</Link>
              </li>
            </ul>
          </nav>
          <nav className="lp-footer-col" aria-labelledby="lp-foot-resources">
            <h3 id="lp-foot-resources">Ressources</h3>
            <ul>
              <li>
                <Link to="/ressources">Centre de ressources</Link>
              </li>
              <li>
                <a href={DEMO_MAILTO}>Demander une démo</a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}>Contact</a>
              </li>
            </ul>
          </nav>
          <nav className="lp-footer-col" aria-labelledby="lp-foot-legal">
            <h3 id="lp-foot-legal">Légal</h3>
            <ul>
              <li>
                <Link to="/confidentialite">Confidentialité</Link>
              </li>
              <li>
                <Link to="/mentions-legales">Mentions légales</Link>
              </li>
              <li>
                <Link to="/cgv">CGV</Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 PR Event 360</span>
          <span>Conforme RGPD · Hébergement et support en français</span>
        </div>
      </div>
    </footer>
  );
}
