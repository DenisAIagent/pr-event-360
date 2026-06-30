import { Star } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import type { AppReview, ReviewStatus } from '../lib/types';

function Stars({ n }: { n: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }} aria-label={`${n}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={15} fill={i <= n ? '#f5b50a' : 'none'} color={i <= n ? '#f5b50a' : '#c3c7cd'} />
      ))}
    </span>
  );
}

const STATUS: Record<ReviewStatus, { text: string; cls: string }> = {
  pending: { text: 'En attente', cls: 'badge-warn' },
  approved: { text: 'Approuvé', cls: 'badge-success' },
  rejected: { text: 'Rejeté', cls: 'badge' },
};

export function ReviewsModerationPage() {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<AppReview[]>(
    () => apiAuthed.get<AppReview[]>('/admin/reviews'),
    [],
  );

  async function setStatus(id: string, status: ReviewStatus) {
    await apiAuthed.post(`/admin/reviews/${id}/status`, { status });
    toast.success(status === 'approved' ? 'Avis approuvé — visible sur la landing.' : 'Avis mis à jour.');
    reload();
  }

  return (
    <div className="stack">
      <div>
        <h1 style={{ fontSize: 'var(--text-xl)', margin: 0 }}>Modération des avis</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          Seuls les avis <strong>approuvés</strong> et dont l’auteur a <strong>autorisé la publication</strong>{' '}
          apparaissent sur la page d’accueil.
        </p>
      </div>

      {loading && <p className="muted">Chargement…</p>}
      {error && <div className="banner banner-error">{error}</div>}
      {data?.length === 0 && <p className="muted">Aucun avis pour l’instant.</p>}

      <div className="stack">
        {data?.map((r) => (
          <div key={r.id} className="card stack">
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <div>
                <Stars n={r.rating} />
                <div style={{ marginTop: 4 }}>
                  <strong>{r.authorName}</strong>
                  {(r.authorRole || r.authorOrg) && (
                    <span className="muted"> · {[r.authorRole, r.authorOrg].filter(Boolean).join(', ')}</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {!r.consentPublic && <span className="badge" title="L’auteur n’a pas autorisé la publication">Sans consentement</span>}
                <span className={`badge ${STATUS[r.status].cls}`}>{STATUS[r.status].text}</span>
              </div>
            </div>

            <blockquote style={{ margin: 0, fontStyle: 'italic', color: 'var(--color-ink, #1a1a2e)' }}>
              « {r.quote} »
            </blockquote>

            <div className="inline-actions" style={{ display: 'flex', gap: 8 }}>
              {r.status !== 'approved' && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setStatus(r.id, 'approved')}
                  disabled={!r.consentPublic}
                  title={r.consentPublic ? '' : 'L’auteur n’a pas autorisé la publication'}
                >
                  Approuver
                </button>
              )}
              {r.status !== 'rejected' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(r.id, 'rejected')}>
                  Rejeter
                </button>
              )}
              {r.status === 'approved' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(r.id, 'pending')}>
                  Retirer de la landing
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
