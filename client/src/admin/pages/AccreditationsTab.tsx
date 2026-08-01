import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, Download } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { Accreditation, AccStatus, EventSummary } from '../lib/types';
import { ACC_STATUS_LABEL } from '../lib/labels';
import { printTable } from '../lib/printRequests';
import { InfoBubble } from '../components/InfoBubble';
import { EmptyState } from '../components/EmptyState';
import { SkeletonRows } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { fireConfetti } from '../lib/confetti';

const ACC_BADGE: Record<Accreditation['accStatus'], string> = {
  pas_encore_traite: 'badge-pending',
  acceptee: 'badge-success',
  refusee: 'badge-danger',
};

type AccType = NonNullable<Accreditation['accreditationType']>;
const ACC_TYPE_LABEL: Record<AccType, string> = {
  presse: 'Journaliste',
  photo: 'Photographe',
  video: 'Vidéaste',
};

const TYPE_FILTERS: { v: 'all' | AccType; l: string }[] = [
  { v: 'all', l: 'Tous' },
  { v: 'presse', l: 'Journalistes' },
  { v: 'photo', l: 'Photographes' },
  { v: 'video', l: 'Vidéastes' },
];
const STATUS_FILTERS: { v: 'all' | AccStatus; l: string }[] = [
  { v: 'all', l: 'Tous statuts' },
  { v: 'acceptee', l: 'Acceptés' },
  { v: 'pas_encore_traite', l: 'En attente' },
  { v: 'refusee', l: 'Refusés' },
];

