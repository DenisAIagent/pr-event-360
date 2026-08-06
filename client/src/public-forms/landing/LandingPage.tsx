import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Radar,
  ArrowRight,
  PlayCircle,
  Check,
  Calendar,
  Users,
  TrendingUp,
  Mail,
  BellRing,
  UserCheck,
  BarChart3,
  Users2,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../lib/api';
import './landing.css';
import { usePageTitle } from '../../lib/usePageTitle';
import { DEMO_SUBJECT, PRIMARY_CTA_LABEL, contactMailto } from '../../lib/contact';
import { LandingHeader } from './LandingHeader';
import { VideoShowcase } from './VideoShowcase';

const DEMO_MAILTO = contactMailto(DEMO_SUBJECT);

interface PublicReview {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorOrg: string | null;
  rating: number;
  quote: string;
}

const TRUST_POINTS = ['Sans installation', 'Conforme RGPD', 'Support FR'] as const;

const FEATURES: readonly (readonly [LucideIcon, string, string])[] = [
  [Users, 'Gestion des contacts presse', 'Centralisez journalistes et médias avec tags, historique et engagement.'],
  [Mail, 'Invitations & accréditations', 'Envoyez, suivez et validez les demandes en quelques clics.'],
  [BellRing, 'Relances automatisées', 'Programmez des relances ciblées et ne manquez aucune réponse.'],
  [UserCheck, 'Suivi des présences', 'Visualisez accréditations, confirmations et présences en temps réel.'],
  [BarChart3, 'Reporting média', 'Mesurez les retombées et le ROI de chaque événement.'],
  [Users2, 'Collaboration équipe', 'Travaillez à plusieurs sur un même événement, en toute clarté.'],
] as const;

const LAUNCH_PLANS = [
  {
    id: 'event',
    name: 'Événement',
    price: '800 €',
    period: 'HT / événement',
    note: '1 licence · 20 Go · Google Drive inclus',
    features: [
      'Accréditations & demandes',
      'Badges, exports, équipes',
      'Espaces journalistes sécurisés',
      '20 Go stockage + Drive inclus',
    ],
  },
  {
    id: 'pack3',
    name: 'Pack 3',
    price: '2 100 €',
    period: 'HT',
    note: 'Soit 700 € / événement · valable 12 mois',
    highlight: true,
    features: [
      '3 crédits événement',
      'Toutes les fonctionnalités',
      'Multi-marques / multi-clients',
      'Économie 300 € HT',
    ],
  },
  {
    id: 'agency',
    name: 'Agence',
    price: '6 000 €',
    period: 'HT / an',
    note: '10 événements / an · +450 € au-delà',
    features: [
      'Jusqu’à 10 événements / an',
      'Support prioritaire & onboarding',
      'Vue consolidée multi-clients',
      'Suivi des crédits',
    ],
  },
] as const;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Observe l'entrée d'un élément dans le viewport (une seule fois). `instant` est
 * vrai quand on révèle sans animation (mouvement réduit, onglet masqué — où les
 * transitions sont gelées —, ou pas d'IntersectionObserver) : le contenu doit
 * alors être rendu visible par des styles STATIQUES, jamais une transition.
 */
function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [state, setState] = useState<{ revealed: boolean; instant: boolean }>({
    revealed: false,
    instant: false,
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      prefersReducedMotion() ||
      typeof IntersectionObserver === 'undefined' ||
      document.visibilityState === 'hidden'
    ) {
      setState({ revealed: true, instant: true });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setState({ revealed: true, instant: false });
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, revealed: state.revealed, instant: state.instant };
}

/** Fondu + montée à l'apparition (motion sobre conforme au DS). */
function Reveal({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const { ref, revealed, instant } = useInView<HTMLDivElement>();
  const instantStyle: React.CSSProperties | undefined = instant
    ? { opacity: 1, transform: 'none', transition: 'none' }
    : undefined;
  return (
    <div
      ref={ref}
      className={`reveal${revealed ? ' is-revealed' : ''}`}
      style={{ transitionDelay: `${delay}ms`, ...style, ...instantStyle }}
    >
      {children}
    </div>
  );
}

/** Compteur animé (les chiffres « portent le message » — signature du DS). */
function CountUp({ value, className }: { value: string; className?: string }) {
  const match = value.match(/^(\d+)(.*)$/);
  const target = match ? parseInt(match[1] ?? '0', 10) : 0;
  const suffix = match ? (match[2] ?? '') : value;
  const { ref, revealed, instant } = useInView<HTMLSpanElement>(0.4);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!revealed) return;
    if (instant || prefersReducedMotion()) {
      setN(target);
      return;
    }
    let raf = 0;
    const dur = 1100;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [revealed, instant, target]);
  return (
    <span ref={ref} className={className}>
      {n}
      {suffix}
    </span>
  );
}

