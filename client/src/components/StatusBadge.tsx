import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '../i18n';
import type { RequestStatus } from '../lib/types';

// Teinte sémantique par statut (jamais l'enum technique côté journaliste).
const TONE: Record<RequestStatus, string> = {
  pas_encore_traite: 'bg-amber-100 text-amber-800',
  en_cours: 'bg-blue-100 text-blue-800',
  transmise_prod: 'bg-blue-100 text-blue-800',
  attente_artiste: 'bg-blue-100 text-blue-800',
  acceptee: 'bg-emerald-100 text-emerald-800',
  refusee: 'bg-red-100 text-red-800',
  liste_attente: 'bg-violet-100 text-violet-800',
};

/** Pastille de statut, libellée par ce que le journaliste voit. */
export function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant="secondary" className={cn('border-transparent', TONE[status])}>
      {t(`status.${status}`)}
    </Badge>
  );
}
