import { useI18n } from '../i18n';
import type { RequestStatus } from '../lib/types';

const VARIANT: Record<RequestStatus, string> = {
  pas_encore_traite: 'badge-pending',
  en_cours: 'badge-progress',
  transmise_prod: 'badge-progress',
  attente_artiste: 'badge-progress',
  acceptee: 'badge-success',
  refusee: 'badge-danger',
  liste_attente: 'badge-waitlist',
};

/** Pastille de statut, libellée par ce que le journaliste voit (jamais l'enum technique). */
export function StatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useI18n();
  return <span className={`badge ${VARIANT[status]}`}>{t(`status.${status}`)}</span>;
}
