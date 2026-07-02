import { pool } from '../pool';
import type { Queryable } from '../types';

/**
 * Marque un événement Stripe comme traité (idempotence). Renvoie true si c'est la
 * PREMIÈRE fois (à traiter), false s'il l'avait déjà été (retry Stripe → ignorer).
 * L'INSERT ... ON CONFLICT DO NOTHING est atomique : pas de course entre deux livraisons.
 */
export async function markStripeEventProcessed(
  eventId: string,
  type: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    'INSERT INTO stripe_events (id, type) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
    [eventId, type],
  );
  return rowCount === 1;
}

/**
 * Retire le marqueur si le traitement a échoué : Stripe rejouera l'événement et
 * il sera repris (sinon un échec transitoire ferait perdre l'événement à jamais).
 */
export async function unmarkStripeEvent(eventId: string, db: Queryable = pool): Promise<void> {
  await db.query('DELETE FROM stripe_events WHERE id = $1', [eventId]);
}
