import { useEffect, useMemo, useState } from 'react';
import { Inbox, Mic, Camera, Video, Clock, Check, ArrowUp, type LucideIcon } from 'lucide-react';
import { useAuthedApi } from '../../auth/AuthContext';
import { useFetch } from '../../lib/useFetch';
import type { EventBranding, QueueItem, RequestStatus, RequestType } from '../../lib/types';
import { STATUS_BADGE, STATUS_LABEL, TYPE_LABEL, formatSlot } from '../../lib/labels';
import { printTable } from '../../lib/printRequests';
import { Icon } from '../../../components/Icon';
import { InfoBubble } from '../../components/InfoBubble';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonRows } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import {
  QUEUE_COLUMNS,
  TYPE_FILTERS,
  StatusFilter,
  StatusSelect,
  requesterName,
  statusMessage,
  toCells,
  nowStr,
} from './shared';

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

export function QueueView({
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
    const list = queue.data ?? [];
    printTable({
      eventName,
      branding,
      heading: 'Demandes (file)',
      generatedAt: nowStr(),
      columns: QUEUE_COLUMNS,
      groups: [{ title: 'Toutes les demandes', meta: `${list.length} demande(s)`, rows: list.map(toCells) }],
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
        <QueueActions item={item} onChange={onChange} />
        <StatusSelect item={item} onChange={onChange} />
      </div>
    </div>
  );
}

/**
 * Boutons d'action rapide de la file, selon le statut (machine à états unique) :
 * liste d'attente → Promouvoir ; acceptée → Annuler ; refusée → Rouvrir ;
 * sinon → Accepter / Refuser.
 */
function QueueActions({
  item,
  onChange,
}: {
  item: QueueItem;
  onChange: (id: string, s: RequestStatus) => void;
}) {
  if (item.status === 'liste_attente') {
    return (
      <button className="act promote" onClick={() => onChange(item.id, 'acceptee')}>
        <ArrowUp size={14} /> Promouvoir
      </button>
    );
  }
  if (item.status === 'acceptee') {
    return (
      <button className="act reject" onClick={() => onChange(item.id, 'refusee')}>
        Annuler
      </button>
    );
  }
  if (item.status === 'refusee') {
    return (
      <button className="act reject" onClick={() => onChange(item.id, 'pas_encore_traite')}>
        Rouvrir
      </button>
    );
  }
  return (
    <>
      <button className="act accept" onClick={() => onChange(item.id, 'acceptee')}>
        <Check size={14} /> Accepter
      </button>
      <button className="act reject" onClick={() => onChange(item.id, 'refusee')}>
        Refuser
      </button>
    </>
  );
}
