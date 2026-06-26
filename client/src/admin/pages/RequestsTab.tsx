import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type {
  Dashboard,
  EventBranding,
  EventSummary,
  Lineup,
  QueueItem,
  RequestStatus,
  RequestType,
} from '../lib/types';
import {
  SETTABLE_STATUSES,
  STATUS_BADGE,
  STATUS_LABEL,
  TYPE_LABEL,
  formatSlot,
  formatSlotDate,
} from '../lib/labels';
import { printTable, type PrintTableGroup } from '../lib/printRequests';

const QUEUE_COLUMNS = ['Score', 'Type', 'Journaliste', 'Média', 'Email', 'Statut'];

function requesterName(item: QueueItem): string {
  return `${item.requester.firstName} ${item.requester.lastName ?? ''}`.trim();
}

function toCells(item: QueueItem): string[] {
  const slot = formatSlot(item.subject);
  return [
    String(Math.round(item.score)),
    `${TYPE_LABEL[item.type]}${slot ? ` (${slot})` : ''}`,
    requesterName(item),
    item.requester.media ?? '—',
    item.requester.email,
    STATUS_LABEL[item.status],
  ];
}

function nowStr(): string {
  return new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}

const TYPE_FILTERS: { value: RequestType | 'all'; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'interview', label: 'Interviews' },
  { value: 'photo_report', label: 'Reportages photo' },
  { value: 'video_report', label: 'Reportages vidéo' },
];

const ALL_STATUSES: RequestStatus[] = [
  'pas_encore_traite',
  'en_cours',
  'transmise_prod',
  'attente_artiste',
  'acceptee',
  'refusee',
  'liste_attente',
];

type View = 'queue' | 'byArtist' | 'byStage' | 'planning';

