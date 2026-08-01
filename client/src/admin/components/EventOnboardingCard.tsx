import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { X, ListChecks } from 'lucide-react';

const keyFor = (eventId: string) => `pr360.eventOnboard.${eventId}`;

/**
 * Carte de démarrage affichée dans un événement tant que l'utilisateur
 * ne l'a pas masquée — rappelle le parcours opérationnel.
 */
export function EventOnboardingCard() {
  const { eventId = '' } = useParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    try {
      setVisible(!localStorage.getItem(keyFor(eventId)));
    } catch {
      setVisible(true);
    }
  }, [eventId]);

  if (!visible || !eventId) return null;

  const base = `/admin/events/${eventId}`;

  function dismiss() {
    try {
      localStorage.setItem(keyFor(eventId), '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <section className="share-card event-onboard" aria-label="Parcours de démarrage">
      <div className="share-head">
        <strong>
          <ListChecks size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
          Parcours recommandé
        </strong>
        <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss} aria-label="Masquer">
          <X size={14} /> Masquer
        </button>
      </div>
      <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '0 0 4px' }}>
        Suivez ces étapes pour être opérationnel rapidement. Vous pourrez rouvrir la visite globale via
        la boussole en bas du menu.
      </p>
      <ol className="onboard-checklist">
        <li>
          <span className="n">1</span>
          <span>
            <Link to={`${base}/lineup`}>Configuration</Link> — participants, quotas, contacts production
          </span>
        </li>
        <li>
          <span className="n">2</span>
          <span>
            Partagez le lien d’inscription (bandeau) → validez dans{' '}
            <Link to={`${base}/accreditations`}>Accréditations</Link>
          </span>
        </li>
        <li>
          <span className="n">3</span>
          <span>
            Traitez les interviews dans <Link to={`${base}/requests`}>Demandes</Link> (badge = avis prod)
          </span>
        </li>
        <li>
          <span className="n">4</span>
          <span>
            Le jour J : <Link to={`${base}/jour`}>check-in QR</Link> · Ensuite bilan &amp; revue de presse
          </span>
        </li>
      </ol>
    </section>
  );
}
