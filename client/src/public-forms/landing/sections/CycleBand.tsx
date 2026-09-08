import { CYCLE_STEPS } from '../content';
import { DEMO_SUBJECT, contactMailto } from '../../../lib/contact';
import { Reveal } from '../motion';

const DEMO_MAILTO = contactMailto(DEMO_SUBJECT);

/** Le cycle RP d'un événement, du fichier presse à la revue de presse. */
export function CycleBand() {
  return (
    <section className="lp-cycle" aria-labelledby="lp-cycle-title">
      <div className="lp-cycle-ring" aria-hidden="true" />
      <div className="lp-cycle-ring lp-cycle-ring-sm" aria-hidden="true" />
      <div className="lp-wrap lp-cycle-inner">
        <Reveal>
          <ol className="lp-steps">
            {CYCLE_STEPS.map(([title, text]) => (
              <li key={title} className="lp-step">
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
        <div className="lp-cycle-copy">
          <span className="eyebrow">Un seul fil, du début à la fin</span>
          <h2 id="lp-cycle-title" className="lp-h2">
            Le cycle RP d'un événement, orchestré dans l'ordre
          </h2>
          <p className="lp-lede">
            Chaque étape alimente la suivante : une invitation acceptée devient une accréditation,
            une accréditation validée devient un badge, une couverture publiée rejoint la revue de
            presse. Plus rien ne se perd entre deux tableurs.
          </p>
          <div className="lp-cycle-actions">
            <a className="btn btn-on-navy" href={DEMO_MAILTO}>
              Demander une démo
            </a>
            <a className="lp-link" href="/#features">
              Voir les fonctionnalités
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
