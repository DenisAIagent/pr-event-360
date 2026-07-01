import { useMemo, useState, type ReactNode } from 'react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import type { EventBranding, Lineup, QueueItem, RequestStatus } from '../../lib/types';
import { STATUS_BADGE, STATUS_LABEL, TYPE_LABEL, formatSlot } from '../../lib/labels';
import { printTable, type PrintTableGroup } from '../../lib/printRequests';
import { Icon } from '../../../components/Icon';
import { InfoBubble } from '../../components/InfoBubble';
import { useToast } from '../../components/Toast';
import {
  QUEUE_COLUMNS,
  StatusFilter,
  StatusSelect,
  requesterName,
  statusMessage,
  toCells,
  nowStr,
} from './shared';

/**
 * Vue groupée par sujet : par artiste (interviews) ou par scène (reportages
 * photo/vidéo). Filtre de statut commun + sous-filtre photo/vidéo pour les scènes.
 */
export function GroupedView({
  eventId,
  eventName,
  branding,
  mode,
  statusF,
  setStatusF,
  onChanged,
}: {
  eventId: string;
  eventName: string;
  branding: EventBranding | null;
  mode: 'interviews' | 'reports';
  statusF: RequestStatus | 'all';
  setStatusF: (s: RequestStatus | 'all') => void;
  onChanged: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const lineup = useFetch<Lineup>(() => apiAuthed.get<Lineup>(`/admin/events/${eventId}/lineup`), [eventId]);
  // Sous-filtre de type pour les reportages (photo / vidéo / les deux).
  const [reportType, setReportType] = useState<'all' | 'photo_report' | 'video_report'>('all');
  const [busy, setBusy] = useState(false);

  const query = statusF !== 'all' ? `?status=${statusF}` : '';
  const queue = useFetch<QueueItem[]>(
    () => apiAuthed.get<QueueItem[]>(`/admin/events/${eventId}/requests${query}`),
    [eventId, query],
  );

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

  // Accepte les N meilleures demandes (par score) non encore traitées, dans la
  // limite du quota restant. Le serveur gère la liste d'attente au-delà.
  async function acceptTopN(items: QueueItem[], n: number) {
    if (n <= 0 || busy) return;
    setBusy(true);
    try {
      const candidates = items
        .filter((i) => i.status !== 'acceptee' && i.status !== 'refusee')
        .slice(0, n);
      for (const c of candidates) {
        await apiAuthed.post(`/admin/events/${eventId}/requests/${c.id}/status`, { status: 'acceptee' });
      }
      queue.reload();
      onChanged();
      toast.success(
        candidates.length > 0
          ? `${candidates.length} demande${candidates.length > 1 ? 's' : ''} acceptée${candidates.length > 1 ? 's' : ''}.`
          : 'Aucune demande à accepter.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible, réessayez.');
    } finally {
      setBusy(false);
    }
  }

  // Filtre les items pertinents pour ce mode (tous deux regroupés par artiste).
  const relevant = useMemo(() => {
    const all = queue.data ?? [];
    if (mode === 'interviews') return all.filter((i) => i.type === 'interview');
    return all.filter(
      (i) =>
        (i.type === 'photo_report' || i.type === 'video_report') &&
        (reportType === 'all' || i.type === reportType),
    );
  }, [queue.data, mode, reportType]);

  // Regroupe par artiste.
  const grouped = useMemo(() => {
    const map = new Map<string, QueueItem[]>();
    for (const item of relevant) {
      const key = item.subject.artistId ?? '__none__';
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [relevant]);

  const entities = lineup.data?.artists ?? [];
  const ordered = [...entities].sort((a, b) => {
    const ca = grouped.get(a.id)?.length ?? 0;
    const cb = grouped.get(b.id)?.length ?? 0;
    if (ca !== cb) return cb - ca;
    return a.name.localeCompare(b.name);
  });

  const emptyLabel =
    mode === 'interviews'
      ? 'Aucun artiste dans le lineup. Ajoutez des artistes pour gérer les interviews.'
      : 'Aucun artiste dans le lineup. Ajoutez des artistes pour gérer les reportages.';

  const heading = mode === 'interviews' ? "Demandes d'interview par artiste" : 'Reportages par artiste';

  function buildGroup(name: string, items: QueueItem[], quota: { used: number; limit: number } | null): PrintTableGroup {
    return {
      title: name,
      meta: quota ? `Quota ${quota.used}/${quota.limit}` : `${items.length} demande(s)`,
      rows: items.map(toCells),
    };
  }
  function exportGroups(groups: PrintTableGroup[]) {
    printTable({ eventName, branding, heading, generatedAt: nowStr(), columns: QUEUE_COLUMNS, groups });
  }
  function exportAll() {
    exportGroups(
      ordered.map((e) => {
        const items = grouped.get(e.id) ?? [];
        return buildGroup(e.name, items, items.find((i) => i.quota)?.quota ?? null);
      }),
    );
  }

  return (
    <>
      <div className="filters">
        {mode === 'reports' && (
          <>
            {([
              { v: 'all', l: 'Tous reportages' },
              { v: 'photo_report', l: 'Photo' },
              { v: 'video_report', l: 'Vidéo' },
            ] as const).map((o) => (
              <button key={o.v} className="chip" aria-pressed={reportType === o.v} onClick={() => setReportType(o.v)}>
                {o.l}
              </button>
            ))}
            <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-line)', margin: '0 var(--space-1)' }} />
          </>
        )}
        <StatusFilter value={statusF} onChange={setStatusF} />
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={exportAll}
          disabled={ordered.every((e) => (grouped.get(e.id)?.length ?? 0) === 0)}
        >
          <Icon name="download" /> Exporter en PDF
        </button>
      </div>

      {(queue.loading || lineup.loading) && <p className="muted">Chargement…</p>}
      {queue.error && <div className="banner banner-error">{queue.error}</div>}
      {!lineup.loading && entities.length === 0 && <p className="muted">{emptyLabel}</p>}

      {ordered.map((entity) => {
        const items = grouped.get(entity.id) ?? [];
        // Photo et vidéo ont des quotas séparés : on n'affiche un quota de groupe
        // (et l'action « accepter les N meilleurs ») que pour un type précis.
        const quota =
          mode === 'reports' && reportType === 'all' ? null : items.find((i) => i.quota)?.quota ?? null;
        const noun = mode === 'interviews' ? 'demande' : 'reportage';
        const remaining = quota ? Math.max(0, quota.limit - quota.used) : 0;
        const pending = items.filter((i) => i.status !== 'acceptee' && i.status !== 'refusee').length;
        const toAccept = Math.min(remaining, pending);
        return (
          <SubjectGroup
            key={`${entity.id}:${items.length > 0 ? 'has' : 'none'}`}
            name={entity.name}
            count={items.length}
            quota={quota}
            noun={noun}
            toAccept={toAccept}
            busy={busy}
            onAcceptTopN={() => acceptTopN(items, toAccept)}
            onExport={items.length > 0 ? () => exportGroups([buildGroup(entity.name, items, quota)]) : undefined}
          >
            {items.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Aucune demande.
              </p>
            ) : (
              items.map((r) => <RequestCard key={r.id} item={r} onChange={changeStatus} hideSubject />)
            )}
          </SubjectGroup>
        );
      })}
    </>
  );
}

function SubjectGroup({
  name,
  count,
  quota,
  noun,
  toAccept,
  busy,
  onAcceptTopN,
  onExport,
  children,
}: {
  name: string;
  count: number;
  quota: { used: number; limit: number } | null;
  noun: string;
  toAccept: number;
  busy: boolean;
  onAcceptTopN: () => void;
  onExport?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(count > 0);
  const full = quota ? quota.used >= quota.limit : false;
  return (
    <section className="artist-group">
      <button className="artist-group-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="artist-group-name">
          <span className="artist-group-caret">{open ? '▾' : '▸'}</span> {name}
        </span>
        <span className="artist-group-meta">
          {quota && (
            <>
              <span className={`badge ${full ? 'badge-danger' : 'badge-success'}`}>
                Quota {quota.used}/{quota.limit}
              </span>
              <InfoBubble title="Quota">
                <strong>Places accordées / maximum</strong> pour ce groupe. Une fois le maximum atteint, les
                nouvelles demandes passent en liste d'attente. Le maximum se règle sur l'artiste (Configuration)
                ou par défaut dans Paramètres.
              </InfoBubble>
            </>
          )}
          <span className="badge badge-progress">
            {count} {noun}
            {count > 1 ? 's' : ''}
          </span>
        </span>
      </button>
      {open && (
        <div className="artist-group-body">
          {(toAccept > 0 || onExport) && (
            <div className="inline-actions" style={{ marginBottom: 'var(--space-3)' }}>
              {toAccept > 0 && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAcceptTopN();
                  }}
                >
                  <Icon name="check" /> Accepter {toAccept > 1 ? `les ${toAccept} meilleurs` : 'le meilleur'} (quota
                  restant)
                </button>
              )}
              {toAccept > 0 && (
                <InfoBubble title="Accepter les meilleurs">
                  Accepte d'un coup les demandes au <strong>meilleur score</strong> de ce groupe, dans la
                  limite des <strong>places restantes</strong> avant d'atteindre le quota. Les autres restent
                  en attente.
                </InfoBubble>
              )}
              {onExport && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport();
                  }}
                >
                  <Icon name="download" /> PDF de ce groupe
                </button>
              )}
            </div>
          )}
          {children}
        </div>
      )}
    </section>
  );
}