export function RequestsTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const [view, setView] = useState<View>('queue');
  const [typeF, setTypeF] = useState<RequestType | 'all'>('all');
  const [statusF, setStatusF] = useState<RequestStatus | 'all'>('all');

  const dash = useFetch<Dashboard>(() => apiAuthed.get<Dashboard>(`/admin/events/${eventId}/dashboard`), [eventId]);
  const ev = useFetch<EventSummary>(() => apiAuthed.get<EventSummary>(`/admin/events/${eventId}`), [eventId]);
  const eventName = ev.data?.name ?? 'Événement';
  const branding = ev.data?.branding ?? null;

  const VIEWS: { value: View; label: string }[] = [
    { value: 'queue', label: 'File globale' },
    { value: 'byArtist', label: 'Interviews par artiste' },
    { value: 'byStage', label: 'Reportages par scène' },
    { value: 'planning', label: 'Planning par créneau' },
  ];

  return (
    <div>
      {dash.data && (
        <div className="kpis">
          <Kpi num={dash.data.total} label="Demandes" />
          <Kpi num={dash.data.byType.interview} label="Interviews" />
          <Kpi num={dash.data.byType.photo_report} label="Reportages photo" />
          <Kpi num={dash.data.byType.video_report} label="Reportages vidéo" />
          <Kpi num={dash.data.waitlist} label="Liste d'attente" />
          <Kpi num={dash.data.journalists} label="Journalistes" />
        </div>
      )}

      <div className="filters">
        {VIEWS.map((v) => (
          <button key={v.value} className="chip" aria-pressed={view === v.value} onClick={() => setView(v.value)}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'queue' && (
        <QueueView
          eventId={eventId}
          eventName={eventName}
          branding={branding}
          typeF={typeF}
          statusF={statusF}
          setTypeF={setTypeF}
          setStatusF={setStatusF}
          onChanged={() => dash.reload()}
        />
      )}
      {view === 'byArtist' && (
        <GroupedView eventId={eventId} eventName={eventName} branding={branding} groupBy="artist" statusF={statusF} setStatusF={setStatusF} onChanged={() => dash.reload()} />
      )}
      {view === 'byStage' && (
        <GroupedView eventId={eventId} eventName={eventName} branding={branding} groupBy="stage" statusF={statusF} setStatusF={setStatusF} onChanged={() => dash.reload()} />
      )}
      {view === 'planning' && (
        <PlanningView eventId={eventId} eventName={eventName} branding={branding} statusF={statusF} setStatusF={setStatusF} onChanged={() => dash.reload()} />
      )}
    </div>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: RequestStatus | 'all';
  onChange: (s: RequestStatus | 'all') => void;
}) {
  return (
    <select
      className="status-select"
      value={value}
      onChange={(e) => onChange(e.target.value as RequestStatus | 'all')}
      aria-label="Filtrer par statut"
    >
      <option value="all">Tous les statuts</option>
      {ALL_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function QueueView({
  eventId,
  eventName,
  branding,
  typeF,
  statusF,
  setTypeF,
  setStatusF,
  onChanged,
}: {
  eventId: string;
  eventName: string;
  branding: EventBranding | null;
  typeF: RequestType | 'all';
  statusF: RequestStatus | 'all';
  setTypeF: (t: RequestType | 'all') => void;
  setStatusF: (s: RequestStatus | 'all') => void;
  onChanged: () => void;
}) {
  const apiAuthed = useAuthedApi();
  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (typeF !== 'all') p.set('type', typeF);
    if (statusF !== 'all') p.set('status', statusF);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [typeF, statusF]);

  const queue = useFetch<QueueItem[]>(
    () => apiAuthed.get<QueueItem[]>(`/admin/events/${eventId}/requests${query}`),
    [eventId, query],
  );

  async function changeStatus(requestId: string, status: RequestStatus) {
    await apiAuthed.post(`/admin/events/${eventId}/requests/${requestId}/status`, { status });
    queue.reload();
    onChanged();
  }

  function exportPdf() {
    const items = queue.data ?? [];
    printTable({
      eventName,
      branding,
      heading: 'Demandes (file)',
      generatedAt: nowStr(),
      columns: QUEUE_COLUMNS,
      groups: [{ title: 'Toutes les demandes', meta: `${items.length} demande(s)`, rows: items.map(toCells) }],
    });
  }

  return (
    <>
      <div className="filters">
        {TYPE_FILTERS.map((f) => (
          <button key={f.value} className="chip" aria-pressed={typeF === f.value} onClick={() => setTypeF(f.value)}>
            {f.label}
          </button>
        ))}
        <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-line)', margin: '0 var(--space-1)' }} />
        <StatusFilter value={statusF} onChange={setStatusF} />
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={exportPdf}
          disabled={(queue.data?.length ?? 0) === 0}
        >
          ⤓ Exporter en PDF
        </button>
      </div>

      {queue.loading && <p className="muted">Chargement…</p>}
      {queue.error && <div className="banner banner-error">{queue.error}</div>}
      {queue.data?.length === 0 && !queue.loading && <p className="muted">Aucune demande pour ces filtres.</p>}

      {queue.data?.map((r) => (
        <RequestCard key={r.id} item={r} onChange={changeStatus} />
      ))}
    </>
  );
}

/**
 * Vue groupée par sujet : par artiste (interviews) ou par scène (reportages
 * photo/vidéo). Filtre de statut commun + sous-filtre photo/vidéo pour les scènes.
 */
function GroupedView({
  eventId,
  eventName,
  branding,
  groupBy,
  statusF,
  setStatusF,
  onChanged,
}: {
  eventId: string;
  eventName: string;
  branding: EventBranding | null;
  groupBy: 'artist' | 'stage';
  statusF: RequestStatus | 'all';
  setStatusF: (s: RequestStatus | 'all') => void;
  onChanged: () => void;
}) {
  const apiAuthed = useAuthedApi();
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
    await apiAuthed.post(`/admin/events/${eventId}/requests/${requestId}/status`, { status });
    queue.reload();
    onChanged();
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
    } finally {
      setBusy(false);
    }
  }

  // Filtre les items pertinents pour ce mode de groupement.
  const relevant = useMemo(() => {
    const all = queue.data ?? [];
    if (groupBy === 'artist') return all.filter((i) => i.type === 'interview');
    return all.filter(
      (i) =>
        (i.type === 'photo_report' || i.type === 'video_report') &&
        (reportType === 'all' || i.type === reportType),
    );
  }, [queue.data, groupBy, reportType]);

  // Regroupe par sujet (artiste ou scène).
  const grouped = useMemo(() => {
    const map = new Map<string, QueueItem[]>();
    for (const item of relevant) {
      const key = (groupBy === 'artist' ? item.subject.artistId : item.subject.stageId) ?? '__none__';
      const arr = map.get(key) ?? [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [relevant, groupBy]);

  const entities = groupBy === 'artist' ? lineup.data?.artists ?? [] : lineup.data?.stages ?? [];
  const ordered = [...entities].sort((a, b) => {
    const ca = grouped.get(a.id)?.length ?? 0;
    const cb = grouped.get(b.id)?.length ?? 0;
    if (ca !== cb) return cb - ca;
    return a.name.localeCompare(b.name);
  });

  const emptyLabel =
    groupBy === 'artist'
      ? 'Aucun artiste dans le lineup. Ajoutez des artistes pour gérer les interviews.'
      : 'Aucune scène. Ajoutez des scènes dans le lineup pour gérer les reportages.';

  const heading = groupBy === 'artist' ? "Demandes d'interview par artiste" : 'Reportages par scène';

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
        {groupBy === 'stage' && (
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
          ⤓ Exporter en PDF
        </button>
      </div>

      {(queue.loading || lineup.loading) && <p className="muted">Chargement…</p>}
      {queue.error && <div className="banner banner-error">{queue.error}</div>}
      {!lineup.loading && entities.length === 0 && <p className="muted">{emptyLabel}</p>}

      {ordered.map((entity) => {
        const items = grouped.get(entity.id) ?? [];
        const quota = items.find((i) => i.quota)?.quota ?? null;
        const noun = groupBy === 'artist' ? 'demande' : 'reportage';
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

const PLANNING_COLUMNS = ['Créneau', 'Artiste', 'Journaliste', 'Média', 'Statut'];

function timeRange(item: QueueItem): string {
  const s = item.subject.slotStart?.slice(0, 5) ?? '';
  const e = item.subject.slotEnd?.slice(0, 5);
  return e ? `${s}–${e}` : s;
}

/** Planning chronologique des interviews (jour J), groupé par jour. */
function PlanningView({
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
  const query = statusF !== 'all' ? `&status=${statusF}` : '';
  const queue = useFetch<QueueItem[]>(
    () => apiAuthed.get<QueueItem[]>(`/admin/events/${eventId}/requests?type=interview${query}`),
    [eventId, query],
  );

  async function changeStatus(requestId: string, status: RequestStatus) {
    await apiAuthed.post(`/admin/events/${eventId}/requests/${requestId}/status`, { status });
    queue.reload();
    onChanged();
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
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={exportPlanning}
          disabled={empty}
        >
          ⤓ Exporter le planning en PDF
        </button>
      </div>

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
      <select
        className="status-select"
        value={SETTABLE_STATUSES.includes(item.status) ? item.status : ''}
        onChange={(e) => onChange(item.id, e.target.value as RequestStatus)}
        aria-label="Changer le statut"
      >
        {!SETTABLE_STATUSES.includes(item.status) && <option value="">{STATUS_LABEL[item.status]} → …</option>}
        {SETTABLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </div>
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
  children: React.ReactNode;
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
            <span className={`badge ${full ? 'badge-danger' : 'badge-success'}`}>
              Quota {quota.used}/{quota.limit}
            </span>
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
                  ✓ Accepter {toAccept > 1 ? `les ${toAccept} meilleurs` : 'le meilleur'} (quota restant)
                </button>
              )}
              {onExport && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExport();
                  }}
                >
                  ⤓ PDF de ce groupe
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

function Kpi({ num, label }: { num: number; label: string }) {
  return (
    <div className="kpi">
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

function RequestCard({
  item,
  onChange,
  hideSubject = false,
}: {
  item: QueueItem;
  onChange: (id: string, s: RequestStatus) => void;
  hideSubject?: boolean;
}) {
  const subject = item.subject.artistName ?? item.subject.stageName ?? '—';
  const full = item.quota ? item.quota.used >= item.quota.limit : false;
  const slot = formatSlot(item.subject);

  return (
    <article className={`req-card${item.status === 'liste_attente' ? ' is-waitlist' : ''}`}>
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
        <select
          className="status-select"
          value={SETTABLE_STATUSES.includes(item.status) ? item.status : ''}
          onChange={(e) => onChange(item.id, e.target.value as RequestStatus)}
          aria-label="Changer le statut"
        >
          {!SETTABLE_STATUSES.includes(item.status) && <option value="">{STATUS_LABEL[item.status]} → …</option>}
          {SETTABLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </article>
  );
}
