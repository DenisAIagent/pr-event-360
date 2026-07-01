import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useEventId, newsroomPath } from '../../lib/domainEvent';
import { api, ApiError } from '../../lib/api';
import { brandingStyle } from '../../lib/branding';
import { printPressRelease } from './printPressRelease';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      <main className="grid min-h-screen place-items-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild size="sm">
              <a href={newsroomPath(eventId)}>Retour à la newsroom</a>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center p-4 text-sm text-muted-foreground">Chargement…</main>
    );
  }

  const { event, pressRelease: pr } = data;
  const branding = event.branding ?? undefined;
  const dateLabel = pr.publishedAt ? new Date(pr.publishedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : null;

  return (
    <div style={brandingStyle(branding)}>
      <main className="mx-auto max-w-3xl p-4 md:p-8">
        <nav className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <a href={newsroomPath(eventId)}>← {event.name} — Newsroom</a>
          </Button>
          <Button
            size="sm"
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
          </Button>
        </nav>

        <article>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Communiqué de presse
          </span>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{pr.title}</h1>
          {dateLabel && <p className="mt-1.5 text-sm text-muted-foreground">{dateLabel}</p>}
          {pr.coverImageUrl && (
            <img
              src={pr.coverImageUrl}
              alt=""
              className="my-5 max-h-[420px] w-full rounded-xl object-cover"
            />
          )}
          <div className="cp-body leading-relaxed" dangerouslySetInnerHTML={{ __html: pr.bodyHtml }} />
        </article>
      </main>
    </div>
  );
}