/** Tuile d'icône bleu-tint (motif du design system). */
function IconTile({ icon: Ic, size = 21 }: { icon: LucideIcon; size?: number }) {
  return (
    <span className="lp-icon-tile">
      <Ic size={size} strokeWidth={1.75} />
    </span>
  );
}

/** Page marketing publique (racine du site). Navy/bleu, Inter/Manrope. */
export function LandingPage() {
  usePageTitle('PR Event 360 — Votre orchestrateur de relations presse');
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  useEffect(() => {
    api.get<PublicReview[]>('/public/reviews').then(setReviews).catch(() => setReviews([]));
  }, []);

  const single = reviews.length === 1;

  return (
    <div className="lp">
      <LandingHeader />

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          {/* Pas de `Reveal` ici : ce bloc contient le h1, donc l'élément LCP.
              L'animer en fondu retarde le premier rendu utile. */}
          <div>
            <span className="eyebrow lp-eyebrow-icon">
              <Radar size={15} /> Votre orchestrateur de relations presse
            </span>
            <h1 className="lp-h1">
              Pilotez vos relations presse événementielles à <span className="lp-accent">360°</span>
            </h1>
            <p className="lp-lede">
              Centralisez vos contacts médias, invitations, relances, accréditations et retombées dans une
              plateforme pensée pour les événements.
            </p>
            <div className="lp-btn-row lp-hero-actions">
              <Link className="btn btn-primary" to="/admin/abonnement">
                {PRIMARY_CTA_LABEL} <ArrowRight size={18} />
              </Link>
              <a className="btn btn-ghost" href={DEMO_MAILTO}>
                <PlayCircle size={18} /> Demander une démo
              </a>
            </div>
            <div className="lp-trust">
              {TRUST_POINTS.map((point) => (
                <span key={point}>
                  <Check size={15} color="var(--color-success)" /> {point}
                </span>
              ))}
            </div>
          </div>
          <Reveal delay={150}>
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      <section id="demo" className="lp-section lp-section-line">
        <div className="lp-wrap lp-section-inner">
          <div className="lp-section-head">
            <span className="eyebrow">La plateforme en une minute</span>
            <h2 className="lp-h2">Voyez PR Event 360 en action</h2>
            <p className="lp-section-lede">
              Du premier mail d'invitation à la revue de presse : le parcours complet, en moins d'une
              minute.
            </p>
          </div>
          <Reveal>
            <VideoShowcase />
          </Reveal>
        </div>
      </section>

      <section id="features" className="lp-section">
        <div className="lp-wrap lp-section-inner">
          <div className="lp-section-head">
            <span className="eyebrow">Une plateforme, tout le cycle RP</span>
            <h2 className="lp-h2">De l'invitation à la retombée média</h2>
            <p className="lp-section-lede">
              Coordonnez chaque étape de vos relations presse événementielles depuis un seul outil, clair et
              structuré.
            </p>
          </div>
          <div className="lp-features-grid">
            {FEATURES.map(([Ic, title, desc], i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="lp-feature">
                  <div className="lp-feature-head">
                    <IconTile icon={Ic} />
                  </div>
                  <h3 className="lp-feature-title">{title}</h3>
                  <p className="lp-feature-text">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section id="testimonial" className="lp-section-line">
          <div className="lp-wrap lp-section-inner">
            <div className="lp-section-head">
              {/* Le libellé ne doit pas surpromettre : les avis publiés incluent des
                  retours d'attachés de presse du secteur, pas uniquement des clients. */}
              <span className="eyebrow">Ce qu'en disent les attachés de presse</span>
            </div>
            <div className={`lp-quotes${single ? ' is-single' : ''}`}>
              {reviews.map((r, i) => (
                <Reveal key={r.id} delay={i * 80}>
                  <figure className="lp-feature lp-quote">
                    <div className="lp-stars" aria-label={`${r.rating}/5`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={16}
                          fill={n <= r.rating ? 'var(--lp-star)' : 'none'}
                          color={n <= r.rating ? 'var(--lp-star)' : 'var(--lp-star-empty)'}
                        />
                      ))}
                    </div>
                    <blockquote>
                      <span className="lp-accent">«&nbsp;</span>
                      {r.quote}
                      <span className="lp-accent">&nbsp;»</span>
                    </blockquote>
                    <figcaption>
                      <strong>{r.authorName}</strong>
                      {(r.authorRole || r.authorOrg) && ` · ${[r.authorRole, r.authorOrg].filter(Boolean).join(', ')}`}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="pricing" className="lp-section lp-section-line">
        <div className="lp-wrap lp-section-inner">
          <div className="lp-section-head">
            <span className="eyebrow">Tarifs</span>
            <h2 className="lp-h2">À l’événement, sans surprise</h2>
            <p className="lp-section-lede">
              800 € HT par événement, 20 Go de stockage et Google Drive inclus. Remises au volume, pas en
              retirant des fonctionnalités. Option Média Plus +200 € HT (100 Go).
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {LAUNCH_PLANS.map((plan) => (
              <Reveal key={plan.id}>
                <div
                  className="lp-price-card"
                  style={
                    'highlight' in plan && plan.highlight
                      ? { outline: '2px solid var(--color-accent, #5b5bd6)' }
                      : undefined
                  }
                >
                  <span className="eyebrow">{plan.name}</span>
                  <div className="lp-price-row">
                    <span className="lp-price-amount">{plan.price}</span>
                    <span className="lp-price-period">{plan.period}</span>
                  </div>
                  <p className="lp-price-note">{plan.note}</p>
                  <ul className="lp-price-list">
                    {plan.features.map((f) => (
                      <li key={f}>
                        <Check size={17} color="var(--color-success)" strokeWidth={2.4} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link className="btn btn-primary lp-price-cta" to="/admin/abonnement">
                    {PRIMARY_CTA_LABEL} <ArrowRight size={18} />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="lp-section-lede" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            Modules inclus : accréditations, conférences, badges, newsroom, billetterie, exports…{' '}
            <a href={DEMO_MAILTO}>Demander une démo</a>
          </p>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-cta-ring" aria-hidden="true" />
        <div className="lp-cta-ring lp-cta-ring-sm" aria-hidden="true" />
        <div className="lp-wrap lp-cta-inner">
          <Reveal>
            <h2 className="lp-cta-title">
              Les RP événementielles, <span className="lp-accent">parfaitement orchestrées.</span>
            </h2>
            <p className="lp-cta-text">
              Rejoignez les équipes communication qui centralisent et mesurent leurs relations presse avec PR
              Event 360.
            </p>
            <div className="lp-btn-row lp-cta-actions">
              <Link className="btn btn-primary" to="/admin/abonnement">
                {PRIMARY_CTA_LABEL} <ArrowRight size={18} />
              </Link>
              <a className="btn lp-btn-on-navy" href={DEMO_MAILTO}>
                Demander une démo
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner lp-footer-pad">
          <img className="lp-footer-logo" src="/brand/logo-pr-event-360.png" alt="PR Event 360" />
          <span className="lp-footer-links">
            <Link to="/ressources">Ressources</Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/mentions-legales">Mentions légales</Link>
            <Link to="/cgv">CGV</Link>
          </span>
          <span className="lp-footer-copy">© 2026 PR Event 360</span>
        </div>
      </footer>
    </div>
  );
}

/**
 * Aperçu « dashboard » du hero. Les chiffres sont fictifs : la légende doit
 * rester visible pour qu'ils ne se lisent pas comme des métriques réelles.
 */
function HeroPreview() {
  return (
    <figure className="lp-preview">
      <div className="lp-preview-card">
        <div className="lp-preview-head">
          <div className="lp-preview-event">
            <span className="lp-preview-icon">
              <Calendar size={16} />
            </span>
            <strong className="lp-preview-name">Salon Tech &amp; Médias</strong>
          </div>
          <span className="lp-preview-badge">En cours</span>
        </div>
        <div className="lp-preview-kpis">
          <MiniKpi icon={Users} label="Invités" value="247" />
          <MiniKpi icon={TrendingUp} label="Réponse" value="68%" />
        </div>
        <div className="lp-preview-progress">
          <div className="lp-preview-progress-head">
            <span className="muted">Accréditations validées</span>
            <strong>42/68</strong>
          </div>
          <div className="lp-preview-track">
            <div className="lp-progress-fill" />
          </div>
        </div>
      </div>
      <figcaption className="lp-preview-caption">
        Aperçu du tableau de bord — événement et chiffres de démonstration.
      </figcaption>
    </figure>
  );
}

function MiniKpi({ icon: Ic, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="lp-kpi">
      <span className="lp-kpi-icon">
        <Ic size={16} />
      </span>
      <div className="lp-kpi-value">
        <CountUp value={value} />
      </div>
      <div className="lp-kpi-label">{label}</div>
    </div>
  );
}
