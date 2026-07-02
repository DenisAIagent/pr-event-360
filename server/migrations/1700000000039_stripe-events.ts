import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Idempotence des webhooks Stripe : Stripe peut livrer le même événement plusieurs
 * fois (retries). On enregistre l'id d'événement traité ; un second passage est
 * ignoré. Évite une double matérialisation (org/compte en double).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE stripe_events (
      id text PRIMARY KEY,
      type text NOT NULL,
      processed_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS stripe_events;');
}
