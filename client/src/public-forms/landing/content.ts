import {
  Users,
  Mail,
  BellRing,
  UserCheck,
  BarChart3,
  Users2,
  type LucideIcon,
} from 'lucide-react';

/**
 * Contenu éditorial de la landing. Regroupé ici pour que la page ne porte que
 * la composition : le texte se relit et se corrige à un seul endroit.
 */

/** Garanties courtes affichées sous le CTA du hero. */
export const TRUST_POINTS = ['Sans installation', 'Conforme RGPD', 'Support FR'] as const;

/**
 * Profils d'événement pris en charge (cf. design system, « Product vocabulary »).
 * Le bandeau sous le hero remplace la rangée de logos clients de la référence :
 * on n'affiche aucune marque que l'on n'a pas.
 */
export const EVENT_PROFILES = [
  ['Festivals', 'Artistes · Scènes'],
  ['Concerts', 'Artistes · Line-up'],
  ['Salons & foires', 'Exposants · Espaces'],
  ['Conférences', 'Intervenants · Salles'],
  ['Séminaires', 'Intervenants · Programme'],
  ['Corporate', 'Porte-paroles · Espaces'],
] as const;

export const FEATURES: readonly (readonly [LucideIcon, string, string])[] = [
  [Users, 'Gestion des contacts presse', 'Centralisez journalistes et médias avec tags, historique et engagement.'],
  [Mail, 'Invitations & accréditations', 'Envoyez, suivez et validez les demandes en quelques clics.'],
  [BellRing, 'Relances automatisées', 'Programmez des relances ciblées et ne manquez aucune réponse.'],
  [UserCheck, 'Suivi des présences', 'Visualisez accréditations, confirmations et présences en temps réel.'],
  [BarChart3, 'Reporting média', 'Mesurez les retombées et le ROI de chaque événement.'],
  [Users2, 'Collaboration équipe', 'Travaillez à plusieurs sur un même événement, en toute clarté.'],
] as const;

/**
 * Le cycle RP d'un événement. La numérotation porte une information réelle :
 * c'est l'ordre dans lequel les étapes se succèdent dans le produit.
 */
export const CYCLE_STEPS = [
  ['Invitations & relances', 'Le fichier presse est invité, relancé et segmenté depuis un seul écran.'],
  ['Accréditations & badges', 'Chaque demande est validée, tracée, puis convertie en badge.'],
  ['Demandes & conférences de presse', 'Interviews, reportages et points presse se planifient sans e-mails croisés.'],
  ['Newsroom & retombées', 'Communiqués publiés, couverture suivie, revue de presse prête à partager.'],
] as const;

export interface LaunchPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  note: string;
  highlight?: boolean;
  features: readonly string[];
}

export const LAUNCH_PLANS: readonly LaunchPlan[] = [
  {
    id: 'event',
    name: 'Événement',
    price: '800 €',
    period: 'HT / événement',
    note: '1 licence · 20 Go · Google Drive inclus',
    features: [
      'Accréditations & demandes',
      'Badges, exports, équipes',
      'Espaces journalistes sécurisés',
      '20 Go stockage + Drive inclus',
    ],
  },
  {
    id: 'pack3',
    name: 'Pack 3',
    price: '2 100 €',
    period: 'HT',
    note: 'Soit 700 € / événement · valable 12 mois',
    highlight: true,
    features: [
      '3 crédits événement',
      'Toutes les fonctionnalités',
      'Multi-marques / multi-clients',
      'Économie 300 € HT',
    ],
  },
  {
    id: 'agency',
    name: 'Agence',
    price: '6 000 €',
    period: 'HT / an',
    note: '10 événements / an · +450 € au-delà',
    features: [
      'Jusqu’à 10 événements / an',
      'Support prioritaire & onboarding',
      'Vue consolidée multi-clients',
      'Suivi des crédits',
    ],
  },
] as const;
