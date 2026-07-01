import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { BadgeCheck, Download } from 'lucide-react';
import { useAuthedApi } from '../auth/AuthContext';
import { useFetch } from '../lib/useFetch';
import type { Accreditation, AccStatus, EventSummary } from '../lib/types';
import { ACC_STATUS_LABEL } from '../lib/labels';
import { printTable } from '../lib/printRequests';
import { CopyLink } from '../components/CopyLink';
import { InfoBubble } from '../components/InfoBubble';
import { EmptyState } from '../components/EmptyState';
import { SkeletonRows } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { fireConfetti } from '../lib/confetti';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const ACC_BADGE: Record<Accreditation['accStatus'], string> = {
  pas_encore_traite: 'border-transparent bg-amber-100 text-amber-800',
  acceptee: 'border-transparent bg-emerald-100 text-emerald-800',
  refusee: 'border-transparent bg-red-100 text-red-800',
};

type AccType = NonNullable<Accreditation['accreditationType']>;
const ACC_TYPE_LABEL: Record<AccType, string> = {
  presse: 'Journaliste',
  photo: 'Photographe',
  video: 'Vidéaste',
};

const TYPE_FILTERS: { v: 'all' | AccType; l: string }[] = [
  { v: 'all', l: 'Tous' },
  { v: 'presse', l: 'Journalistes' },
  { v: 'photo', l: 'Photographes' },
  { v: 'video', l: 'Vidéastes' },
];
const STATUS_FILTERS: { v: 'all' | AccStatus; l: string }[] = [
  { v: 'all', l: 'Tous statuts' },
  { v: 'acceptee', l: 'Acceptés' },
  { v: 'pas_encore_traite', l: 'En attente' },
  { v: 'refusee', l: 'Refusés' },
];

