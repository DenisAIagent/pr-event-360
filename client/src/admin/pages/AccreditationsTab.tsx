import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, Download, QrCode } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { Accreditation, AccStatus, EventSummary } from '../lib/types';
import { ACC_STATUS_LABEL } from '../lib/labels';
import { printTable } from '../lib/printRequests';
import { downloadCsv, fetchServerCsv } from '../lib/csvDownload';
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

  async function showBadge(journalistId: string) {
    try {
      const badge = await apiAuthed.get<{
        qrDataUrl: string;
        journalist: { firstName: string; lastName: string | null; media: string | null };
        event: { name: string };
      }>(`/admin/events/${eventId}/journalists/${journalistId}/badge`);
      const w = window.open('', '_blank', 'width=360,height=520');
      if (!w) {
        toast.error('Popup bloquée — autorisez les fenêtres pour afficher le badge.');
        return;
      }
      const name = `${badge.journalist.firstName} ${badge.journalist.lastName ?? ''}`.trim();
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>Badge ${name}</title>
        <style>body{font-family:system-ui,sans-serif;text-align:center;padding:24px}
        img{width:240px;height:240px} h1{font-size:18px;margin:12px 0 4px}
        .m{color:#666;font-size:13px}</style></head><body>
        <div class="m">${badge.event.name}</div>
        <h1>${name}</h1>
        <div class="m">${badge.journalist.media ?? ''}</div>
        <img src="${badge.qrDataUrl}" alt="QR check-in"/>
        <p class="m">Présentez ce QR à l’entrée presse</p>
        <script>window.onload=function(){window.print()}</script>
        </body></html>`);
      w.document.close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Badge impossible');
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

  function exportCsvFiltered() {
    const headers = ['Nom', 'Email', 'Média', 'Type', 'Langue', 'Statut'];
    const rows = filtered.map((a) => [
      `${a.firstName} ${a.lastName ?? ''}`.trim(),
      a.email,
      a.media ?? '',
      a.accreditationType ? ACC_TYPE_LABEL[a.accreditationType] : '',
      a.lang.toUpperCase(),
      ACC_STATUS_LABEL[a.accStatus],
    ]);
    downloadCsv('accreditations-filtre.csv', headers, rows);
    toast.success('CSV téléchargé (filtre courant).');
  }

  async function exportCsvFull() {
    try {
      await fetchServerCsv(`/admin/events/${eventId}/exports/accreditations.csv`, 'accreditations.csv');
      toast.success('CSV complet téléchargé.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export impossible.');
    }
  }

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
    <div className="stack event-page acc-page">
      <div className="filters filters-sticky">
        {TYPE_FILTERS.map((o) => (
          <button key={o.v} className="chip" aria-pressed={typeF === o.v} onClick={() => setTypeF(o.v)}>
            {o.l}
          </button>
        ))}
        <span className="filters-sep" aria-hidden />
        {STATUS_FILTERS.map((o) => (
          <button key={o.v} className="chip" aria-pressed={statusF === o.v} onClick={() => setStatusF(o.v)}>
            {o.l}
          </button>
        ))}
        <div className="filters-exports m-hide-mobile">
          <button
            className="btn btn-ghost btn-sm"
            onClick={exportCsvFiltered}
            disabled={filtered.length === 0}
            title="CSV du filtre affiché"
          >
            <Download size={15} /> CSV
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => void exportCsvFull()} title="Export serveur complet">
            <Download size={15} /> CSV complet
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportPdf} disabled={filtered.length === 0}>
            <Download size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Desktop : tableau */}
      <div className="card table-card m-hide-mobile" style={{ padding: 'var(--space-3)', overflowX: 'auto' }}>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => resendAccess(a.id)}>
                        Renvoyer un lien
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title="Badge QR check-in"
                        onClick={() => void showBadge(a.id)}
                      >
                        <QrCode size={14} /> Badge
                      </button>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                  <div className="rgpd-links">
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => void exportGdpr(a.id, `${a.firstName} ${a.lastName ?? ''}`.trim())}
                      title="Droit d'accès / portabilité (RGPD, art. 15 et 20)"
                    >
                      Export (RGPD)
                    </button>
                    <button
                      type="button"
                      className="link-btn link-danger"
                      onClick={() => erase(a.id, `${a.firstName} ${a.lastName ?? ''}`.trim())}
                      title="Droit à l'effacement (RGPD, art. 17)"
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

      {/* Mobile : cartes tactiles */}
      <div className="m-card-list m-only" aria-label="Liste des accréditations">
        {filtered.length === 0 && (
          <p className="muted" style={{ margin: 'var(--space-2) 0' }}>
            Aucune accréditation ne correspond à ce filtre.
          </p>
        )}
        {filtered.map((a) => {
          const name = `${a.firstName} ${a.lastName ?? ''}`.trim();
          return (
            <article key={a.id} className="m-card">
              <header className="m-card-head">
                <div className="m-card-title">
                  <strong>{name}</strong>
                  <span className="muted">{a.email}</span>
                </div>
                <span className={`badge ${ACC_BADGE[a.accStatus]}`}>{ACC_STATUS_LABEL[a.accStatus]}</span>
              </header>
              <dl className="m-card-meta">
                <div>
                  <dt>Média</dt>
                  <dd>{a.media ?? '—'}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{a.accreditationType ? ACC_TYPE_LABEL[a.accreditationType] : '—'}</dd>
                </div>
                <div>
                  <dt>Langue</dt>
                  <dd>{a.lang.toUpperCase()}</dd>
                </div>
              </dl>
              <footer className="m-card-actions">
                {a.accStatus === 'pas_encore_traite' ? (
                  <>
                    <button type="button" className="btn btn-primary" onClick={() => process(a.id, 'accept')}>
                      Accepter
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => process(a.id, 'reject')}>
                      Refuser
                    </button>
                  </>
                ) : a.accStatus === 'acceptee' ? (
                  <>
                    <button type="button" className="btn btn-ghost" onClick={() => resendAccess(a.id)}>
                      Renvoyer le lien
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={() => void showBadge(a.id)}>
                      <QrCode size={16} /> Badge
                    </button>
                  </>
                ) : null}
                <div className="m-card-more">
                  <button type="button" className="link-btn" onClick={() => void exportGdpr(a.id, name)}>
                    Export RGPD
                  </button>
                  <button type="button" className="link-btn link-danger" onClick={() => erase(a.id, name)}>
                    Supprimer
                  </button>
                </div>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
