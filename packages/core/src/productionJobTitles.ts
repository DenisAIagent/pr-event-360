/**
 * Fonctions prédéfinies des contacts production / terrain artiste.
 * Utilisées pour le lien de validation des interviews : régie artiste (festival)
 * et régisseur de tournée (sur place avec l'artiste) sont prioritaires.
 */
export const PRODUCTION_JOB_TITLES = [
  'Régie artiste',
  'Régisseur de tournée',
  'Manager d’artiste',
  'Attaché de production',
  'Production',
  'Booker / agent',
  'Autre',
] as const;

export type ProductionJobTitle = (typeof PRODUCTION_JOB_TITLES)[number];

export function isProductionJobTitle(value: string): value is ProductionJobTitle {
  return (PRODUCTION_JOB_TITLES as readonly string[]).includes(value);
}

/** Libellés d’aide affichés à côté des fonctions clés. */
export const PRODUCTION_JOB_TITLE_HINTS: Partial<Record<ProductionJobTitle, string>> = {
  'Régie artiste':
    'Service festival qui encadre l’arrivée des artistes — doit connaître les interviews validées.',
  'Régisseur de tournée':
    'Souvent sur place avec l’artiste — même besoin d’être informé des interviews validées.',
};