export function AccreditationsTab() {
  const { eventId = '' } = useParams();
  const apiAuthed = useAuthedApi();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<Accreditation[]>(
    () => apiAuthed.get<Accreditation[]>(`/admin/events/${eventId}/accreditations`),
    [eventId],
  );
  const ev = useFetch<EventSummary>(() => apiAuthed.get<EventSummary>(`/admin/events/${eventId}`), [eventId]);
  const [typeF, setTypeF] = useState<'all' | AccType>('all');
  const [statusF, setStatusF] = useState<'all' | AccStatus>('all');

  async function process(journalistId: string, action: 'accept' | 'reject') {
    if (
      action === 'reject' &&
      !(await confirm({
        message: 'Refuser cette accréditation ? Le journaliste en sera informé.',
        confirmLabel: 'Refuser',
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await apiAuthed.post(`/admin/events/${eventId}/accreditations/${journalistId}/process`, { action });
      if (action === 'accept') {
        toast.success('Accréditation acceptée — lien personnel envoyé par email.');
        // Micro-victoire : on célèbre la toute première accréditation acceptée.
        try {
          if (!localStorage.getItem('pr360.firstAccredited')) {
            localStorage.setItem('pr360.firstAccredited', '1');
            fireConfetti();
          }
        } catch {
          /* localStorage indisponible : pas de confettis, sans gravité. */
        }
      } else {
        toast.success('Accréditation refusée.');
      }
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible, réessayez.');
    }
  }

  // Effacement RGPD (art. 17) : suppression définitive du journaliste et de ses demandes.
  async function erase(journalistId: string, name: string) {
    if (
      !(await confirm({
        title: 'Effacement RGPD',
        message: `Supprimer définitivement « ${name} » et toutes ses demandes ? Action irréversible (droit à l'effacement, RGPD).`,
        confirmLabel: 'Supprimer définitivement',
        danger: true,
      }))
    ) {
      return;
    }
    try {
      await apiAuthed.delete(`/admin/events/${eventId}/accreditations/${journalistId}`);
      toast.success('Données du journaliste effacées (RGPD).');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible, réessayez.');
    }
  }

  if (loading) return <SkeletonRows count={4} />;
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );

  if (data?.length === 0) {
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Aucune accréditation pour l'instant"
        hint="Partagez le lien d'inscription (en haut de la page) sur vos réseaux et votre site presse pour recevoir les premières demandes des journalistes."
      />
    );
  }

  const filtered = (data ?? []).filter(
    (a) =>
      (typeF === 'all' || a.accreditationType === typeF) &&
      (statusF === 'all' || a.accStatus === statusF),
  );

  function exportPdf() {
    const rows = filtered.map((a) => [
      `${a.firstName} ${a.lastName ?? ''}`.trim(),
      a.email,
      a.media ?? '—',
      a.accreditationType ? ACC_TYPE_LABEL[a.accreditationType] : '—',
      a.lang.toUpperCase(),
      ACC_STATUS_LABEL[a.accStatus],
    ]);
    const typeLabel = TYPE_FILTERS.find((t) => t.v === typeF)?.l ?? 'Tous';
    printTable({
      eventName: ev.data?.name ?? 'Événement',
      branding: ev.data?.branding ?? null,
      heading: 'Liste des accréditations',
      generatedAt: new Date().toLocaleString('fr-FR'),
      columns: ['Nom', 'Email', 'Média', 'Type', 'Langue', 'Statut'],
      groups: [
        {
          title: typeF === 'all' ? 'Toutes les accréditations' : typeLabel,
          meta: `${rows.length} accrédité${rows.length > 1 ? 's' : ''}`,
          rows,
        },
      ],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_FILTERS.map((o) => (
          <Button
            key={o.v}
            variant={typeF === o.v ? 'default' : 'outline'}
            size="sm"
            aria-pressed={typeF === o.v}
            onClick={() => setTypeF(o.v)}
          >
            {o.l}
          </Button>
        ))}
        <Separator orientation="vertical" className="mx-1 h-6" />
        {STATUS_FILTERS.map((o) => (
          <Button
            key={o.v}
            variant={statusF === o.v ? 'default' : 'outline'}
            size="sm"
            aria-pressed={statusF === o.v}
            onClick={() => setStatusF(o.v)}
          >
            {o.l}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={exportPdf}
          disabled={filtered.length === 0}
        >
          <Download size={15} /> Exporter en PDF
        </Button>
      </div>

      <Card className="overflow-x-auto p-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Demandeur</TableHead>
              <TableHead>Média</TableHead>
              <TableHead>Langue</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <strong>
                    {a.firstName} {a.lastName ?? ''}
                  </strong>
                  <br />
                  <span className="text-xs text-muted-foreground">{a.email}</span>
                </TableCell>
                <TableCell>
                  {a.media ?? <span className="text-muted-foreground" aria-label="Non précisé">—</span>}
                </TableCell>
                <TableCell>{a.lang.toUpperCase()}</TableCell>
                <TableCell>
                  {a.accreditationType ? (
                    ACC_TYPE_LABEL[a.accreditationType]
                  ) : (
                    <span className="text-muted-foreground" aria-label="Non précisé">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={ACC_BADGE[a.accStatus]}>{ACC_STATUS_LABEL[a.accStatus]}</Badge>
                </TableCell>
                <TableCell>
                  {a.accStatus === 'pas_encore_traite' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => process(a.id, 'accept')}>
                        Accepter
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => process(a.id, 'reject')}>
                        Refuser
                      </Button>
                    </div>
                  ) : a.accStatus === 'acceptee' && a.token ? (
                    <div style={{ minWidth: 280 }}>
                      <CopyLink url={`${window.location.origin}/espace/${a.token}`} compact />
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        Lien personnel (déjà envoyé par email)
                        <InfoBubble title="Le lien personnel">
                          Adresse <strong>unique et secrète</strong> de l'espace de ce journaliste, envoyée
                          automatiquement par email à l'acceptation. C'est par là qu'il soumet ses demandes et
                          suit son planning. S'il dit ne pas l'avoir reçue, copiez-la ici et renvoyez-la-lui.
                        </InfoBubble>
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  <div className="mt-2 inline-flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => erase(a.id, `${a.firstName} ${a.lastName ?? ''}`.trim())}
                      title="Droit à l'effacement (RGPD, art. 17)"
                      className="h-auto p-0 text-xs font-semibold text-destructive"
                    >
                      Supprimer (RGPD)
                    </Button>
                    <InfoBubble title="Supprimer (droit à l'effacement)">
                      Efface <strong>définitivement</strong> ce journaliste et toutes ses demandes. Action
                      <strong> irréversible</strong> (pas de corbeille). C'est le « droit à l'effacement »
                      prévu par le RGPD (art. 17), à utiliser si la personne le demande.
                    </InfoBubble>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune accréditation ne correspond à ce filtre.
          </p>
        )}
      </Card>
    </div>
  );
}
