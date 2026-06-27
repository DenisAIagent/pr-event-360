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
import { pool } from './pool';

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
    if (existing.role === 'admin') {
      console.log(`Admin « ${email} » déjà présent — rien à faire.`);
    } else {
      await updateUserRole(existing.id, 'admin');
      console.log(`Compte « ${email} » promu admin.`);
    }
    return;
  }

  const user = await registerUser({ email, password, fullName, role: 'admin' });
  console.log(`Admin créé : ${user.email} (${user.id}).`);
}

main()
  .catch((err) => {
    console.error('Bootstrap admin échoué :', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
