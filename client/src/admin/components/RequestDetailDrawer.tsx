import { useEffect, useState } from 'react';
import { X, MessageSquare, UserRound, History } from 'lucide-react';
import { useAuthedApi, useAuth } from '../auth/AuthContext';
import { useToast } from './Toast';
import type {
  QueueItem,
  RequestAssignee,
  RequestStatus,
  RequestTimelineItem,
} from '../lib/types';
import { STATUS_BADGE, STATUS_LABEL, TYPE_LABEL, formatSlot, SETTABLE_STATUSES } from '../lib/labels';
import { requesterName } from '../pages/requests/shared';

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Panneau latéral de collaboration sur une demande :
 * assignation, notes internes, timeline (statuts + notes).
 */
export function RequestDetailDrawer({
  eventId,
  item,
  open,
  onClose,
  onChanged,
}: {
  eventId: string;
  item: QueueItem | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const api = useAuthedApi();
  const { user } = useAuth();
  const toast = useToast();
  const [timeline, setTimeline] = useState<RequestTimelineItem[]>([]);
  const [assignees, setAssignees] = useState<RequestAssignee[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [localAssigned, setLocalAssigned] = useState<string>('');

  useEffect(() => {
    if (!open || !item) return;
    setNote('');
    setStatusNote('');
    setLocalAssigned(item.assignedTo?.id ?? '');
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.get<RequestTimelineItem[]>(`/admin/events/${eventId}/requests/${item.id}/timeline`),
      api.get<RequestAssignee[]>(`/admin/events/${eventId}/assignees`),
    ])
      .then(([tl, asg]) => {
        if (cancelled) return;
        setTimeline(tl);
        setAssignees(asg);
      })
      .catch((err: unknown) => {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Chargement impossible');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, eventId]);

  if (!open || !item) return null;

  async function reloadTimeline() {
    if (!item) return;
    const tl = await api.get<RequestTimelineItem[]>(
      `/admin/events/${eventId}/requests/${item.id}/timeline`,
    );
    setTimeline(tl);
  }

  async function handleAssign(userId: string) {
    setBusy(true);
    try {
      const value = userId === '' ? null : userId;
      const res = await api.patch<{ assignedTo: { id: string; fullName: string } | null }>(
        `/admin/events/${eventId}/requests/${item!.id}/assign`,
        { userId: value },
      );
      setLocalAssigned(res.assignedTo?.id ?? '');
      toast.success(res.assignedTo ? `Assigné à ${res.assignedTo.fullName}` : 'Assignation retirée');
      await reloadTimeline();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignation impossible');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.post(`/admin/events/${eventId}/requests/${item!.id}/notes`, { body: note.trim() });
      setNote('');
      toast.success('Note ajoutée');
      await reloadTimeline();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Note non enregistrée');
    } finally {
      setBusy(false);
    }
  }

  async function handleStatus(status: RequestStatus) {
    setBusy(true);
    try {
      await api.post(`/admin/events/${eventId}/requests/${item!.id}/status`, {
        status,
        note: statusNote.trim() || null,
      });
      setStatusNote('');
      toast.success(`Statut : ${STATUS_LABEL[status]}`);
      await reloadTimeline();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mise à jour impossible');
    } finally {
      setBusy(false);
    }
  }

  const subject = item.subject.artistName ?? item.subject.stageName ?? '—';
  const slot = formatSlot(item.subject);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Détail de la demande"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 23, 42, 0.35)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        style={{
          width: 'min(420px, 100vw)',
          height: '100%',
          background: 'var(--color-surface, #fff)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--color-line)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {TYPE_LABEL[item.type]} · score {Math.round(item.score)}
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 18 }}>{requesterName(item)}</h2>
            <div className="muted" style={{ fontSize: 13 }}>
              {item.requester.media ?? '—'} · {item.requester.email}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className={`badge ${STATUS_BADGE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>

        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-line)', fontSize: 13 }}>
          <div>
            <strong>Objet</strong> · {subject}
            {slot ? ` · ${slot}` : ''}
          </div>
          {item.message && (
            <p className="muted" style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
              {item.message}
            </p>
          )}
        </div>

        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-line)' }}>
          <label
            htmlFor="req-assign"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 6 }}
          >
            <UserRound size={14} /> Assigné à
          </label>
          <select
            id="req-assign"
            className="status-select"
            style={{ width: '100%' }}
            value={localAssigned}
            disabled={busy}
            onChange={(e) => void handleAssign(e.target.value)}
          >
            <option value="">Non assigné</option>
            {user && (
              <option value={user.id}>Moi ({user.fullName ?? user.email})</option>
            )}
            {assignees
              .filter((a) => a.id !== user?.id)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
          </select>
        </div>

        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-line)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Changer le statut</div>
          <input
            type="text"
            placeholder="Note de transition (optionnel)"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            maxLength={500}
            style={{ width: '100%', marginBottom: 8, fontSize: 13 }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SETTABLE_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy || item.status === s}
                onClick={() => void handleStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>
            <History size={14} /> Timeline
          </div>
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : timeline.length === 0 ? (
            <p className="muted">Aucun historique pour l’instant.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {timeline.map((t, i) => (
                <li
                  key={`${t.kind}-${t.at}-${i}`}
                  style={{
                    borderLeft: '3px solid var(--color-line)',
                    paddingLeft: 10,
                    fontSize: 13,
                  }}
                >
                  <div className="muted" style={{ fontSize: 11 }}>
                    {formatWhen(t.at)}
                    {t.author ? ` · ${t.author.fullName}` : ' · système'}
                  </div>
                  {t.kind === 'status' && (
                    <div>
                      Statut → <span className={`badge ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                      {t.note && <div style={{ marginTop: 4 }}>{t.note}</div>}
                    </div>
                  )}
                  {t.kind === 'note' && (
                    <div style={{ marginTop: 2, whiteSpace: 'pre-wrap' }}>{t.body}</div>
                  )}
                  {t.kind === 'assignment' && (
                    <div className="muted" style={{ marginTop: 2, fontStyle: 'italic' }}>
                      {t.body}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form
          onSubmit={(e) => void handleAddNote(e)}
          style={{
            padding: '12px 18px',
            borderTop: '1px solid var(--color-line)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
            <MessageSquare size={14} /> Note interne
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Visible uniquement par l’équipe…"
            style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !note.trim()}>
            Ajouter la note
          </button>
        </form>
      </aside>
    </div>
  );
}
