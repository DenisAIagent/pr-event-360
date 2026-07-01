// Catégories de média pour la revue de presse (miroir de server/src/domain.ts MEDIA_CATEGORIES).
export const MEDIA_CATEGORIES = [
  { value: 'presse_ecrite', label: 'Presse écrite' },
  { value: 'web', label: 'Web / En ligne' },
  { value: 'tv', label: 'TV' },
  { value: 'radio', label: 'Radio' },
  { value: 'reseaux_sociaux', label: 'Réseaux sociaux' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Vidéo' },
  { value: 'autre', label: 'Autre' },
] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number]['value'];

export const MEDIA_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  MEDIA_CATEGORIES.map((c) => [c.value, c.label]),
);

export interface PressCoverageItem {
  id: string;
  journalistId?: string;
  mediaCategory: MediaCategory;
  isUpload: boolean;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  archiveConsent: boolean;
  promoConsent: boolean;
  createdAt: string;
}
