import { useState } from 'react';
import { useI18n } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import type { EventBranding } from '../../lib/types';

export interface ProductionRequestItem {
  id: string;
  type: 'interview' | 'photo_report' | 'video_report';
  status: string;
  createdAt: string;
  message: string | null;
  journalistName: string;
  media: string | null;
  artistId: string;
  artistName: string | null;
  slot: string | null;
  review: { verdict: 'favorable' | 'defavorable'; comment: string | null; at: string } | null;
}

/** Charge utile de l'espace : le serveur la renvoie aussi après chaque avis. */
export interface ProductionSpacePayload {
  contact: { name: string };
  event: { name: string; branding: EventBranding };
  artists: { id: string; name: string | null }[];
  requests: ProductionRequestItem[];
}

const TYPE_KEY: Record<ProductionRequestItem['type'], string> = {
  interview: 'space.type.interview',
  photo_report: 'space.type.photo_report',
  video_report: 'space.type.video_report',
};

/**
 * Une demande et son avis. L'avis déjà donné est affiché comme état acquis :
 * le contact voit ce qu'il a répondu, et peut le corriger — l'enregistrement
 * côté serveur est un upsert, pas un empilement.
 */
export function RequestReviewCard({
  item,
  onSaved,
}: {
  item: ProductionRequestItem;
  onSaved: (payload: ProductionSpacePayload) => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(!item.review);
  const [verdict, setVerdict] = useState<'favorable' | 'defavorable' | null>(item.review?.verdict ?? null);
  const [comment, setComment] = useState(item.review?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!verdict) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await api.post<ProductionSpacePayload>(
        `/public/production/requests/${item.id}/review`,
        { verdict, comment: comment.trim() || null },
      );
      onSaved(payload);
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card stack">
      <div>
        <strong>{item.journalistName}</strong>
        {item.media && <span className="muted"> · {item.media}</span>}
        <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>
          {t(TYPE_KEY[item.type])}
          {' · '}
          {item.slot ? `${t('prod.requestedSlot')} : ${item.slot}` : t('prod.noSlot')}
        </div>
      </div>

      {item.message && (
        <div>
          <div className="muted" style={{ fontSize: 'var(--text-sm)' }}>{t('prod.message')}</div>
          <p style={{ margin: 0 }}>{item.message}</p>
        </div>
      )}

      {error && <div className="banner banner-error">{error}</div>}

      {!editing && item.review ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span className={`badge ${item.review.verdict === 'favorable' ? 'badge-success' : 'badge-danger'}`}>
            {t(item.review.verdict === 'favorable' ? 'prod.favorable' : 'prod.defavorable')}
          </span>
          {item.review.comment && <span className="muted">« {item.review.comment} »</span>}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            {t('prod.change')}
          </button>
        </div>
      ) : (
        <div className="stack">
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`btn ${verdict === 'favorable' ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={verdict === 'favorable'}
              onClick={() => setVerdict('favorable')}
            >
              {t('prod.favorable')}
            </button>
            <button
              type="button"
              className={`btn ${verdict === 'defavorable' ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={verdict === 'defavorable'}
              onClick={() => setVerdict('defavorable')}
            >
              {t('prod.defavorable')}
            </button>
          </div>
          <div className="field">
            <label htmlFor={`c-${item.id}`}>{t('prod.comment')}</label>
            <textarea
              id={`c-${item.id}`}
              rows={2}
              maxLength={2000}
              value={comment}
              placeholder={t('prod.commentPlaceholder')}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" disabled={!verdict || busy} onClick={save}>
            {busy ? t('common.loading') : t('prod.save')}
          </button>
        </div>
      )}
    </article>
  );
}
