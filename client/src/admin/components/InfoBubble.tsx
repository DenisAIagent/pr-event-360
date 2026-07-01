import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

/** Petite bulle d'aide : icône ⓘ → popover détaillé (shadcn Popover : clic extérieur / Échap gérés). */
export function InfoBubble({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={title ?? 'Aide'}
        className="inline-grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info size={14} />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm">
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <div className="text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
