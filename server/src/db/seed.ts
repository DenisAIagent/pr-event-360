/**
 * Crée le premier compte back-office (attaché de presse). À lancer une fois :
 *   SEED_EMAIL=... SEED_PASSWORD=... SEED_NAME=... npm run seed
 * Les identifiants passent par l'environnement, jamais en dur.
 */
import { registerUser } from '../services/authService';
import { countUsers } from '../db/repositories/userRepo';
import { createOrganization, findOrganizationBySlug } from '../db/repositories/organizationRepo';
import { pool } from '../db/pool';

async function main(): Promise<void> {
  const email = process.env.SEED_EMAIL;
  const password = process.env.SEED_PASSWORD;
  const fullName = process.env.SEED_NAME ?? 'Attaché de presse';

  if (!email || !password) {
    throw new Error('SEED_EMAIL et SEED_PASSWORD sont requis');
  }

  const existing = await countUsers();
  if (existing > 0) {
    console.log(`Des comptes existent déjà (${existing}) — seed ignoré.`);
    return;
  }

  const org =
    (await findOrganizationBySlug('mdmc')) ?? (await createOrganization({ name: 'MDMC', slug: 'mdmc' }));
  const user = await registerUser({ email, password, fullName, role: 'attache', organizationId: org.id });
  console.log(`Compte créé : ${user.email} (${user.id}) dans ${org.slug}`);
}

main()
  .catch((err) => {
    console.error('Seed échoué :', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
