import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DEMO_SUBJECT, PRIMARY_CTA_LABEL, contactMailto } from '../../../lib/contact';
import { Reveal } from '../motion';

const DEMO_MAILTO = contactMailto(DEMO_SUBJECT);

export function ClosingCta() {
  return (
    <section className="lp-closing" aria-labelledby="lp-closing-title">
      <div className="lp-wrap lp-closing-inner">
        <Reveal>
          <h2 id="lp-closing-title" className="lp-h2">
            Les RP événementielles, <span className="lp-accent">parfaitement orchestrées.</span>
          </h2>
          <p className="lp-lede">
            Rejoignez les équipes communication qui centralisent et mesurent leurs relations presse
            avec PR Event 360.
          </p>
        </Reveal>
        <div className="lp-closing-actions">
          <Link className="btn btn-primary" to="/admin/abonnement">
            {PRIMARY_CTA_LABEL} <ArrowRight size={18} />
          </Link>
          <a className="btn btn-outline" href={DEMO_MAILTO}>
            Demander une démo
          </a>
        </div>
      </div>
    </section>
  );
}
