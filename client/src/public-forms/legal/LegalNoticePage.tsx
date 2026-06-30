import { Link } from 'react-router-dom';

const CONTACT = 'contact@mdmcmusicads.com';

/**
 * Mentions légales (éditeur, hébergeur, propriété intellectuelle). Page publique, française.
 * Données société reprises de la politique de confidentialité (MDMC OÜ, Estonie / UE).
 * NB : « directeur de la publication », « capital social » et l'adresse exacte de l'hébergeur
 * sont à confirmer par l'éditeur.
 */
export function LegalNoticePage() {
  return (
    <main className="page" style={{ maxWidth: 760 }}>
      <span className="eyebrow">Informations légales</span>
      <h1 style={{ fontSize: 'var(--text-display)', margin: 'var(--space-2) 0 var(--space-3)' }}>
        Mentions légales
      </h1>
      <p className="muted" style={{ marginBottom: 'var(--space-5)' }}>
        Dernière mise à jour : juin 2026.
      </p>

      <section className="stack" style={{ gap: 'var(--space-5)' }}>
        <div>
          <h2>1. Éditeur du site</h2>
          <p>
            Le site et la plateforme <strong>PR&nbsp;Event&nbsp;360</strong> sont édités par{' '}
            <strong>MDMC&nbsp;OÜ</strong>, société de droit estonien (Union européenne), immatriculée au
            registre du commerce estonien sous le numéro <strong>16466485</strong>, dont le siège social est
            situé <strong>Sepapaja tn 6, 15551 Tallinn, Estonie</strong>.
            <br />
            Numéro de TVA intracommunautaire&nbsp;: <strong>EE102589877</strong> (à confirmer).
            <br />
            Contact&nbsp;: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
            <br />
            Directeur de la publication&nbsp;: <strong>Denis Adam</strong>.
          </p>
        </div>

        <div>
          <h2>2. Hébergement</h2>
          <p>
            La plateforme est hébergée par <strong>Railway Corporation</strong> (548&nbsp;Market&nbsp;Street,
            San&nbsp;Francisco, CA&nbsp;94104, États-Unis) sur une infrastructure située au sein de l'Union
            européenne. Les médias sont hébergés par <strong>Cloudinary</strong> et les emails acheminés par{' '}
            <strong>Brevo</strong> (Union européenne).
          </p>
        </div>

        <div>
          <h2>3. Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments de la plateforme (marque «&nbsp;PR&nbsp;Event&nbsp;360&nbsp;», logo, code,
            interface, textes, graphismes) est protégé par le droit de la propriété intellectuelle et demeure
            la propriété exclusive de MDMC&nbsp;OÜ, sauf mention contraire. Toute reproduction, représentation
            ou exploitation, totale ou partielle, sans autorisation écrite préalable, est interdite. Les
            contenus publiés par les organisateurs d'événements (communiqués, médias, logos) restent la
            propriété de leurs titulaires respectifs.
          </p>
        </div>

        <div>
          <h2>4. Responsabilité</h2>
          <p>
            L'éditeur s'efforce d'assurer l'exactitude et la disponibilité des informations, sans garantie. Il
            ne saurait être tenu responsable des contenus publiés par les organisateurs via la plateforme, ni
            des dommages résultant d'une indisponibilité technique ou d'un usage non conforme du service.
          </p>
        </div>

        <div>
          <h2>5. Données personnelles & cookies</h2>
          <p>
            Le traitement des données personnelles est décrit dans notre{' '}
            <Link to="/confidentialite" className="auth-link">politique de confidentialité</Link>. La
            plateforme n'utilise aucun traceur publicitaire ou analytique&nbsp;; seul un stockage local
            strictement nécessaire au fonctionnement est employé.
          </p>
        </div>

        <div>
          <h2>6. Droit applicable</h2>
          <p>
            Les présentes mentions sont régies par le droit applicable au siège de l'éditeur. Pour les
            conditions de vente du service, voir nos{' '}
            <Link to="/cgv" className="auth-link">conditions générales</Link>.
          </p>
        </div>
      </section>

      <p style={{ marginTop: 'var(--space-6)' }}>
        <Link to="/" className="auth-link">← Retour à l'accueil</Link>
      </p>
    </main>
  );
}
