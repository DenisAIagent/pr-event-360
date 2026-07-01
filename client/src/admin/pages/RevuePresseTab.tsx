import { useParams } from 'react-router-dom';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { Newspaper } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';
import { MEDIA_CATEGORIES, MEDIA_CATEGORY_LABEL, type PressCoverageItem } from '../../lib/mediaCategories';

interface CoverageTracking {
  journalistId: string;
  name: string;
  email: string | null;
  media: string | null;
  accreditationType: string | null;
  count: number;
  lastAt: string | null;
}
interface CoverageResponse {
  items: PressCoverageItem[];
  tracking: CoverageTracking[];
}

const TYPE_LABEL: Record<string, string> = { presse: 'Presse', photo: 'Photo', video: 'Vidéo' };

export function RevuePresseTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<CoverageResponse>(
    () => apiAuthed.get<CoverageResponse>(`/admin/events/${eventId}/coverage`),
    [eventId],
  );

  const nameOf = new Map((data?.tracking ?? []).map((t) => [t.journalistId, t.name]));

  async function remind(journalistId?: string) {
    const r = await apiAuthed.post<{ sent: number }>(`/admin/events/${eventId}/coverage/remind`, {
      journalistId: journalistId ?? null,
    });
    toast.success(`Relance envoyée à ${r.sent} journaliste(s).`);
  }

  async function removeItem(id: string) {
    if (!(await confirm({ message: 'Retirer cette retombée de la revue de presse ?', confirmLabel: 'Retirer', danger: true }))) return;
    await apiAuthed.delete(`/admin/events/${eventId}/coverage/${id}`);
    toast.success('Retombée retirée.');
    reload();
  }

  if (loading) return <p className="muted">Chargement…</p>;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return null;

  const pending = data.tracking.filter((t) => t.count === 0);

  return (
    <div className="stack">
      {/* ── Revue de presse (par catégorie) ── */}
      <div className="section-head">
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Revue de presse</h2>
        <span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{data.items.length} retombée(s)</span>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Aucune retombée pour l'instant"
          hint="Les journalistes reçoivent automatiquement un email 3 jours après la fin de l'événement pour déposer leurs publications et photos. Vous pouvez aussi les relancer ci-dessous."
        />
      ) : (
        <div className="stack">
          {MEDIA_CATEGORIES.map((cat) => {
            const items = data.items.filter((i) => i.mediaCategory === cat.value);
            if (items.length === 0) return null;
            return (
              <div key={cat.value} className="card stack">
                <h3 style={{ fontSize: 'var(--text-md)', margin: 0 }}>{cat.label} <span className="muted">({items.length})</span></h3>
                <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                  {items.map((i) => (
                    <div key={i.id} className="card stack" style={{ padding: 'var(--space-2)' }}>
                      {i.isUpload && i.thumbnailUrl && (
                        <img src={i.thumbnailUrl} alt="" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6 }} />
                      )}
                      <a href={i.url} target="_blank" rel="noreferrer" style={{ fontSize: 'var(--text-sm)', wordBreak: 'break-all' }}>
                        {i.title || i.url}
                      </a>
                      <span className="muted" style={{ fontSize: 'var(--text-xs)' }}>
                        {nameOf.get(i.journalistId ?? '') ?? 'Journaliste'}
                        {i.isUpload && (
                          <> · {i.archiveConsent && i.promoConsent ? '✓ archivage + promo autorisés' : 'autorisation partielle'}</>
                        )}
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => removeItem(i.id)}>Retirer</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Suivi des envois ── */}
      <div className="section-head" style={{ marginTop: 'var(--space-4)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)' }}>Suivi des envois</h2>
        {pending.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => remind()}>
            Relancer les {pending.length} en attente
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 'var(--space-3)', overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr><th>Journaliste</th><th>Média</th><th>Type</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.tracking.map((t) => (
              <tr key={t.journalistId}>
                <td><strong>{t.name}</strong><br /><span className="muted" style={{ fontSize: 'var(--text-xs)' }}>{t.email}</span></td>
                <td>{t.media ?? <span className="muted">—</span>}</td>
                <td>{t.accreditationType ? TYPE_LABEL[t.accreditationType] ?? t.accreditationType : '—'}</td>
                <td>
                  {t.count > 0 ? (
                    <span className="badge badge-success">
                      ✓ {t.count} retombée{t.count > 1 ? 's' : ''}
                      {t.lastAt && ` · ${new Date(t.lastAt).toLocaleDateString('fr-FR')}`}
                    </span>
                  ) : (
                    <span className="badge badge-warn">En attente</span>
                  )}
                </td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => remind(t.journalistId)}>Relancer</button>
                </td>
              </tr>
            ))}
            {data.tracking.length === 0 && (
              <tr><td colSpan={5} className="muted">Aucun journaliste accrédité accepté.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
