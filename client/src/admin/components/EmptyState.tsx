import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * État vide actionnable : jamais juste « Aucune donnée », toujours une icône,
 * une explication et (idéalement) une action vers la première étape.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon size={26} strokeWidth={1.6} />
      </span>
      <p className="text-base font-medium">{title}</p>
      {hint && <p className="max-w-md text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
