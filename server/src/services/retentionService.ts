import { pool } from '../db/pool';

/**
 * Application de la limitation de conservation (RGPD art. 5.1.e).
 * Supprime les journalistes (et, par cascade, leurs demandes/notifications) 12 mois après
 * la fin de l'événement. Référence de fin : date de fin de l'événement, à défaut la clôture
 * des accréditations, à défaut la date de création de la fiche (aucune donnée ne vit indéfiniment).
 * La durée est alignée sur la politique de confidentialité et le registre art. 30.
 */
const RETENTION = "12 months";

export async function purgeExpiredJournalists(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM journalists j
     USING events e
     WHERE e.id = j.event_id
       AND COALESCE(e.end_date::timestamptz, e.accreditation_deadline, j.created_at)
           < now() - interval '${RETENTION}'`,
  );
  return rowCount ?? 0;
}
