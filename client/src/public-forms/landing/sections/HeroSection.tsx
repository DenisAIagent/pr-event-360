import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Check, Newspaper, PlayCircle, Radar } from 'lucide-react';
import { DEMO_SUBJECT, PRIMARY_CTA_LABEL, contactMailto } from '../../../lib/contact';
import { TRUST_POINTS } from '../content';
import { CountUp } from '../motion';

const DEMO_MAILTO = contactMailto(DEMO_SUBJECT);

/**
 * Photographie du hero : foule d'un festival au coucher du soleil (photothèque
 * de l'auteur — silhouettes, aucun visage identifiable, enseignes retouchées).
 * Trois largeurs, trois formats : le navigateur prend le plus léger qu'il lit.
 */
const HERO = {
  base: '/media/hero-festival',
  widths: [1024, 1600, 2560] as const,
  width: 2560,
  height: 1706,
};
const srcSet = (ext: 'avif' | 'webp' | 'jpg') =>
  HERO.widths.map((w) => `${HERO.base}-${w}.${ext} ${w}w`).join(', ');

export function HeroSection() {
  return (
    <section className="lp-hero" aria-labelledby="lp-hero-title">
      <picture className="lp-hero-media">
        <source type="image/avif" srcSet={srcSet('avif')} sizes="100vw" />
        <source type="image/webp" srcSet={srcSet('webp')} sizes="100vw" />
        <img
          src={`${HERO.base}-1600.jpg`}
          srcSet={srcSet('jpg')}
          sizes="100vw"
          width={HERO.width}
          height={HERO.height}
          alt="Foule d'un festival au coucher du soleil, devant une scène"
          loading="eager"
          decoding="async"
          // Image LCP : priorité réseau haute. React 18 ignore la forme camelCase,
          // l'attribut est donc passé en minuscules tel que le DOM l'attend.
          {...({ fetchpriority: 'high' } as Record<string, string>)}
        />
      </picture>
      <div className="lp-hero-scrim" aria-hidden="true" />

      <div className="lp-wrap lp-hero-inner">
        {/* Pas d'animation sur ce bloc : il contient le h1, donc l'élément LCP. */}
        <div className="lp-hero-copy">
          <span className="eyebrow">
            <Radar size={15} strokeWidth={1.75} /> Votre orchestrateur de relations presse
          </span>
          <h1 id="lp-hero-title" className="lp-display">
            Pilotez vos relations presse événementielles à <span className="lp-accent">360°</span>
          </h1>
          <p className="lp-lede">
            Contacts médias, invitations, relances, accréditations et retombées : une seule
            plateforme, pensée pour les événements.
          </p>
          <div className="lp-hero-actions">
            <Link className="btn btn-primary" to="/admin/abonnement">
              {PRIMARY_CTA_LABEL} <ArrowRight size={18} />
            </Link>
            <a className="btn btn-glass" href={DEMO_MAILTO}>
              <PlayCircle size={18} strokeWidth={1.75} /> Demander une démo
            </a>
          </div>
          <ul className="lp-trust" aria-label="Garanties">
            {TRUST_POINTS.map((point) => (
              <li key={point}>
                <Check size={14} color="var(--color-success)" strokeWidth={2.5} /> {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-hero-cards" aria-label="Aperçu du produit — données de démonstration">
          <RequestCard />
          <PressReviewCard />
        </div>
      </div>
    </section>
  );
}

/** Une demande d'accréditation, telle qu'elle apparaît dans le back-office. */
function RequestCard() {
  return (
    <article className="lp-glass">
      <div className="lp-glass-head">
        <span className="lp-glass-title">
          <BadgeCheck size={16} strokeWidth={1.75} /> Accréditation
        </span>
        <span className="lp-pill lp-pill-success">Validée</span>
      </div>
      <div className="lp-request">
        <span className="lp-avatar" aria-hidden="true">
          CR
        </span>
        <div>
          <div className="lp-request-name">C. Rivière · Presse quotidienne</div>
          <div className="lp-request-meta">Photo + interview · Jour 2 · Salon Tech &amp; Médias</div>
        </div>
      </div>
      <div className="lp-request-foot">
        <span>
          Badge <strong>prêt à imprimer</strong>
        </span>
        <span>Relancée il y a 2 j</span>
      </div>
    </article>
  );
}

/** La revue de presse : chiffres fictifs, légendés comme tels. */
function PressReviewCard() {
  return (
    <article className="lp-glass">
      <div className="lp-glass-head">
        <span className="lp-glass-title">
          <Newspaper size={16} strokeWidth={1.75} /> Revue de presse
        </span>
        <span className="lp-pill lp-pill-progress">En cours</span>
      </div>
      <div className="lp-kpis">
        <Kpi value="247" label="Invités" />
        <Kpi value="68%" label="Réponse" />
        <Kpi value="18" label="Retombées" />
      </div>
      <div className="lp-progress">
        <div className="lp-progress-head">
          <span>Accréditations validées</span>
          <strong>42/68</strong>
        </div>
        <div className="lp-track">
          <div className="lp-fill" />
        </div>
      </div>
      <p className="lp-glass-note">Chiffres de démonstration.</p>
    </article>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="lp-kpi-value">
        <CountUp value={value} />
      </div>
      <div className="lp-kpi-label">{label}</div>
    </div>
  );
}
