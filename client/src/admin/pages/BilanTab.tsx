import { useParams } from 'react-router-dom';
import {
  Download,
  FileSpreadsheet,
  Printer,
  Users,
  Inbox,
  Newspaper,
  UserCheck,
  Clock,
} from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import { SkeletonRows } from '../components/Skeleton';
import { fetchServerCsv } from '../lib/csvDownload';
import { printBilan, type BilanPrintData } from '../lib/printBilan';

const ACC_STATUS: Record<string, string> = {
  pas_encore_traite: 'En attente',
  acceptee: 'Acceptées',
  refusee: 'Refusées',
};
const REQ_TYPE: Record<string, string> = {
  interview: 'Interviews',
  photo_report: 'Reportages photo',
  video_report: 'Reportages vidéo',
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)', minWidth: 140, flex: '1 1 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--color-muted)' }}>
        <Icon size={16} />
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {hint && (
        <div className="muted" style={{ fontSize: 'var(--text-xs)', marginTop: 6 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

function Breakdown({ title, map, labels }: { title: string; map: Record<string, number>; labels: Record<string, string> }) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return (
    <div className="card" style={{ padding: 'var(--space-4)', flex: '1 1 240px' }}>
      <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)' }}>{title}</h3>
      <ul className="stack" style={{ gap: 6, margin: 0, padding: 0, listStyle: 'none' }}>
        {entries.map(([k, v]) => (
          <li key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 'var(--text-sm)' }}>
            <span>{labels[k] ?? k}</span>
            <strong>{v}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Onglet Bilan : KPIs post-événement, exports CSV serveur et impression PDF.
 */
export function BilanTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const { data, loading, error } = useFetch<BilanPrintData>(
    () => apiAuthed.get<BilanPrintData>(`/admin/events/${eventId}/exports/bilan`),
    [eventId],
  );

  async function download(kind: 'accreditations' | 'requests' | 'planning' | 'coverage', label: string) {
    try {
      await fetchServerCsv(
        `/admin/events/${eventId}/exports/${kind}.csv`,
        `${kind}.csv`,
      );
      toast.success(`${label} téléchargé.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export impossible.');
    }
  }

  function handlePrint() {
    if (!data) return;
    try {
      printBilan(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impression impossible.');
    }
  }

  if (loading) return <SkeletonRows count={5} />;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="stack" style={{ gap: 'var(--space-5)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 280px' }}>
          <h2 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-xl)' }}>Bilan presse</h2>
          <p className="muted" style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
            Synthèse de {data.event.name}
            {data.event.location ? ` · ${data.event.location}` : ''}. Exportez les listes en CSV
            (Excel) ou imprimez le bilan en PDF.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} /> Imprimer le bilan PDF
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StatCard icon={Users} label="Accréditations" value={k.journalistsTotal} />
        <StatCard
          icon={UserCheck}
          label="Acceptées"
          value={k.byAccStatus.acceptee ?? 0}
          hint={`${k.byAccStatus.pas_encore_traite ?? 0} en attente`}
        />
        <StatCard icon={Inbox} label="Demandes" value={k.requestsTotal} />
        <StatCard
          icon={Newspaper}
          label="Retombées"
          value={k.coverageTotal}
          hint={`${k.contributorsCount} contributeur${k.contributorsCount > 1 ? 's' : ''}`}
        />
        <StatCard
          icon={Clock}
          label="Sans retombée"
          value={k.pendingCoverageCount}
          hint="Accrédités acceptés"
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <Breakdown title="Accréditations par statut" map={k.byAccStatus} labels={ACC_STATUS} />
        <Breakdown title="Demandes par type" map={k.byRequestType} labels={REQ_TYPE} />
        <Breakdown title="Retombées par catégorie" map={k.coverageByCategory} labels={{}} />
      </div>

      {(data.highlights.topMedia.length > 0 || data.highlights.topParticipants.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          {data.highlights.topMedia.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-4)', flex: '1 1 260px' }}>
              <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)' }}>Médias les plus représentés</h3>
              <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {data.highlights.topMedia.slice(0, 5).map((m) => (
                  <li key={m.name} style={{ marginBottom: 4 }}>
                    {m.name} <span className="muted">({m.count})</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {data.highlights.topParticipants.length > 0 && (
            <div className="card" style={{ padding: 'var(--space-4)', flex: '1 1 260px' }}>
              <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)' }}>Participants les plus demandés</h3>
              <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {data.highlights.topParticipants.slice(0, 5).map((p) => (
                  <li key={p.name} style={{ marginBottom: 4 }}>
                    {p.name} <span className="muted">({p.count})</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      <section className="card" style={{ padding: 'var(--space-4)' }}>
        <h3 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileSpreadsheet size={16} /> Exports CSV (Excel)
        </h3>
        <p className="muted" style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-sm)' }}>
          Fichiers UTF-8 séparés par point-virgule, prêts pour Excel. Données de l’événement complet.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void download('accreditations', 'Accréditations')}>
            <Download size={14} /> Accréditations
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void download('requests', 'Demandes')}>
            <Download size={14} /> Demandes
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void download('planning', 'Planning')}>
            <Download size={14} /> Planning
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void download('coverage', 'Retombées')}>
            <Download size={14} /> Retombées
          </button>
        </div>
      </section>
    </div>
  );
}
