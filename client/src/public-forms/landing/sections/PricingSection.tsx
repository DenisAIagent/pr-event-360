import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { DEMO_SUBJECT, PRIMARY_CTA_LABEL, contactMailto } from '../../../lib/contact';
import { LAUNCH_PLANS } from '../content';
import { Reveal } from '../motion';

const DEMO_MAILTO = contactMailto(DEMO_SUBJECT);

export function PricingSection() {
  return (
    <section id="pricing" className="lp-section lp-section-line" aria-labelledby="lp-pricing-title">
      <div className="lp-wrap">
        <div className="lp-section-head">
          <div>
            <span className="eyebrow">Tarifs</span>
            <h2 id="lp-pricing-title" className="lp-h2">
              À l'événement, sans surprise
            </h2>
          </div>
          <p className="lp-lede">
            800 € HT par événement, 20 Go de stockage et Google Drive inclus. Remises au volume, pas
            en retirant des fonctionnalités.
          </p>
        </div>
        <div className="lp-plans">
          {LAUNCH_PLANS.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 70} className="lp-plan-reveal">
              <article className={`lp-card lp-plan${plan.highlight ? ' is-highlight' : ''}`}>
                <div className="lp-plan-head">
                  <span className="lp-plan-name">{plan.name}</span>
                  {plan.highlight && <span className="lp-pill lp-pill-progress">Recommandé</span>}
                </div>
                <div className="lp-price-row">
                  <span className="lp-price-amount">{plan.price}</span>
                  <span className="lp-price-period">{plan.period}</span>
                </div>
                <p className="lp-price-note">{plan.note}</p>
                <ul className="lp-price-list">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <Check size={16} color="var(--color-success)" strokeWidth={2.4} /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
                  to="/admin/abonnement"
                >
                  {PRIMARY_CTA_LABEL} <ArrowRight size={18} />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="lp-pricing-foot">
          Option Média Plus : +200 € HT pour 100 Go. Modules inclus dans chaque offre :
          accréditations, conférences, badges, newsroom, billetterie, exports.{' '}
          <a className="lp-link" href={DEMO_MAILTO}>
            Demander une démo
          </a>
        </p>
      </div>
    </section>
  );
}