function RequestCard({
  item,
  onChange,
  hideSubject = false,
  active = false,
}: {
  item: QueueItem;
  onChange: (id: string, s: RequestStatus) => void;
  hideSubject?: boolean;
  active?: boolean;
}) {
  const subject = item.subject.artistName ?? item.subject.stageName ?? '—';
  const full = item.quota ? item.quota.used >= item.quota.limit : false;
  const slot = formatSlot(item.subject);

  return (
    <article
      className={`req-card${item.status === 'liste_attente' ? ' is-waitlist' : ''}${active ? ' is-active' : ''}`}
    >
      <div className="score-chip">
        <span className="v">{Math.round(item.score)}</span>
        <span className="k">score</span>
      </div>

      <div className="req-main">
        <h4>
          {hideSubject ? TYPE_LABEL[item.type] : `${TYPE_LABEL[item.type]} · ${subject}`}
          {slot && <span className="muted"> · {slot}</span>}
        </h4>
        <div className="req-meta">
          <strong>{requesterName(item)}</strong> — {item.requester.media ?? 'média n.c.'} · {item.requester.email}
        </div>
        {item.message && <p className="req-msg">{item.message}</p>}
      </div>

      <div className="req-aside">
        <span className={`badge ${STATUS_BADGE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
        {!hideSubject && item.quota && (
          <div className="quota-meter">
            Quota {item.quota.used}/{item.quota.limit}
            <div className={`quota-bar${full ? ' full' : ''}`}>
              <i style={{ width: `${Math.min(100, (item.quota.used / Math.max(1, item.quota.limit)) * 100)}%` }} />
            </div>
          </div>
        )}
        <StatusSelect item={item} onChange={onChange} />
      </div>
    </article>
  );
}
