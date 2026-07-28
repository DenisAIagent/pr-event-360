import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { NotificationRow } from '../lib/types';
import { TRIGGER_LABEL } from '../lib/labels';

interface MessagesPage {
  items: NotificationRow[];
  nextCursor: string | null;
}

const PAGE_SIZE = 100;

export function MessagesTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  // Pagination par curseur : la table des messages croît en continu, on charge
  // par pages de 100 avec un bouton « Charger plus » (jamais la totalité).
  const [messages, setMessages] = useState<NotificationRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (before: string | null) => {
      const qs = `?limit=${PAGE_SIZE}${before ? `&before=${encodeURIComponent(before)}` : ''}`;
      return apiAuthed.get<MessagesPage>(`/admin/events/${eventId}/messages${qs}`);
    },
    [apiAuthed, eventId],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setMessages([]);
    loadPage(null)
      .then((page) => {
        if (cancelled) return;
        setMessages(page.items);
        setNextCursor(page.nextCursor);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await loadPage(nextCursor);
      setMessages((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoadingMore(false);
    }
  }

  const { data: notif } = useFetch<{ mode: 'live' | 'simulation' }>(
    () => apiAuthed.get<{ mode: 'live' | 'simulation' }>('/admin/notif-mode'),
    [],
  );
  const isLive = notif?.mode === 'live';

  if (loading) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;

  return (
    <div className="stack">
      {isLive ? (
        <div className="banner banner-success" style={{ fontSize: 'var(--text-sm)' }}>
          ✅ <strong>Envoi réel (live)</strong> : ces messages sont <strong>réellement envoyés</strong> aux
          destinataires (via Brevo/Twilio) et journalisés ici.
        </div>
      ) : (
        <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0 }}>
          Mode simulation : ces messages sont journalisés et affichés ici, <strong>jamais envoyés</strong>.
          Configurez le mode « live » dans Intégrations pour activer l'envoi réel.
        </p>
      )}
      {messages.length === 0 && <p className="muted">Aucun message {isLive ? '' : 'simulé '}pour l'instant.</p>}
      {messages.map((m) => (
        <article key={m.id} className="card" style={{ padding: 'var(--space-3)' }}>
          <div className="section-head" style={{ marginBottom: 'var(--space-1)' }}>
            <strong>{TRIGGER_LABEL[m.triggerKey] ?? m.triggerKey}</strong>
            <span className="inline-actions">
              <span className="chip" aria-pressed={false} style={{ cursor: 'default' }}>
                {m.channel}
              </span>
              <span className="chip" aria-pressed={false} style={{ cursor: 'default' }}>
                {m.lang.toUpperCase()}
              </span>
              <span className="badge badge-progress">{m.status}</span>
            </span>
          </div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
            À : {m.toAddress} · via {m.provider}
          </div>
          {m.subject && <p style={{ margin: 'var(--space-2) 0 0', fontWeight: 600 }}>{m.subject}</p>}
          <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--text-sm)', whiteSpace: 'pre-wrap' }}>{m.body}</p>
        </article>
      ))}
      {nextCursor && (
        <button className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
    </div>
  );
}
