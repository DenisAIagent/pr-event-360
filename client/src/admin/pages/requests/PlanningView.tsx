import { useMemo, useState } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import type { EventBranding, QueueItem, RequestStatus } from '../../lib/types';
import { STATUS_LABEL, formatSlotDate } from '../../lib/labels';
import { printTable, type PrintTableGroup } from '../../lib/printRequests';
import { Icon } from '../../../components/Icon';
import { InfoBubble } from '../../components/InfoBubble';
import { useToast } from '../../components/Toast';
import {
  PLANNING_COLUMNS,
  StatusFilter,
  StatusSelect,
  requesterName,
  statusMessage,
  timeRange,
  nowStr,
} from './shared';

/** Planning chronologique des interviews (jour J), groupé par jour. */
export function PlanningView({
  eventId,
  eventName,
  branding,
  statusF,
  setStatusF,
  onChanged,
}: {
  eventId: string;
  eventName: string;
  branding: EventBranding | null;
  statusF: RequestStatus | 'all';
  setStatusF: (s: RequestStatus | 'all') => void;
  onChanged: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const query = statusF !== 'all' ? `&status=${statusF}` : '';
  const queue = useFetch<QueueItem[]>(
    () => apiAuthed.get<QueueItem[]>(`/admin/events/${eventId}/requests?type=interview${query}`),
    [eventId, query],
  );

  const [busy, setBusy] = useState(false);

  async function changeStatus(requestId: string, status: RequestStatus) {
    try {
      await apiAuthed.post(`/admin/events/${eventId}/requests/${requestId}/status`, { status });
      toast.success(statusMessage(status));
      queue.reload();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible, réessayez.');
    }
  }

  // Attribue automatiquement les créneaux aux interviews acceptées, par priorité.
  async function generate() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiAuthed.post<{ assigned: number; unscheduled: number }>(
        `/admin/events/${eventId}/planning/generate`,
      );
      toast.success(
        `Planning généré : ${res.assigned} créneau${res.assigned > 1 ? 'x' : ''} attribué${res.assigned > 1 ? 's' : ''}` +
          (res.unscheduled > 0
            ? ` · ${res.unscheduled} interview(s) sans créneau (plus de créneaux disponibles)`
            : '') +
          '.',
      );
      queue.reload();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Génération impossible.');
    } finally {
      setBusy(false);
    }
  }

  const { days, noSlot } = useMemo(() => {
    const items = queue.data ?? [];
    const slotted = items
      .filter((i) => i.subject.slotDay && i.subject.slotStart)
      .sort((a, b) =>
        `${a.subject.slotDay}${a.subject.slotStart}`.localeCompare(`${b.subject.slotDay}${b.subject.slotStart}`),
      );
    const map = new Map<string, QueueItem[]>();
    for (const i of slotted) {
      const k = i.subject.slotDay!;
      const arr = map.get(k) ?? [];
      arr.push(i);
      map.set(k, arr);
    }
    return { days: [...map.entries()], noSlot: items.filter((i) => !(i.subject.slotDay && i.subject.slotStart)) };
  }, [queue.data]);

  function planningCells(i: QueueItem): string[] {
    return [
      timeRange(i),
      i.subject.artistName ?? '—',
      requesterName(i),
      i.requester.media ?? '—',
      STATUS_LABEL[i.status],
    ];
  }
  function exportPlanning() {
    const groups: PrintTableGroup[] = days.map(([day, items]) => ({
      title: formatSlotDate(day),
      meta: `${items.length} interview(s)`,
      rows: items.map(planningCells),
    }));
    if (noSlot.length) groups.push({ title: 'Sans créneau attribué', rows: noSlot.map(planningCells) });
    printTable({
      eventName,
      branding,
      heading: 'Planning des interviews',
      generatedAt: nowStr(),
      columns: PLANNING_COLUMNS,
      groups,
    });
  }

  const empty = days.length === 0 && noSlot.length === 0;

  return (
    <>
      <div className="filters">
        <StatusFilter value={statusF} onChange={setStatusF} />
        <button
          className="btn btn-primary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={generate}
          disabled={busy}
        >
          <Icon name="check" /> {busy ? 'Génération…' : 'Générer le planning'}
        </button>
        <InfoBubble title="Générer le planning">
          Attribue les créneaux aux interviews <strong>acceptées</strong>, par priorité (meilleur score →
          créneau le plus tôt). Vous pouvez le relancer à tout moment&nbsp;: il <strong>recalcule et
          réattribue</strong> tous les créneaux. Les demandes non acceptées ne sont pas planifiées.
        </InfoBubble>
        <button className="btn btn-ghost btn-sm" onClick={exportPlanning} disabled={empty}>
          <Icon name="download" /> Exporter en PDF
        </button>
      </div>
      <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '0 0 var(--space-2)' }}>
        « Générer le planning » attribue automatiquement les créneaux aux interviews{' '}
        <strong>acceptées</strong>, par ordre de priorité (meilleur score → créneau le plus tôt). Recalculable
        à volonté.
      </p>

      {queue.loading && <p className="muted">Chargement…</p>}
      {queue.error && <div className="banner banner-error">{queue.error}</div>}
      {!queue.loading && empty && <p className="muted">Aucune interview à planifier.</p>}

      {days.map(([day, items]) => (
        <section className="artist-group" key={day}>
          <div className="artist-group-head" style={{ cursor: 'default' }}>
            <span className="artist-group-name">{formatSlotDate(day)}</span>
            <span className="badge badge-progress">
              {items.length} interview{items.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="artist-group-body">
            {items.map((i) => (
              <PlanningRow key={i.id} item={i} onChange={changeStatus} />
            ))}
          </div>
        </section>
      ))}

      {noSlot.length > 0 && (
        <section className="artist-group">
          <div className="artist-group-head" style={{ cursor: 'default' }}>
            <span className="artist-group-name">Sans créneau attribué</span>
            <span className="badge badge-pending">{noSlot.length}</span>
          </div>
          <div className="artist-group-body">
            {noSlot.map((i) => (
              <PlanningRow key={i.id} item={i} onChange={changeStatus} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function PlanningRow({ item, onChange }: { item: QueueItem; onChange: (id: string, s: RequestStatus) => void }) {
  const time = timeRange(item);
  return (
    <div className="planning-row">
      <span className="planning-time">{time || '—'}</span>
      <span className="planning-artist">{item.subject.artistName ?? '—'}</span>
      <span className="planning-journalist">
        <strong>{requesterName(item)}</strong>
        <span className="muted"> · {item.requester.media ?? 'média n.c.'}</span>
      </span>
      <StatusSelect item={item} onChange={onChange} />
    </div>
  );
}
