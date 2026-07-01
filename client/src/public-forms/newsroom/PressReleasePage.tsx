import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventId, newsroomPath } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import { brandingStyle } from '../../lib/branding';
import { printPressRelease } from './printPressRelease';
import type { PressReleaseDetail } from '../../lib/types';

/** Page dédiée d'un communiqué (URL propre par slug) : illustration, titre, corps, PDF. */
export function PressReleasePage() {
  const eventId = useEventId();
  const { slug = '' } = useParams();
  const [data, setData] = useState<PressReleaseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PressReleaseDetail>(`/public/newsroom/${eventId}/cp/${encodeURIComponent(slug)}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Communiqué indisponible'));
  }, [eventId, slug]);

  if (error) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="card stack" style={{ textAlign: 'center' }}>
          <p>{error}</p>
          <a href={newsroomPath(eventId)} className="btn btn-primary btn-sm">Retour à la newsroom</a>
        </div>
      </main>
    );
  }
  if (!data) {
    return <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>Chargement…</main>;
  }

  const { event, pressRelease: pr } = data;
  const branding = event.branding ?? undefined;
  const dateLabel = pr.publishedAt ? new Date(pr.publishedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : null;

  return (
    <div style={brandingStyle(branding)}>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px' }}>
        <nav style={{ marginBottom: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <a href={newsroomPath(eventId)} className="btn btn-ghost btn-sm">← {event.name} — Newsroom</a>
          <button
            className="btn btn-primary btn-sm"
            onClick={() =>
              printPressRelease({
                eventName: event.name,
                title: pr.title,
                dateLabel,
                bodyHtml: pr.bodyHtml,
                coverImageUrl: pr.coverImageUrl,
                branding: branding ? { logoUrl: branding.logoUrl, accentColor: branding.accentColor } : null,
              })
            }
          >
            Télécharger en PDF
          </button>
        </nav>

        <article>
          <span className="eyebrow">Communiqué de presse</span>
          <h1 style={{ fontSize: 'var(--text-hero, 2.2rem)', margin: '4px 0 6px', lineHeight: 1.2 }}>{pr.title}</h1>
          {dateLabel && <p className="muted" style={{ marginTop: 0 }}>{dateLabel}</p>}
          {pr.coverImageUrl && (
            <img
              src={pr.coverImageUrl}
              alt=""
              style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 10, margin: '12px 0 20px' }}
            />
          )}
          <div className="cp-body" dangerouslySetInnerHTML={{ __html: pr.bodyHtml }} />
        </article>
      </main>
    </div>
  );
}
