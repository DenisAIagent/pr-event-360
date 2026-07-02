import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

/**
 * Espace journaliste : remplace le token PERMANENT stocké EN CLAIR par un jeton
 * d'accès HACHÉ et EXPIRABLE (une fuite DB/backup ne donne plus d'accès utilisable,
 * le hash étant non réversible en URL). L'accès courant passe désormais par une
 * SESSION (cookie httpOnly), le jeton d'accès ne servant qu'à l'établir.
 *
 * Transition : on rehashe les tokens existants (encode(digest(...))) avec une
 * expiration à +90 j, pour que les liens déjà envoyés continuent de fonctionner le
 * temps de la bascule, puis on supprime la colonne en clair.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    ALTER TABLE journalists
      ADD COLUMN access_token_hash text,
      ADD COLUMN access_token_expires_at timestamptz;
  `);
  // Rehash des tokens existants (pgcrypto) + expiration de transition.
  pgm.sql(`
    UPDATE journalists
       SET access_token_hash = encode(digest(token, 'sha256'), 'hex'),
           access_token_expires_at = now() + interval '90 days'
     WHERE token IS NOT NULL;
  `);
  pgm.sql('CREATE INDEX idx_journalists_access_hash ON journalists(access_token_hash);');
  pgm.sql('ALTER TABLE journalists DROP COLUMN token;');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Irréversible en pratique (les tokens en clair sont perdus) : on recrée la
  // colonne vide pour permettre un rollback structurel.
  pgm.sql('ALTER TABLE journalists ADD COLUMN token text UNIQUE;');
  pgm.sql('DROP INDEX IF EXISTS idx_journalists_access_hash;');
  pgm.sql('ALTER TABLE journalists DROP COLUMN access_token_hash, DROP COLUMN access_token_expires_at;');
}
