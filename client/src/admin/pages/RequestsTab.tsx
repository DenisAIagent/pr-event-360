import { useEffect, useMemo, useState } from 'react';
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
import { Icon } from '../../components/Icon';
import {
  Inbox,
  Mic,
  Camera,
  Video,
  Clock,
  Users,
  Check,
  ArrowUp,
  type LucideIcon,
} from 'lucide-react';
import { InfoBubble } from '../components/InfoBubble';
import { EmptyState } from '../components/EmptyState';
import { SkeletonRows } from '../components/Skeleton';
import { useToast } from '../components/Toast';

const QUEUE_COLUMNS = ['Score', 'Type', 'Journaliste', 'Média', 'Email', 'Statut'];

/** Message de confirmation adapté au changement de statut d'une demande. */
function statusMessage(status: RequestStatus): string {
  if (status === 'acceptee') return 'Demande acceptée.';
  if (status === 'refusee') return 'Demande refusée.';
  if (status === 'liste_attente') return "Demande placée en liste d'attente.";
  return `Statut mis à jour : ${STATUS_LABEL[status]}.`;
}

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
    { value: 'byStage', label: 'Reportages par artiste' },
    { value: 'planning', label: 'Planning par créneau' },
  ];

  return (
    <div>
      {dash.data && (
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
          <Kpi num={dash.data.total} label="Demandes" icon={Inbox} variant="k-navy" />
          <Kpi num={dash.data.byType.interview} label="Interviews" icon={Mic} variant="k-blue" />
          <Kpi num={dash.data.byType.photo_report} label="Reportages photo" icon={Camera} variant="k-navy" />
          <Kpi num={dash.data.byType.video_report} label="Reportages vidéo" icon={Video} variant="k-navy" />
          <Kpi
            num={dash.data.waitlist}
            label="Liste d'attente"
            icon={Clock}
            variant="k-amber"
            help={
              <>
                Une demande passe <strong>automatiquement</strong> en liste d'attente quand le quota
                (de l'artiste / du type) est atteint. Si une place se libère, la meilleure demande en
                attente est <strong>promue automatiquement</strong> selon son score.
              </>
            }
          />
          <Kpi num={dash.data.journalists} label="Accréditations" icon={Users} variant="k-green" />
        </div>
      )}

      <div className="toolbar">
        <div className="segmented">
          {VIEWS.map((v) => (
            <button key={v.value} className={view === v.value ? 'on' : ''} onClick={() => setView(v.value)}>
              {v.label}
            </button>
          ))}
        </div>
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
        <GroupedView eventId={eventId} eventName={eventName} branding={branding} mode="interviews" statusF={statusF} setStatusF={setStatusF} onChanged={() => dash.reload()} />
      )}
      {view === 'byStage' && (
        <GroupedView eventId={eventId} eventName={eventName} branding={branding} mode="reports" statusF={statusF} setStatusF={setStatusF} onChanged={() => dash.reload()} />
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
  const toast = useToast();
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
    try {
      await apiAuthed.post(`/admin/events/${eventId}/requests/${requestId}/status`, { status });
      toast.success(statusMessage(status));
      queue.reload();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible, réessayez.');
    }
  }

  // Navigation clavier sur la file : ↑/↓ (ou J/K) pour parcourir, A/R pour
  // accepter/refuser la demande active — traitement rapide sans souris.
  const [active, setActive] = useState(0);
  const items = queue.data ?? [];
  const activeIdx = items.length ? Math.min(active, items.length - 1) : -1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const list = queue.data ?? [];
      if (!list.length) return;
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, list.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === 'a' || e.key === 'A') {
        const it = list[Math.min(active, list.length - 1)];
        if (it) changeStatus(it.id, 'acceptee');
      } else if (e.key === 'r' || e.key === 'R') {
        const it = list[Math.min(active, list.length - 1)];
        if (it) changeStatus(it.id, 'refusee');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.data, active]);

  useEffect(() => {
    if (activeIdx < 0) return;
    document.querySelector('.row.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  const maxScore = Math.max(1, ...items.map((i) => i.score));

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
      <div className="toolbar">
        {TYPE_FILTERS.map((f) => (
          <button key={f.value} className="chip" aria-pressed={typeF === f.value} onClick={() => setTypeF(f.value)}>
            {f.label}
          </button>
        ))}
        <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-line)', margin: '0 var(--space-1)' }} />
        <StatusFilter value={statusF} onChange={setStatusF} />
        <div className="tb-spacer" />
        <button className="btn btn-ghost btn-sm" onClick={exportPdf} disabled={(queue.data?.length ?? 0) === 0}>
          <Icon name="download" /> Exporter
        </button>
      </div>

      {queue.loading && <SkeletonRows count={4} />}
      {queue.error && <div className="banner banner-error">{queue.error}</div>}
      {queue.data?.length === 0 && !queue.loading && (
        <EmptyState
          icon={Inbox}
          title="Aucune demande pour ces filtres"
          hint="Aucun journaliste accrédité n'a encore soumis de demande correspondante. Élargissez les filtres, ou partagez le lien d'inscription pour recevoir des demandes."
        />
      )}

      {items.length > 0 && (
        <>
          <p className="kbd-hint">
            Raccourcis : <kbd>↑</kbd> <kbd>↓</kbd> (ou <kbd>J</kbd> <kbd>K</kbd>) naviguer · <kbd>A</kbd> accepter ·{' '}
            <kbd>R</kbd> refuser
          </p>
          <div className="queue">
            <div className="q-head">
              <div className="col" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Priorité
                <InfoBubble title="Le score de priorité">
                  Note calculée <strong>automatiquement</strong> pour classer les demandes&nbsp;:{' '}
                  <code>poids du média × type de demande + ancienneté</code>. Plus c'est haut, plus la
                  demande remonte. Non modifiable à la main — ajustez les règles dans Paramètres.
                </InfoBubble>
              </div>
              <div className="col">Demandeur</div>
              <div className="col">Objet</div>
              <div className="col">Statut</div>
              <div className="col" style={{ textAlign: 'right', paddingRight: 20 }}>
                Actions
              </div>
            </div>
            {items.map((r, i) => (
              <QueueRow key={r.id} item={r} maxScore={maxScore} onChange={changeStatus} active={i === activeIdx} />
            ))}
            <div className="q-foot">
              <div>
                <b>{items.length}</b> demande{items.length > 1 ? 's' : ''} · triées par score décroissant
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

const TYPE_TAG_CLASS: Record<RequestType, string> = {
  interview: 't-itw',
  photo_report: 't-photo',
  video_report: 't-video',
};
const TYPE_ICON: Record<RequestType, LucideIcon> = {
  interview: Mic,
  photo_report: Camera,
  video_report: Video,
};
const AVA_GRADIENT: Record<RequestType, string> = {
  interview: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-strong))',
  photo_report: 'linear-gradient(135deg, var(--navy-600), var(--color-ink))',
  video_report: 'linear-gradient(135deg, #6b3fa0, #4a2b73)',
};

/** Une ligne de la file (grille) : priorité, demandeur, objet, statut, actions. */
function QueueRow({
  item,
  maxScore,
  onChange,
  active,
}: {
  item: QueueItem;
  maxScore: number;
  onChange: (id: string, s: RequestStatus) => void;
  active?: boolean;
}) {
  const subject = item.subject.artistName ?? item.subject.stageName ?? '—';
  const slot = formatSlot(item.subject);
  const full = item.quota ? item.quota.used >= item.quota.limit : false;
  const pct = Math.min(100, Math.round((item.score / maxScore) * 100));
  const tier = pct >= 66 ? 'tier-hi' : pct <= 33 ? 'tier-lo' : '';
  const TypeIcon = TYPE_ICON[item.type];
  const initials =
    `${item.requester.firstName?.[0] ?? ''}${item.requester.lastName?.[0] ?? ''}`.toUpperCase() || '—';

  return (
    <div
      className={`row ${tier}${item.status === 'liste_attente' ? ' is-waitlist' : ''}${active ? ' is-active' : ''}`}
    >
      <div className="c-score">
        <div className="score-bar">
          <i style={{ height: `${Math.max(6, pct)}%` }} />
        </div>
        <div className="score-val">
          <b>{Math.round(item.score)}</b>
          <small>score</small>
        </div>
      </div>

      <div className="c-req">
        <div className="ava" style={{ background: AVA_GRADIENT[item.type] }}>
          {initials}
        </div>
        <div className="info">
          <div className="nm">{requesterName(item)}</div>
          <div className="sub">
            {item.requester.media ?? 'média n.c.'} · {item.requester.email}
          </div>
        </div>
      </div>

      <div className="c-obj">
        <span className={`type-tag ${TYPE_TAG_CLASS[item.type]}`}>
          <TypeIcon size={12} /> {TYPE_LABEL[item.type]}
        </span>
        <div className="obj-main">{subject}</div>
        {slot && (
          <span className="obj-slot">
            <Clock size={11} /> {slot}
          </span>
        )}
        {item.quota && (
          <div className={`quota${full ? ' full' : ''}`}>
            <span>
              {item.quota.used}/{item.quota.limit}
            </span>
            <div className="track">
              <i style={{ width: `${Math.min(100, (item.quota.used / Math.max(1, item.quota.limit)) * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="c-stat">
        <span className={`badge ${STATUS_BADGE[item.status]}`}>{STATUS_LABEL[item.status]}</span>
      </div>

      <div className="c-act">
        {item.status === 'liste_attente' ? (
          <button className="act promote" onClick={() => onChange(item.id, 'acceptee')}>
            <ArrowUp size={14} /> Promouvoir
          </button>
        ) : item.status === 'acceptee' ? (
          <button className="act reject" onClick={() => onChange(item.id, 'refusee')}>
            Annuler
          </button>
        ) : item.status === 'refusee' ? (
          <button className="act reject" onClick={() => onChange(item.id, 'pas_encore_traite')}>
            Rouvrir
          </button>
        ) : (
          <>
            <button className="act accept" onClick={() => onChange(item.id, 'acceptee')}>
              <Check size={14} /> Accepter
            </button>
            <button className="act reject" onClick={() => onChange(item.id, 'refusee')}>
              Refuser
            </button>
          </>
        )}
        <select
          className="status-select"
          value={SETTABLE_STATUSES.includes(item.status) ? item.status : ''}
          onChange={(e) => onChange(item.id, e.target.value as RequestStatus)}
          aria-label="Changer le statut"
        >
          {!SETTABLE_STATUSES.includes(item.status) && (
            <option value="">{STATUS_LABEL[item.status]} → …</option>
          )}
          {SETTABLE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
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

function Kpi({
  num,
  label,
  icon: KpiIcon,
  variant = 'k-navy',
  help,
}: {
  num: number;
  label: string;
  icon: LucideIcon;
  variant?: string;
  help?: React.ReactNode;
}) {
  return (
    <div className={`kpi ${variant}`}>
      <div className="top">
        <div className="ico">
          <KpiIcon size={16} />
        </div>
        {help && <InfoBubble>{help}</InfoBubble>}
      </div>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
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
