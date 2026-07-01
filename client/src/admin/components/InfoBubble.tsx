import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

/** Petite bulle d'aide : icône ⓘ → popover détaillé (fermeture au clic extérieur / Échap). */
export function InfoBubble({ title, children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="info-bubble" ref={ref}>
      <button
        type="button"
        className="info-bubble-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={title ?? 'Aide'}
        aria-expanded={open}
      >
        <Info size={15} />
      </button>
      {open && (
        <span className="info-bubble-pop" role="dialog">
          {title && <strong className="info-bubble-title">{title}</strong>}
          <span className="info-bubble-body">{children}</span>
        </span>
      )}
    </span>
  );
}
