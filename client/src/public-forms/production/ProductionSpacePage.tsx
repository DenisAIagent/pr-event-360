import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n, isLang } from '../../i18n';
import { api, ApiError } from '../../lib/api';
import { brandingStyle } from '../../lib/branding';
import { usePageTitle } from '../../lib/usePageTitle';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { RequestReviewCard, type ProductionSpacePayload } from './RequestReviewCard';

/**
 * Espace de validation d'un contact production : les demandes adressées à ses
 * artistes, avec un avis consultatif par demande.
 *
 * Même cinématique que l'espace journaliste : le jeton de l'URL est échangé une
 * fois contre une session en cookie, puis l'URL est nettoyée pour que le lien
 * ne traîne ni dans l'historique ni dans un partage d'écran.
 */
export function ProductionSpacePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [data, setData] = useState<ProductionSpacePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  usePageTitle(data ? `${t('prod.title')} — ${data.event.name}` : null);

  const load = useCallback(async () => {
    const payload = await api.get<ProductionSpacePayload>('/public/production/space');
    setData(payload);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (token) {
          await api.post('/public/production/session', { token });
          navigate('/prod', { replace: true });
        }
        await load();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('prod.invalid'));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <main className="page">
        <div className="card">{error}</div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="page">
        <p className="sr-only">{t('common.loading')}</p>
        <div className="stack" aria-hidden="true">
          <span className="skeleton" style={{ height: 34, width: '55%', borderRadius: 8 }} />
          {[...Array(3)].map((_, i) => (
            <span key={i} className="skeleton" style={{ height: 96, borderRadius: 12 }} />
          ))}
        </div>
      </main>
    );
  }

  const byArtist = data.artists
    .map((a) => ({ artist: a, items: data.requests.filter((r) => r.artistId === a.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div style={brandingStyle(data.event.branding)}>
      <main className="page">
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {data.event.branding.logoUrl && (
              <img className="brand-logo" src={data.event.branding.logoUrl} alt="" />
            )}
            <span className="eyebrow">{data.event.name}</span>
          </div>
          <LanguageSwitcher available={(['fr', 'en', 'pt', 'es'] as const).filter(isLang)} />
        </header>

        <h1 style={{ fontSize: 'var(--text-display)', marginBottom: 'var(--space-2)' }}>{t('prod.title')}</h1>
        <p className="lede" style={{ marginBottom: 'var(--space-5)' }}>{t('prod.lede')}</p>

        {byArtist.length === 0 && <div className="card">{t('prod.empty')}</div>}

        {byArtist.map(({ artist, items }) => (
          <section key={artist.id} style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>
              {artist.name} <span className="muted">· {t('prod.count', { n: String(items.length) })}</span>
            </h2>
            <div className="stack">
              {items.map((item) => (
                <RequestReviewCard key={item.id} item={item} onSaved={setData} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
