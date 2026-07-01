import { useEffect, useState } from 'react';
import { useEventId, pressReleasePath } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import { brandingStyle } from '../../lib/branding';
import { Countdown } from '../../components/Countdown';
import { Icon } from '../../components/Icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { NewsroomAsset, NewsroomAssetKind, NewsroomData } from '../../lib/types';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<NewsroomData>(`/public/newsroom/${eventId}`)
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Newsroom indisponible'));
  }, [eventId]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center p-4 text-sm text-muted-foreground">Chargement…</main>
    );
  }

  const branding = data.event.branding ?? undefined;

  return (
    <div style={brandingStyle(branding)}>
      <main className="mx-auto max-w-4xl p-4 md:p-8">
        <header className="mb-8">
          {branding?.logoUrl && (
            <img src={branding.logoUrl} alt={data.event.name} className="mb-4 max-h-16" />
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Espace presse
          </span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{data.event.name}</h1>
          {data.event.location && <p className="mt-1 text-muted-foreground">{data.event.location}</p>}
        </header>

        {data.event.deadline && !data.event.registrationClosed && (
          <Card className="mb-8">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-md bg-muted text-foreground" aria-hidden="true">
                  <Icon name="clock" />
                </span>
                <div>
                  <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Clôture des accréditations presse
                  </span>
                  <strong className="text-base">
                    {new Date(data.event.deadline).toLocaleString('fr-FR', {
                      dateStyle: 'long',
                      timeStyle: 'short',
                    })}
                  </strong>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Countdown deadline={data.event.deadline} />
                <Button asChild size="sm">
                  <a href={`/accreditation/${data.event.id}`}>S’accréditer</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {data.pressReleases.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold">Communiqués de presse</h2>
            <div className="space-y-4">
              {data.pressReleases.map((pr) => {
                const href = pressReleasePath(eventId, pr.slug);
                const excerpt = pr.seoDescription ?? htmlExcerpt(pr.bodyHtml);
                return (
                  <Card key={pr.id} className="overflow-hidden">
                    <CardContent className="flex gap-4">
                      {pr.coverImageUrl && (
                        <a href={href} className="shrink-0">
                          <img
                            src={pr.coverImageUrl}
                            alt=""
                            className="h-[90px] w-[140px] rounded-md object-cover"
                          />
                        </a>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold">
                          <a href={href} className="hover:underline">{pr.title}</a>
                        </h3>
                        {pr.publishedAt && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {new Date(pr.publishedAt).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                        {excerpt && (
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
                        )}
                        <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0">
                          <a href={href}>Lire le communiqué →</a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Ressources & médias</h2>
          {data.assets.length === 0 && (
            <p className="text-muted-foreground">Aucune ressource disponible pour l’instant.</p>
          )}
          {GROUPS.map(({ kind, label }) => {
            const items = data.assets.filter((a) => a.kind === kind);
            if (items.length === 0) return null;
            return (
              <div key={kind} className="mt-6">
                <h3 className="mb-3 text-lg font-semibold">{label}</h3>
                <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
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
    <Card className="overflow-hidden">
      <CardContent className="space-y-2 p-3">
        {asset.thumbnailUrl && (
          <img
            src={asset.thumbnailUrl}
            alt={asset.title}
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
        )}
        <strong className="block text-sm">{asset.title}</strong>
        <Button asChild size="sm" className="w-full">
          <a href={asset.url} target="_blank" rel="noreferrer" download>
            Télécharger
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
