// Plage Unicode des diacritiques combinants (accents) à retirer après normalisation NFD.
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Transforme un titre en slug d'URL : sans accents, minuscules, alphanumérique + tirets. */
export function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return base || 'cp';
}

/** Rend un slug unique au sein d'une liste existante (suffixe -2, -3, …). */
export function uniqueSlug(desired: string, taken: ReadonlySet<string>): string {
  const base = slugify(desired);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
