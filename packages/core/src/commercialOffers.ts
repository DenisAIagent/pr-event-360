/**
 * Catalogue commercial PR Event 360 — source de vérité partagée client/serveur.
 * Les prix sont en euros HT. Stripe Price IDs restent en variables d'environnement.
 */

export const STORAGE_BYTES_20_GB = 20 * 1024 * 1024 * 1024;
export const STORAGE_BYTES_100_GB = 100 * 1024 * 1024 * 1024;

/** Plans vendables en self-serve (lancement). */
export const LAUNCH_PLAN_IDS = ['event', 'pack3', 'agency', 'media_plus'] as const;
export type LaunchPlanId = (typeof LAUNCH_PLAN_IDS)[number];

/** Tous les SKUs connus (y compris extras et sur devis). */
export const ALL_PLAN_IDS = [
  'event',
  'pack3',
  'agency',
  'agency_extra',
  'media_plus',
  'sync_advanced',
  'video_heavy',
] as const;
export type CommercialPlanId = (typeof ALL_PLAN_IDS)[number];

export type CommercialCheckoutMode = 'payment' | 'subscription' | 'quote' | 'included';

export interface CommercialOffer {
  id: CommercialPlanId;
  name: string;
  tagline: string;
  /** Prix HT en euros (null = sur devis). */
  priceHt: number | null;
  priceLabel: string;
  /** Crédits événement accordés à l'achat (null = n/a, ex. option média). */
  eventCredits: number | null;
  /** Validité des crédits en mois (null = selon abonnement / illimité legacy). */
  creditsValidityMonths: number | null;
  /** Stockage interne par événement (octets). */
  storageBytesPerEvent: number;
  checkoutMode: CommercialCheckoutMode;
  /** Mis en avant sur le site de lancement. */
  launchOffer: boolean;
  highlighted?: boolean;
  features: string[];
  notes?: string[];
}

