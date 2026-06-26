import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { brandingStyle } from '../../lib/branding';
import { Countdown } from '../../components/Countdown';
import { Icon } from '../../components/Icon';
import type { NewsroomAsset, NewsroomAssetKind, NewsroomData } from '../../lib/types';

const GROUPS: { kind: NewsroomAssetKind; label: string }[] = [
  { kind: 'press_kit', label: 'Dossier de presse' },
  { kind: 'photo', label: 'Photos' },
  { kind: 'video', label: 'Vidéos' },
  { kind: 'logo', label: 'Logos' },
  { kind: 'other', label: 'Autres ressources' },
];

export function NewsroomPage() {
  const { eventId = '' } = useParams();
  const [data, setData] = useState<NewsroomData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<NewsroomData>(`/public/newsroom/${eventId}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Newsroom indisponible'));
  }, [eventId]);

  if (error) {
    return (
      <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="card">{error}</div>
      </main>
    );
  }
  if (!data) {
    return <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>Chargement…</main>;
  }

  const branding = data.event.branding ?? undefined;

  return (
    <div style={brandingStyle(branding)}>
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px' }}>
        <header style={{ marginBottom: 'var(--space-5)' }}>
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt={data.event.name} style={{ maxHeight: 64, marginBottom: 16 }} />
          )}
          <span className="eyebrow">Espace presse</span>
          <h1 style={{ fontSize: 'var(--text-hero, 2.5rem)', margin: '4px 0' }}>{data.event.name}</h1>
          {data.event.location && <p className="muted">{data.event.location}</p>}
        </header>

        {data.event.deadline && !data.event.registrationClosed && (
          <div className="deadline-card" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="deadline-head">
              <span className="deadline-icon" aria-hidden="true"><Icon name="clock" /></span>
              <div>
                <span className="deadline-label">Clôture des accréditations presse</span>
                <strong className="deadline-date">
                  {new Date(data.event.deadline).toLocaleString('fr-FR', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </strong>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Countdown deadline={data.event.deadline} />
              <a href={`/accreditation/${data.event.id}`} className="btn btn-primary btn-sm">
                S’accréditer
              </a>
            </div>
          </div>
        )}

        {data.pressReleases.length > 0 && (
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)' }}>Communiqués de presse</h2>
            <div className="stack">
              {data.pressReleases.map((pr) => (
                <article key={pr.id} className="card">
                  <h3 style={{ fontSize: 'var(--text-lg)' }}>{pr.title}</h3>
                  {pr.publishedAt && (
                    <p className="muted" style={{ fontSize: 'var(--text-sm)' }}>
                      {new Date(pr.publishedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: pr.bodyHtml }} />
                </article>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 style={{ fontSize: 'var(--text-xl)' }}>Ressources & médias</h2>
          {data.assets.length === 0 && <p className="muted">Aucune ressource disponible pour l’instant.</p>}
          {GROUPS.map(({ kind, label }) => {
            const items = data.assets.filter((a) => a.kind === kind);
            if (items.length === 0) return null;
            return (
              <div key={kind} style={{ marginTop: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-lg)' }}>{label}</h3>
                <div
                  className="kpis"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}
                >
                  {items.map((a) => (
                    <AssetTile key={a.id} asset={a} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function AssetTile({ asset }: { asset: NewsroomAsset }) {
  return (
    <div className="card stack" style={{ padding: 'var(--space-2)' }}>
      {asset.thumbnailUrl && (
        <img
          src={asset.thumbnailUrl}
          alt={asset.title}
          style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: 6 }}
        />
      )}
      <strong style={{ fontSize: 'var(--text-sm)' }}>{asset.title}</strong>
      <a href={asset.url} target="_blank" rel="noreferrer" download className="btn btn-primary btn-sm">
        Télécharger
      </a>
    </div>
  );
}
