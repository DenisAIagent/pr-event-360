import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CopyLinkProps {
  url: string;
  compact?: boolean;
}

/** Champ en lecture seule + bouton « Copier » (avec repli) + ouverture dans un onglet. */
export function CopyLink({ url, compact }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Repli si l'API Clipboard est indisponible (contexte non sécurisé).
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className={cn('flex items-center gap-2', compact ? 'max-w-md' : 'w-full')}>
      <Input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        aria-label="Lien à partager"
        className="font-mono text-xs"
      />
      <Button type="button" size="sm" onClick={copy} className="shrink-0">
        {copied ? (
          <>
            <Check className="size-4" /> Copié
          </>
        ) : (
          'Copier'
        )}
      </Button>
      <Button asChild size="sm" variant="ghost" className="shrink-0">
        <a href={url} target="_blank" rel="noreferrer">
          Ouvrir ↗
        </a>
      </Button>
    </div>
  );
}
