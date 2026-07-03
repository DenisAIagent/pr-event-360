import { useEffect, useState } from 'react';
import { AlertTriangle, Copy, Check, X } from 'lucide-react';
import { onError, formatErrorDetails, type ErrorInfo } from '../lib/errorBus';

interface Notice extends ErrorInfo {
  id: number;
}

let counter = 0;

/**
 * Notification GLOBALE d'incident technique (indépendante de tout provider : couvre
 * back-office ET surfaces publiques). Affiche un message clair, le CODE d'erreur et
 * un bouton « Copier les détails » (code, requête, heure, page) à transmettre au
 * support. Persistante (pas d'auto-disparition) : l'utilisateur doit pouvoir la lire
 * et la copier.
 */
export function ErrorNotifier() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(
    () =>
      onError((info) => {
        const id = ++counter;
        // Garde au plus 3 incidents à l'écran (les plus récents).
        setNotices((xs) => [...xs.slice(-2), { ...info, id }]);
      }),
    [],
  );

  function dismiss(id: number) {
    setNotices((xs) => xs.filter((n) => n.id !== id));
  }

  if (notices.length === 0) return null;

  return (
    <div className="err-notifier" role="alert" aria-live="assertive">
      {notices.map((n) => (
        <ErrorCard key={n.id} notice={n} onClose={() => dismiss(n.id)} />
      ))}
    </div>
  );
}

function ErrorCard({ notice, onClose }: { notice: Notice; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatErrorDetails(notice));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papier indisponible : le code reste lisible à l'écran */
    }
  }

  return (
    <div className="err-card">
      <div className="err-card-head">
        <AlertTriangle size={18} />
        <strong>Une erreur est survenue</strong>
        <button className="err-card-x" onClick={onClose} aria-label="Fermer">
          <X size={15} />
        </button>
      </div>
      <p className="err-card-msg">{notice.message}</p>
      <div className="err-card-meta">
        <code>{notice.code}</code>
        {notice.requestId && <code>{notice.requestId}</code>}
      </div>
      <div className="err-card-actions">
        <button className="err-card-copy" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copié' : 'Copier les détails'}
        </button>
        <span className="err-card-hint">Transmettez ce code au support pour identifier l’incident.</span>
      </div>
    </div>
  );
}
