import { useState } from 'react';
import { Icon } from '../../components/Icon';

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
    <div className={`copy-link${compact ? ' compact' : ''}`}>
      <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Lien à partager" />
      <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
        {copied ? (
          <>
            <Icon name="check" /> Copié
          </>
        ) : (
          'Copier'
        )}
      </button>
      <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
        Ouvrir ↗
      </a>
    </div>
  );
}
