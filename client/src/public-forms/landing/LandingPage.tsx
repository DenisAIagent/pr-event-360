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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import './landing.css';

const DEMO_MAILTO = 'mailto:tech@band.stream?subject=Démo%20PR%20Event%20360';

interface PublicReview {
  id: string;
  authorName: string;
  authorRole: string | null;
  authorOrg: string | null;
  rating: number;
  quote: string;
}

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
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, revealed, instant } = useInView<HTMLDivElement>();
  const instantStyle: React.CSSProperties | undefined = instant
    ? { opacity: 1, transform: 'none', transition: 'none' }
    : undefined;
  return (
    <div
      ref={ref}
      className={`reveal${revealed ? ' is-revealed' : ''}${className ? ` ${className}` : ''}`}
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

/** Tuile d'icône (motif du design system, décliné sur le thème neutral). */
function IconTile({ icon: Ic, size = 21 }: { icon: LucideIcon; size?: number }) {
  return (
    <span className="inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Ic size={size} strokeWidth={1.75} />
    </span>
  );
}

/** Page marketing publique (racine du site), thème shadcn neutral. */
export function LandingPage() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  useEffect(() => {
    api.get<PublicReview[]>('/public/reviews').then(setReviews).catch(() => setReviews([]));
  }, []);

  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between gap-4 px-4">
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" className="h-11" />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
              Tarifs
            </a>
            <Link to="/ressources" className="text-muted-foreground transition-colors hover:text-foreground">
              Ressources
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/login">Connexion</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/abonnement">Créer votre espace</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 lg:grid-cols-2">
          <Reveal>
            <Badge variant="outline" className="gap-1.5">
              <Radar /> Votre orchestrateur de relations presse
            </Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">
              Pilotez vos relations presse événementielles à{' '}
              <span className="text-primary">360°</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Centralisez vos contacts médias, invitations, relances, accréditations et retombées dans une
              plateforme pensée pour les événements.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link to="/admin/abonnement">
                  Créer votre espace <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href={DEMO_MAILTO}>
                  <PlayCircle /> Demander une démo
                </a>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {['Sans installation', 'Conforme RGPD', 'Support FR'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <Check size={15} className="text-primary" /> {t}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={150}>
            <HeroPreview />
          </Reveal>
        </div>
      </section>

      <section className="border-y">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-10 md:grid-cols-4">
          {(
            [
              ['247', 'journalistes invités'],
              ['68%', 'de taux de réponse'],
              ['42', 'accréditations validées'],
              ['18', 'retombées média suivies'],
            ] as const
          ).map(([n, l], i) => (
            <Reveal key={l} delay={i * 100} className="text-center">
              <CountUp value={n} className="block text-4xl font-semibold tracking-tight text-primary" />
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="features" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="uppercase tracking-wider">
              Une plateforme, tout le cycle RP
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">De l'invitation à la retombée média</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Coordonnez chaque étape de vos relations presse événementielles depuis un seul outil, clair et
              structuré.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                <Card className="h-full gap-4 transition-shadow hover:shadow-md">
                  <CardHeader>
                    <IconTile icon={Ic} />
                    <CardTitle className="mt-3 text-lg">{t}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{d}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {reviews.length > 0 && (
        <section id="testimonial" className="border-t bg-muted/40 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mb-10 text-center">
              <Badge variant="outline" className="uppercase tracking-wider">
                Ils l'ont essayé
              </Badge>
            </div>
            <div
              className={`mx-auto grid gap-6 ${
                reviews.length === 1
                  ? 'max-w-2xl grid-cols-1'
                  : 'max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {reviews.map((r, i) => (
                <Reveal key={r.id} delay={i * 80}>
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col gap-4">
                      <div className="inline-flex gap-0.5" aria-label={`${r.rating}/5`}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={16}
                            className={
                              n <= r.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-muted text-muted-foreground/30'
                            }
                          />
                        ))}
                      </div>
                      <blockquote className="text-base leading-relaxed text-foreground">
                        <span className="text-primary">«&nbsp;</span>
                        {r.quote}
                        <span className="text-primary">&nbsp;»</span>
                      </blockquote>
                      <figcaption className="mt-auto flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{r.authorName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <div className="font-medium text-foreground">{r.authorName}</div>
                          {(r.authorRole || r.authorOrg) && (
                            <div className="text-muted-foreground">
                              {[r.authorRole, r.authorOrg].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </figcaption>
                    </CardContent>
                  </Card>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="pricing" className="border-t py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <Badge variant="outline" className="uppercase tracking-wider">
              Tarif simple
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight">Un abonnement, tout inclus</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Un seul plan, sans surprise. Tous les modules, événements et membres illimités.
            </p>
          </div>
          <Reveal>
            <Card className="mx-auto max-w-md text-center shadow-lg">
              <CardHeader className="items-center">
                <Badge variant="secondary" className="uppercase tracking-wider">
                  Plan unique
                </Badge>
                <div className="mt-3 flex items-baseline justify-center gap-1.5">
                  <span className="text-6xl font-semibold tracking-tight text-foreground">800 €</span>
                  <span className="text-lg text-muted-foreground">/ an</span>
                </div>
                <CardDescription>par organisation · facturation annuelle</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="mb-7 grid gap-2.5 text-left">
                  {[
                    'Événements illimités',
                    "Membres d'équipe illimités",
                    "Accréditations & demandes d'interview",
                    'Planning & génération de créneaux',
                    'Newsroom & communications',
                    'Espace journaliste (lien magique + compte)',
                    'Multilingue FR / EN / PT / ES',
                    'Support FR',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check size={17} strokeWidth={2.4} className="shrink-0 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button size="lg" className="w-full" asChild>
                  <Link to="/admin/abonnement">
                    Créer votre espace <ArrowRight />
                  </Link>
                </Button>
                <a
                  href={DEMO_MAILTO}
                  className="mt-3 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  ou demander une démo
                </a>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="pointer-events-none absolute -right-20 -top-20 size-[360px] rounded-full border border-primary-foreground/20" />
        <div className="pointer-events-none absolute right-2.5 top-2.5 size-60 rounded-full border border-primary-foreground/15" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center md:py-20">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Les RP événementielles, <span className="text-primary-foreground/70">parfaitement orchestrées.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
              Rejoignez les équipes communication qui centralisent et mesurent leurs relations presse avec PR
              Event 360.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/admin/abonnement">
                  Créer votre espace <ArrowRight />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <a href={DEMO_MAILTO}>Demander une démo</a>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8">
          <img src="/brand/logo-pr-event-360.png" alt="PR Event 360" className="h-[26px]" />
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link to="/ressources" className="text-muted-foreground transition-colors hover:text-foreground">
              Ressources
            </Link>
            <Link to="/confidentialite" className="text-muted-foreground transition-colors hover:text-foreground">
              Confidentialité
            </Link>
            <Link to="/mentions-legales" className="text-muted-foreground transition-colors hover:text-foreground">
              Mentions légales
            </Link>
            <Link to="/cgv" className="text-muted-foreground transition-colors hover:text-foreground">
              CGV
            </Link>
          </nav>
          <span className="text-sm text-muted-foreground">© 2026 PR Event 360</span>
        </div>
      </footer>
    </div>
  );
}

/** Aperçu « dashboard » du hero (preuve produit). */
function HeroPreview() {
  return (
    <Card className="gap-4 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar size={16} />
          </span>
          <strong className="text-sm text-foreground">Salon Tech &amp; Médias</strong>
        </div>
        <Badge variant="secondary">En cours</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MiniKpi icon={Users} label="Invités" value="247" />
        <MiniKpi icon={TrendingUp} label="Réponse" value="68%" />
      </div>
      <div className="rounded-md bg-muted p-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted-foreground">Accréditations validées</span>
          <span className="font-medium text-foreground">42/68</span>
        </div>
        <div className="h-[7px] overflow-hidden rounded-full bg-border">
          <div className="lp-progress-fill h-full rounded-full bg-primary" />
        </div>
      </div>
    </Card>
  );
}

function MiniKpi({ icon: Ic, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-md border p-3.5">
      <span className="inline-flex text-primary">
        <Ic size={16} />
      </span>
      <div className="mt-1 text-2xl font-semibold leading-tight text-foreground">
        <CountUp value={value} />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
