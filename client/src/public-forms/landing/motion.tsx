import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Observe l'entrée d'un élément dans le viewport (une seule fois). `instant` est
 * vrai quand on révèle sans animation (mouvement réduit, onglet masqué — où les
 * transitions sont gelées —, ou pas d'IntersectionObserver) : le contenu doit
 * alors être rendu visible par des styles STATIQUES, jamais une transition.
 */
export function useInView<T extends Element>(threshold = 0.15) {
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
      // La racine est étendue très haut : un bloc que l'on a dépassé d'un seul geste
      // (défilement rapide, ancre) est considéré comme vu et se révèle aussitôt,
      // au lieu de rester invisible faute d'avoir jamais croisé le viewport.
      { threshold, rootMargin: '10000px 0px 0px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, revealed: state.revealed, instant: state.instant };
}

/** Fondu + montée à l'apparition (motion sobre : opacity/transform uniquement). */
export function Reveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, revealed, instant } = useInView<HTMLDivElement>();
  const instantStyle: CSSProperties | undefined = instant
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

/** Compteur animé : les chiffres « portent le message » (signature du DS). */
export function CountUp({ value, className }: { value: string; className?: string }) {
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
