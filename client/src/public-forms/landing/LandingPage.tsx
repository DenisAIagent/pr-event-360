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
  type LucideIcon,
} from 'lucide-react';
import './landing.css';

const DEMO_MAILTO = 'mailto:tech@band.stream?subject=Démo%20PR%20Event%20360';

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
function CountUp({ value, className, style }: { value: string; className?: string; style?: React.CSSProperties }) {
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
    <span ref={ref} className={className} style={style}>
      {n}
      {suffix}
    </span>
  );
}

/** Tuile d'icône bleu-tint (motif du design system). */
function IconTile({ icon: Ic, size = 21 }: { icon: LucideIcon; size?: number }) {
  return (
    <span
      style={{
        width: 44,
        height: 44,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-accent-tint)',
        color: 'var(--color-accent-strong)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ic size={size} strokeWidth={1.75} />
    </span>
  );
}

/** Page marketing publique (racine du site). Navy/bleu, Inter/Manrope. */
export function LandingPage() {
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-wrap lp-header-inner">
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" style={{ height: 30 }} />
          <nav className="lp-nav">
            <a href="#features">Fonctionnalités</a>
            <a href="#features">Solutions</a>
            <a href={DEMO_MAILTO}>Tarifs</a>
            <Link to="/ressources">Ressources</Link>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link
              to="/admin/login"
              style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-ink-soft)', textDecoration: 'none' }}
            >
              Connexion
            </Link>
            <a className="btn btn-primary btn-sm" href={DEMO_MAILTO}>
              Demander une démo
            </a>
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-grid">
          <Reveal>
            <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Radar size={15} /> Plateforme SaaS · Relations presse
            </span>
            <h1
              style={{
                fontSize: 'clamp(2.4rem, 1.4rem + 3vw, 3.4rem)',
                fontWeight: 300,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                margin: 'var(--space-3) 0 0',
              }}
            >
              Pilotez vos relations presse événementielles à{' '}
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>360°</span>
            </h1>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--color-ink-soft)',
                lineHeight: 1.55,
                margin: 'var(--space-4) 0 0',
                maxWidth: 520,
              }}
            >
              Centralisez vos contacts médias, invitations, relances, accréditations et retombées dans une
              plateforme pensée pour les événements.
            </p>
            <div className="lp-btn-row" style={{ marginTop: 'var(--space-5)' }}>
              <a className="btn btn-primary" href={DEMO_MAILTO}>
                Demander une démo <ArrowRight size={18} />
              </a>
              <a className="btn btn-ghost" href="#features">
                <PlayCircle size={18} /> Voir les fonctionnalités
              </a>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 18,
                marginTop: 'var(--space-4)',
                fontSize: '0.85rem',
                color: 'var(--color-ink-faint)',
                flexWrap: 'wrap',
              }}
            >
              {['Sans engagement', 'Conforme RGPD', 'Support FR'].map((t) => (
                <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Check size={15} color="var(--color-success)" /> {t}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--color-line)', borderBottom: '1px solid var(--color-line)' }}>
        <div className="lp-wrap lp-kpi-band">
          {(
            [
              ['247', 'journalistes invités'],
              ['68%', 'de taux de réponse'],
              ['42', 'accréditations validées'],
              ['18', 'retombées média suivies'],
            ] as const
          ).map(([n, l], i) => (
            <Reveal key={l} delay={i * 100} style={{ textAlign: 'center' }}>
              <CountUp
                value={n}
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontSize: 40,
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  letterSpacing: '-0.02em',
                }}
              />
              <div style={{ fontSize: '0.85rem', color: 'var(--color-ink-faint)', marginTop: 2 }}>{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" style={{ background: 'var(--color-bg)' }}>
        <div className="lp-wrap" style={{ padding: '80px 0' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto var(--space-6)' }}>
            <span className="eyebrow">Une plateforme, tout le cycle RP</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 1.2rem + 2vw, 2.4rem)', fontWeight: 400, margin: 'var(--space-3) 0 0' }}>
              De l'invitation à la retombée média
            </h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--color-ink-soft)', marginTop: 'var(--space-3)', lineHeight: 1.55 }}>
              Coordonnez chaque étape de vos relations presse événementielles depuis un seul outil, clair et
              structuré.
            </p>
          </div>
          <div className="lp-features-grid">
            {(
              [
                [Users, 'Gestion des contacts presse', 'Centralisez journalistes et médias avec tags, historique et engagement.'],
                [Mail, 'Invitations & accréditations', 'Envoyez, suivez et validez les demandes en quelques clics.'],
                [BellRing, 'Relances automatisées', 'Programmez des relances ciblées et ne manquez aucune réponse.'],
                [UserCheck, 'Suivi des présences', 'Visualisez accréditations, confirmations et présences en temps réel.'],
                [BarChart3, 'Reporting média', 'Mesurez les retombées et le ROI de chaque événement.'],
                [Users2, 'Collaboration équipe', 'Travaillez à plusieurs sur un même événement, en toute clarté.'],
              ] as const
            ).map(([Ic, t, d], i) => (
              <Reveal key={t} delay={i * 80}>
                <div className="lp-feature">
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <IconTile icon={Ic} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 6px' }}>{t}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--color-ink-soft)', lineHeight: 1.55, margin: 0 }}>
                    {d}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: 'var(--color-ink)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -80, top: -80, width: 360, height: 360, borderRadius: '50%', border: '1px solid rgba(21,152,211,0.25)' }} />
        <div style={{ position: 'absolute', right: 10, top: 10, width: 240, height: 240, borderRadius: '50%', border: '1px solid rgba(21,152,211,0.18)' }} />
        <div className="lp-wrap" style={{ padding: '72px 0', position: 'relative', textAlign: 'center' }}>
          <Reveal>
          <h2 style={{ fontSize: 'clamp(1.9rem, 1.2rem + 2.2vw, 2.5rem)', fontWeight: 300, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
            Les RP événementielles, <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>parfaitement orchestrées.</span>
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.72)', maxWidth: 560, margin: 'var(--space-4) auto 0', lineHeight: 1.55 }}>
            Rejoignez les équipes communication qui centralisent et mesurent leurs relations presse avec PR Event 360.
          </p>
          <div className="lp-btn-row" style={{ justifyContent: 'center', marginTop: 'var(--space-5)' }}>
            <a className="btn btn-primary" href={DEMO_MAILTO}>
              Demander une démo <ArrowRight size={18} />
            </a>
            <a
              className="btn"
              href={DEMO_MAILTO}
              style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              Nous contacter
            </a>
          </div>
          </Reveal>
        </div>
      </section>

      <footer style={{ background: '#fff', borderTop: '1px solid var(--color-line)' }}>
        <div className="lp-wrap lp-footer-inner" style={{ padding: '36px 0' }}>
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" style={{ height: 26 }} />
          <span style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/ressources" style={{ fontSize: '0.85rem', color: 'var(--color-ink-faint)', textDecoration: 'none' }}>
              Ressources
            </Link>
            <Link to="/confidentialite" style={{ fontSize: '0.85rem', color: 'var(--color-ink-faint)', textDecoration: 'none' }}>
              Confidentialité
            </Link>
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-ink-faint)' }}>© 2026 PR Event 360</span>
        </div>
      </footer>
    </div>
  );
}

/** Aperçu « dashboard » du hero (preuve produit). */
function HeroPreview() {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-line)',
        boxShadow: 'var(--shadow-lg)',
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--color-accent-tint)',
              color: 'var(--color-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={16} />
          </span>
          <strong style={{ fontSize: '0.95rem', color: 'var(--color-ink)' }}>Salon Tech &amp; Médias</strong>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--color-accent-strong)',
            background: 'var(--color-accent-tint)',
            borderRadius: 999,
            padding: '3px 10px',
          }}
        >
          En cours
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <MiniKpi icon={Users} label="Invités" value="247" />
        <MiniKpi icon={TrendingUp} label="Réponse" value="68%" />
      </div>
      <div style={{ marginTop: 12, padding: 16, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 8 }}>
          <span style={{ color: 'var(--color-ink-soft)' }}>Accréditations validées</span>
          <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>42/68</span>
        </div>
        <div style={{ height: 7, borderRadius: 99, background: 'var(--color-line)', overflow: 'hidden' }}>
          <div className="lp-progress-fill" style={{ height: '100%', background: 'var(--color-accent)', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  );
}

function MiniKpi({ icon: Ic, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div style={{ border: '1px solid var(--color-line)', borderRadius: 'var(--radius-md)', padding: 14 }}>
      <span style={{ color: 'var(--color-accent)', display: 'inline-flex' }}>
        <Ic size={16} />
      </span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.1, marginTop: 4 }}>
        <CountUp value={value} />
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--color-ink-faint)' }}>{label}</div>
    </div>
  );
}
