import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Avis des utilisateurs sur l'app, saisis dans le back-office (note 1–5 + témoignage).
 * Modérés par un super-admin ; seuls les avis approuvés ET consentis s'affichent sur la landing.
 * Un avis par utilisateur (index unique partiel) ; user_id NULL réservé aux avis « éditoriaux »
 * (ex. témoignage de Yann Landry, importé avec son accord).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE app_reviews (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
      author_name text NOT NULL,
      author_role text,
      author_org text,
      rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
      quote text NOT NULL,
      consent_public boolean NOT NULL DEFAULT false,
      status text NOT NULL DEFAULT 'pending',
      created_at timestamptz NOT NULL DEFAULT now(),
      reviewed_at timestamptz
    );
    CREATE UNIQUE INDEX idx_app_reviews_user ON app_reviews(user_id) WHERE user_id IS NOT NULL;
    CREATE INDEX idx_app_reviews_status ON app_reviews(status);
  `);

  // Témoignage de Yann Landry (consentement obtenu) — premier avis approuvé visible sur la landing.
  pgm.sql(`
    INSERT INTO app_reviews (author_name, author_role, author_org, rating, quote, consent_public, status, reviewed_at)
    VALUES (
      'Yann Landry',
      'ex-attaché de presse',
      'Motocultor Festival',
      5,
      $$Si j'avais eu ça pour le Motocultor, le gain de temps et de tableaux Excel évités ! C'est un gain de temps fou.$$,
      true,
      'approved',
      now()
    );
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TABLE IF EXISTS app_reviews;');
}
