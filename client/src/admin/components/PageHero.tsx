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
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        {eyebrow && (
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{eyebrow}</span>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
