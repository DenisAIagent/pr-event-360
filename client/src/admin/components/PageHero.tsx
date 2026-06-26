import type { ReactNode } from 'react';

/**
 * Bandeau navy premium (surface dominante du design system) avec motif « 360 »
 * en anneaux. Utilisé en tête des pages du back-office pour donner profondeur et
 * hiérarchie. `action` (ex. un CTA) s'aligne à droite.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="hero-navy">
      <div className="hero-head">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {subtitle && <p className="hero-sub">{subtitle}</p>}
        </div>
        {action}
      </div>
    </section>
  );
}
