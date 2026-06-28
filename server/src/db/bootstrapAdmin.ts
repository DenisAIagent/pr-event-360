/**
 * Amorce le premier compte ADMIN à partir de variables d'environnement.
 * Conçu pour le déploiement (Railway) : lit process.env, sans dotenv, et est
 * IDEMPOTENT — sûr à lancer à chaque démarrage.
 *
 *   ADMIN_EMAIL=...  ADMIN_PASSWORD=...  [ADMIN_NAME=...]
 *
 * - variables absentes        → ignoré (aucune erreur)
 * - compte inexistant         → créé en tant qu'admin
 * - compte existant non-admin → promu admin
 * - admin déjà présent        → rien à faire
 *
 * Aucun identifiant n'est jamais codé en dur.
 */
import { registerUser } from '../services/authService';
import { findUserByEmail, updateUserRole } from './repositories/userRepo';
import { createOrganization, findOrganizationBySlug } from './repositories/organizationRepo';
import { pool } from './pool';

/** Le compte bootstrap est l'OPÉRATEUR : admin de l'organisation par défaut + super-admin plateforme. */
async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || 'Administrateur';

  if (!email || !password) {
    console.log('Bootstrap admin ignoré : ADMIN_EMAIL/ADMIN_PASSWORD non définis.');
    return;
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.role !== 'admin') await updateUserRole(existing.id, 'admin');
    if (!existing.isPlatformAdmin) {
      await pool.query('UPDATE users SET is_platform_admin = true WHERE id = $1', [existing.id]);
    }
    console.log(`Compte « ${email} » garanti admin + super-admin plateforme.`);
    return;
  }

  const org =
    (await findOrganizationBySlug('mdmc')) ?? (await createOrganization({ name: 'MDMC', slug: 'mdmc' }));
  const user = await registerUser({
    email,
    password,
    fullName,
    role: 'admin',
    organizationId: org.id,
    isPlatformAdmin: true,
  });
  console.log(`Admin créé : ${user.email} (${user.id}) dans l'organisation ${org.slug}.`);
}

main()
  .catch((err) => {
    console.error('Bootstrap admin échoué :', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
