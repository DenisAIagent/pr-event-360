import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { NotificationRow } from '../lib/types';
import { TRIGGER_LABEL } from '../lib/labels';

export function MessagesTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error } = useFetch<NotificationRow[]>(
    () => apiAuthed.get<NotificationRow[]>(`/admin/events/${eventId}/messages`),
    [eventId],
  );

  if (loading) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;

  return (
    <div className="stack">
      <p className="muted" style={{ fontSize: 'var(--text-sm)', marginTop: 0 }}>
        Mode simulation : ces messages sont journalisés et affichés ici, jamais envoyés. Brevo/Twilio seront branchés
        ultérieurement sans changer ce flux.
      </p>
      {data?.length === 0 && <p className="muted">Aucun message simulé pour l'instant.</p>}
      {data?.map((m) => (
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
    </div>
  );
}
