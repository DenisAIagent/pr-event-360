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
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon size={26} strokeWidth={1.6} />
      </span>
      <p className="empty-state-title">{title}</p>
      {hint && <p className="empty-state-hint">{hint}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
