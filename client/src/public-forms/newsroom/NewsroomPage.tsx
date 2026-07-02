import { useEffect, useState } from 'react';
import { useEventId, pressReleasePath } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import { brandingStyle } from '../../lib/branding';
import { Countdown } from '../../components/Countdown';
import { Icon } from '../../components/Icon';
import type { NewsroomAsset, NewsroomAssetKind, NewsroomData } from '../../lib/types';
import { usePageTitle } from '../../lib/usePageTitle';
import { youtubeEmbedUrl, youtubeVideoId } from '../../lib/youtube';

/** Extrait texte (≈ 160 car.) depuis le HTML d'un CP, pour la carte de la liste. */
function htmlExcerpt(html: string): string {
  const el = document.createElement('div');
  el.innerHTML = html;
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

const GROUPS: { kind: NewsroomAssetKind; label: string }[] = [
  { kind: 'press_kit', label: 'Dossier de presse' },
  { kind: 'photo', label: 'Photos' },
  { kind: 'video', label: 'Vidéos' },
  { kind: 'logo', label: 'Logos' },
  { kind: 'other', label: 'Autres ressources' },
];

export function NewsroomPage() {
  const eventId = useEventId();
  const [data, setData] = useState<NewsroomData | null>(null);
  usePageTitle(data ? `Espace presse — ${data.event.name}` : null);
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
              {data.pressReleases.map((pr) => {
                const href = pressReleasePath(eventId, pr.slug);
                const excerpt = pr.seoDescription ?? htmlExcerpt(pr.bodyHtml);
                return (
                  <article key={pr.id} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    {pr.coverImageUrl && (
                      <a href={href} style={{ flexShrink: 0 }}>
                        <img
                          src={pr.coverImageUrl}
                          alt=""
                          style={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 8 }}
                        />
                      </a>
                    )}
                    <div>
                      <h3 style={{ fontSize: 'var(--text-lg)', margin: 0 }}>
                        <a href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{pr.title}</a>
                      </h3>
                      {pr.publishedAt && (
                        <p className="muted" style={{ fontSize: 'var(--text-sm)', margin: '2px 0' }}>
                          {new Date(pr.publishedAt).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                      {excerpt && <p style={{ margin: '6px 0' }}>{excerpt}</p>}
                      <a href={href} className="btn btn-ghost btn-sm">Lire le communiqué →</a>
                    </div>
                  </article>
                );
              })}
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
                  // Vidéos : tuiles plus larges pour un lecteur intégré confortable.
                  style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${kind === 'video' ? 320 : 200}px, 1fr))` }}
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
  // Vidéo YouTube ajoutée par lien : lecteur intégré (variante sans cookies)
  // plutôt qu'un bouton de téléchargement qui n'aurait pas de sens.
  const ytId = youtubeVideoId(asset.url);
  if (ytId) {
    return (
      <div className="card stack" style={{ padding: 'var(--space-2)' }}>
        <iframe
          src={youtubeEmbedUrl(ytId)}
          title={asset.title}
          loading="lazy"
          allowFullScreen
          // Le player YouTube exige un Referer (erreur 153) malgré le no-referrer
          // global de l'app : n'envoie que l'origine (jamais le chemin).
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 6 }}
        />
        <strong style={{ fontSize: 'var(--text-sm)' }}>{asset.title}</strong>
        <a href={asset.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
          Voir sur YouTube
        </a>
      </div>
    );
  }
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
