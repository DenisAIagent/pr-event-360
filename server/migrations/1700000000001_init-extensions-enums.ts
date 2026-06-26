import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // pgcrypto fournit gen_random_uuid() pour des clés non devinables.
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  pgm.sql(`CREATE TYPE lang_code AS ENUM ('fr','en','pt','es');`);
  pgm.sql(`CREATE TYPE accreditation_type AS ENUM ('presse','photo','video');`);
  pgm.sql(`CREATE TYPE accreditation_status AS ENUM ('pas_encore_traite','acceptee','refusee');`);
  pgm.sql(`CREATE TYPE request_type AS ENUM ('interview','photo_report','video_report');`);
  pgm.sql(`CREATE TYPE request_status AS ENUM (
    'pas_encore_traite','en_cours','transmise_prod',
    'attente_artiste','acceptee','refusee','liste_attente');`);
  pgm.sql(`CREATE TYPE user_role AS ENUM ('attache','assistant');`);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP TYPE IF EXISTS user_role;');
  pgm.sql('DROP TYPE IF EXISTS request_status;');
  pgm.sql('DROP TYPE IF EXISTS request_type;');
  pgm.sql('DROP TYPE IF EXISTS accreditation_status;');
  pgm.sql('DROP TYPE IF EXISTS accreditation_type;');
  pgm.sql('DROP TYPE IF EXISTS lang_code;');
  // L'extension pgcrypto peut être partagée ; on la laisse en place.
}
