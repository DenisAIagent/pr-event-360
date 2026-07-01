import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAuth, useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import { PageHero } from '../components/PageHero';
import { SkeletonCards } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
// shell fourni par AdminShell — la page ne rend que son contenu
import type { EventSummary } from '../lib/types';

export function EventsListPage() {
  const { user } = useAuth();
  const apiAuthed = useAuthedApi();
  const { data, loading, error, reload } = useFetch<EventSummary[]>(
    () => apiAuthed.get<EventSummary[]>('/admin/events'),
    [],
  );

  const canCreate = user?.role === 'admin' || user?.role === 'attache';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Tableau de bord"
        title="Vos événements"
        subtitle={
          data ? `${data.length} événement${data.length > 1 ? 's' : ''} · relations presse à 360°` : '…'
        }
        action={
          canCreate && (
            <Button asChild>
              <Link to="/admin/events/new">Nouvel événement</Link>
            </Button>
          )
        }
      />

      {loading && <SkeletonCards count={6} />}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
        {data?.map((ev) => (
          <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onDeleted={reload} />
        ))}
        {data?.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground">
            Aucun événement.{' '}
            {canCreate && (
              <Link
                to="/admin/events/new"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Créez-en un →
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

function EventCard({ ev, isAdmin, onDeleted }: { ev: EventSummary; isAdmin: boolean; onDeleted: () => void }) {
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !(await confirm({
        title: 'Supprimer l’événement',
        message: `Supprimer définitivement « ${ev.name} » ? Tous les journalistes, demandes, communications, médias et réglages de cet événement seront effacés. Cette action est irréversible.`,
        confirmLabel: 'Tout supprimer',
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      await apiAuthed.delete(`/admin/events/${ev.id}`);
      toast.success(`Événement « ${ev.name} » supprimé.`);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="relative overflow-hidden transition-colors hover:border-primary/40 hover:shadow-sm">
      <Link to={`/admin/events/${ev.id}`} className="group block p-5">
        <h3 className={cn('text-base font-semibold', isAdmin && 'pr-8')}>{ev.name}</h3>
        <p className="mt-1 mb-3 text-sm text-muted-foreground">{ev.location ?? 'Lieu non précisé'}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="flex flex-wrap items-center gap-1">
            {ev.languages.map((l) => (
              <Badge key={l} variant="secondary" className="font-medium">
                {l.toUpperCase()}
              </Badge>
            ))}
          </span>
          <span className="text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5">
            Ouvrir →
          </span>
        </div>
      </Link>
      {isAdmin && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={remove}
          disabled={busy}
          title="Supprimer l'événement"
          aria-label={`Supprimer ${ev.name}`}
          className="absolute right-2 top-2 size-7 text-destructive hover:text-destructive"
        >
          <Trash2 size={15} />
        </Button>
      )}
    </Card>
  );
}
