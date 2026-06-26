import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { Accreditation } from '../lib/types';
import { ACC_STATUS_LABEL } from '../lib/labels';
import { CopyLink } from '../components/CopyLink';

const ACC_BADGE: Record<Accreditation['accStatus'], string> = {
  pas_encore_traite: 'badge-pending',
  acceptee: 'badge-success',
  refusee: 'badge-danger',
};

export function AccreditationsTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<Accreditation[]>(
    () => apiAuthed.get<Accreditation[]>(`/admin/events/${eventId}/accreditations`),
    [eventId],
  );

  async function process(journalistId: string, action: 'accept' | 'reject') {
    await apiAuthed.post(`/admin/events/${eventId}/accreditations/${journalistId}/process`, { action });
    reload();
  }

  if (loading) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;

  return (
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
          {data?.map((a) => (
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
              <td>{a.media ?? '—'}</td>
              <td>{a.lang.toUpperCase()}</td>
              <td>{a.accreditationType ?? '—'}</td>
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
                ) : a.accStatus === 'acceptee' && a.token ? (
                  <div style={{ minWidth: 280 }}>
                    <CopyLink url={`${window.location.origin}/espace/${a.token}`} compact />
                    <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                      Lien personnel (déjà envoyé par email)
                    </span>
                  </div>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
            </tr>
          ))}
          {data?.length === 0 && (
            <tr>
              <td colSpan={6} className="muted">
                Aucune accréditation pour l'instant.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
