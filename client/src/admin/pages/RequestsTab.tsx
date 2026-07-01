import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Inbox, Mic, Camera, Video, Clock, Users } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { Dashboard, EventSummary, RequestStatus, RequestType } from '../lib/types';
import { Kpi, type View } from './requests/shared';
import { QueueView } from './requests/QueueView';
import { GroupedView } from './requests/GroupedView';
import { PlanningView } from './requests/PlanningView';

/**
 * Onglet « Demandes » : KPIs + bascule entre 4 vues (file globale, interviews par
 * artiste, reportages par artiste, planning par créneau). Les vues et la machine à
 * états des statuts vivent dans `./requests/*`.
 */
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
        <GroupedView
          eventId={eventId}
          eventName={eventName}
          branding={branding}
          mode="interviews"
          statusF={statusF}
          setStatusF={setStatusF}
          onChanged={() => dash.reload()}
        />
      )}
      {view === 'byStage' && (
        <GroupedView
          eventId={eventId}
          eventName={eventName}
          branding={branding}
          mode="reports"
          statusF={statusF}
          setStatusF={setStatusF}
          onChanged={() => dash.reload()}
        />
      )}
      {view === 'planning' && (
        <PlanningView
          eventId={eventId}
          eventName={eventName}
          branding={branding}
          statusF={statusF}
          setStatusF={setStatusF}
          onChanged={() => dash.reload()}
        />
      )}
    </div>
  );
}