export const COMMERCIAL_OFFERS: readonly CommercialOffer[] = [
  {
    id: 'event',
    name: 'Événement',
    tagline: 'Pour un festival, une conférence ou une opération presse ponctuelle.',
    priceHt: 800,
    priceLabel: '800 € HT',
    eventCredits: 1,
    creditsValidityMonths: null,
    storageBytesPerEvent: STORAGE_BYTES_20_GB,
    checkoutMode: 'payment',
    launchOffer: true,
    features: [
      'Création et gestion d’un événement',
      'Journalistes, accréditations et invitations',
      'Équipes et contacts de production',
      'Espaces sécurisés journalistes et intervenants',
      'Badges, exports et suivi des demandes',
      'Plusieurs utilisateurs organisateurs',
      '20 Go de stockage média',
      'Connexion Google Drive incluse',
      'Support standard',
      'Conservation des données 12 mois',
    ],
    notes: [
      'Une licence = un événement distinct.',
      'Un événement archivé ne libère pas de crédit pour un nouvel événement.',
    ],
  },
  {
    id: 'pack3',
    name: 'Pack 3 événements',
    tagline: 'Pour plusieurs opérations dans l’année.',
    priceHt: 2100,
    priceLabel: '2 100 € HT',
    eventCredits: 3,
    creditsValidityMonths: 12,
    storageBytesPerEvent: STORAGE_BYTES_20_GB,
    checkoutMode: 'payment',
    launchOffer: true,
    highlighted: true,
    features: [
      '3 crédits événement',
      'Toutes les fonctionnalités de l’offre Événement',
      '20 Go de stockage par événement',
      'Connexion Google Drive incluse',
      'Crédits valables 12 mois',
      'Utilisable pour plusieurs marques ou clients',
      'Paiement du pack à l’avance',
    ],
    notes: ['Soit 700 € HT par événement (économie 300 € HT vs 3 × 800 €).'],
  },
  {
    id: 'agency',
    name: 'Agence',
    tagline: 'Pour les agences RP et équipes multi-clients.',
    priceHt: 6000,
    priceLabel: '6 000 € HT / an',
    eventCredits: 10,
    creditsValidityMonths: 12,
    storageBytesPerEvent: STORAGE_BYTES_20_GB,
    checkoutMode: 'subscription',
    launchOffer: true,
    features: [
      'Jusqu’à 10 événements par an',
      'Gestion multi-clients / organisations',
      'Toutes les fonctionnalités PR Event 360',
      '20 Go de stockage par événement',
      'Connexion Google Drive incluse',
      'Plusieurs membres d’équipe',
      'Onboarding personnalisé',
      'Support prioritaire',
      'Vue consolidée et suivi des crédits',
    ],
    notes: ['Événement supplémentaire : 450 € HT (voir option agency_extra).'],
  },
  {
    id: 'agency_extra',
    name: 'Événement agence supplémentaire',
    tagline: 'Au-delà des 10 événements inclus dans l’offre Agence.',
    priceHt: 450,
    priceLabel: '450 € HT',
    eventCredits: 1,
    creditsValidityMonths: null,
    storageBytesPerEvent: STORAGE_BYTES_20_GB,
    checkoutMode: 'payment',
    launchOffer: false,
    features: ['+1 crédit événement', '20 Go de stockage', 'Google Drive inclus'],
  },
  {
    id: 'media_plus',
    name: 'Média Plus',
    tagline: 'Photothèques et dossiers de presse volumineux.',
    priceHt: 200,
    priceLabel: '+200 € HT / événement',
    eventCredits: null,
    creditsValidityMonths: null,
    storageBytesPerEvent: STORAGE_BYTES_100_GB,
    checkoutMode: 'payment',
    launchOffer: true,
    features: [
      'Jusqu’à 100 Go de stockage interne',
      'Fichiers haute définition',
      'Gros PDF et archives',
      'Conservation prolongée',
      'Téléchargements optimisés',
      'Statistiques de consultation',
      'Support prioritaire médias',
    ],
    notes: ['Option par événement ; stockage géré par PR Event 360.'],
  },
  {
    id: 'sync_advanced',
    name: 'Synchronisation avancée',
    tagline: 'Automatisation Google Drive / SharePoint / Dropbox / S3.',
    priceHt: null,
    priceLabel: 'Sur devis',
    eventCredits: null,
    creditsValidityMonths: null,
    storageBytesPerEvent: STORAGE_BYTES_20_GB,
    checkoutMode: 'quote',
    launchOffer: false,
    features: [
      'Synchronisation automatique de dossier',
      'Détection des nouveaux fichiers',
      'Aperçus automatiques',
      'Copie de sauvegarde optionnelle',
      'Statistiques détaillées',
    ],
  },
  {
    id: 'video_heavy',
    name: 'Vidéo et contenus très lourds',
    tagline: 'Hébergement vidéo non inclus dans le stockage standard.',
    priceHt: null,
    priceLabel: 'Sur devis',
    eventCredits: null,
    creditsValidityMonths: null,
    storageBytesPerEvent: STORAGE_BYTES_20_GB,
    checkoutMode: 'quote',
    launchOffer: false,
    features: [
      'Intégration YouTube / Vimeo',
      'Lien Google Drive',
      'Cloudflare Stream ou stockage client',
      'Organisation sans hébergement obligatoire',
    ],
  },
] as const;

export function getCommercialOffer(id: string): CommercialOffer | undefined {
  return COMMERCIAL_OFFERS.find((o) => o.id === id);
}

export function launchOffers(): CommercialOffer[] {
  return COMMERCIAL_OFFERS.filter((o) => o.launchOffer);
}

/** Google Drive connecté : inclus sans supplément dans toutes les offres payantes. */
export const GOOGLE_DRIVE_INCLUDED = {
  name: 'Google Drive connecté',
  priceLabel: 'Inclus',
  features: [
    'Fichiers stockés sur le compte Google du client',
    'Affichage des fichiers autorisés dans PR Event 360',
    'Les gros dossiers ne consomment pas le stockage interne',
    'Maîtrise des documents par le client',
    'Sélection de dossier, liens sécurisés, déconnexion',
  ],
} as const;

export function formatStorageLabel(bytes: number): string {
  const gib = bytes / (1024 * 1024 * 1024);
  if (gib >= 1) return `${Math.round(gib)} Go`;
  const mib = bytes / (1024 * 1024);
  return `${Math.round(mib)} Mo`;
}