export function AccreditationsTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<Accreditation[]>(
    () => apiAuthed.get<Accreditation[]>(`/admin/events/${eventId}/accreditations`),
    [eventId],
  );
  const ev = useFetch<EventSummary>(() => apiAuthed.get<EventSummary>(`/admin/events/${eventId}`), [eventId]);
  const [typeF, setTypeF] = useState<'all' | AccType>('all');
  const [statusF, setStatusF] = useState<'all' | AccStatus>('all');

  async function process(journalistId: string, action: 'accept' | 'reject') {
    if (
      action === 'reject' &&
      !(await confirm({
        message: 'Refuser cette accréditation ? Le journaliste en sera informé.',
        confirmLabel: 'Refuser',
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await apiAuthed.post(`/admin/events/${eventId}/accreditations/${journalistId}/process`, { action });
      if (action === 'accept') {
        toast.success('Accréditation acceptée — lien personnel envoyé par email.');
        // Micro-victoire : on célèbre la toute première accréditation acceptée.
        try {
          if (!localStorage.getItem('pr360.firstAccredited')) {
            localStorage.setItem('pr360.firstAccredited', '1');
            fireConfetti();
          }
        } catch {
          /* localStorage indisponible : pas de confettis, sans gravité. */
        }
      } else {
        toast.success('Accréditation refusée.');
      }
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible, réessayez.');
    }
  }

  async function resendAccess(journalistId: string) {
    try {
      await apiAuthed.post(
        `/admin/events/${eventId}/accreditations/${journalistId}/access-link/resend`,
      );
      toast.success('Nouveau lien personnel envoyé par email.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible, réessayez.');
    }
  }

  // Export RGPD art. 15/20 : JSON structuré pour répondre aux demandes d'accès/portabilité.
  async function exportGdpr(journalistId: string, name: string) {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/accreditations/${journalistId}/export`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export impossible');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pr360-export-${name.replace(/\s+/g, '-').toLowerCase() || journalistId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export RGPD téléchargé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export impossible, réessayez.');
    }
  }

  // Effacement RGPD (art. 17) : suppression définitive du journaliste et de ses demandes.
  async function erase(journalistId: string, name: string) {
    if (
      !(await confirm({
        title: 'Effacement RGPD',
        message: `Supprimer définitivement « ${name} » et toutes ses demandes ? Action irréversible (droit à l'effacement, RGPD).`,
        confirmLabel: 'Supprimer définitivement',
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await apiAuthed.delete(`/admin/events/${eventId}/accreditations/${journalistId}`);
      toast.success('Données du journaliste effacées (RGPD).');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible, réessayez.');
    }
  }

  if (loading) return <SkeletonRows count={4} />;
  if (error) return <div className="banner banner-error">{error}</div>;

  if (data?.length === 0) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Aucune accréditation pour l'instant"
        hint="Partagez le lien d'inscription (en haut de la page) sur vos réseaux et votre site presse pour recevoir les premières demandes des journalistes."
      />
    );
  }

  const filtered = (data ?? []).filter(
    (a) =>
      (typeF === 'all' || a.accreditationType === typeF) &&
      (statusF === 'all' || a.accStatus === statusF),
  );

  function exportPdf() {
    const rows = filtered.map((a) => [
      `${a.firstName} ${a.lastName ?? ''}`.trim(),
      a.email,
      a.media ?? '—',
      a.accreditationType ? ACC_TYPE_LABEL[a.accreditationType] : '—',
      a.lang.toUpperCase(),
      ACC_STATUS_LABEL[a.accStatus],
    ]);
    const typeLabel = TYPE_FILTERS.find((t) => t.v === typeF)?.l ?? 'Tous';
    printTable({
      eventName: ev.data?.name ?? 'Événement',
      branding: ev.data?.branding ?? null,
      heading: 'Liste des accréditations',
      generatedAt: new Date().toLocaleString('fr-FR'),
      columns: ['Nom', 'Email', 'Média', 'Type', 'Langue', 'Statut'],
      groups: [
        {
          title: typeF === 'all' ? 'Toutes les accréditations' : typeLabel,
          meta: `${rows.length} accrédité${rows.length > 1 ? 's' : ''}`,
          rows,
        },
      ],
    });
  }

  return (
    <div className="stack">
      <div className="filters">
        {TYPE_FILTERS.map((o) => (
          <button key={o.v} className="chip" aria-pressed={typeF === o.v} onClick={() => setTypeF(o.v)}>
            {o.l}
          </button>
        ))}
        <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-line)', margin: '0 var(--space-1)' }} />
        {STATUS_FILTERS.map((o) => (
          <button key={o.v} className="chip" aria-pressed={statusF === o.v} onClick={() => setStatusF(o.v)}>
            {o.l}
          </button>
        ))}
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={exportPdf}
          disabled={filtered.length === 0}
        >
          <Download size={15} /> Exporter en PDF
        </button>
      </div>

      <div className="card" style={{ padding: 'var(--space-3)', overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Demandeur</th>
              <th>Média</th>
              <th>Langue</th>
              <th>Type</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
            <tr key={a.id}>
              <td>
                <strong>
                  {a.firstName} {a.lastName ?? ''}
                </strong>
                <br />
                <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {a.email}
                </span>
              </td>
              <td>{a.media ?? <span className="muted" aria-label="Non précisé">—</span>}</td>
              <td>{a.lang.toUpperCase()}</td>
              <td>
                {a.accreditationType ? (
                  ACC_TYPE_LABEL[a.accreditationType]
                ) : (
                  <span className="muted" aria-label="Non précisé">—</span>
                )}
              </td>
              <td>
                <span className={`badge ${ACC_BADGE[a.accStatus]}`}>{ACC_STATUS_LABEL[a.accStatus]}</span>
              </td>
              <td>
                {a.accStatus === 'pas_encore_traite' ? (
                  <div className="inline-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => process(a.id, 'accept')}>
                      Accepter
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => process(a.id, 'reject')}>
                      Refuser
                    </button>
                  </div>
                ) : a.accStatus === 'acceptee' ? (
                  <button className="btn btn-ghost btn-sm" onClick={() => resendAccess(a.id)}>
                    Renvoyer un lien
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
                <div style={{ marginTop: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => void exportGdpr(a.id, `${a.firstName} ${a.lastName ?? ''}`.trim())}
                    title="Droit d'accès / portabilité (RGPD, art. 15 et 20)"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: 'var(--color-accent, #1598d3)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                    }}
                  >
                    Export (RGPD)
                  </button>
                  <button
                    type="button"
                    onClick={() => erase(a.id, `${a.firstName} ${a.lastName ?? ''}`.trim())}
                    title="Droit à l'effacement (RGPD, art. 17)"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: 'var(--color-danger)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                    }}
                  >
                    Supprimer (RGPD)
                  </button>
                  <InfoBubble title="Droits RGPD">
                    <strong>Export</strong> : JSON structuré (accès art.&nbsp;15 / portabilité art.&nbsp;20).
                    <br />
                    <strong>Supprimer</strong> : effacement définitif art.&nbsp;17 (irréversible).
                  </InfoBubble>
                </div>
              </td>
            </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="muted" style={{ margin: 'var(--space-3) 0 0' }}>
            Aucune accréditation ne correspond à ce filtre.
          </p>
        )}
      </div>
    </div>
  );
}
