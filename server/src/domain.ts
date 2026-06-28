import type {
  AccreditationStatus,
  AccreditationType,
  Lang,
  RequestStatus,
  RequestType,
  UserRole,
} from '@pr-event-360/core';

/** DTO camelCase renvoyés par les repositories (mappés depuis les lignes SQL). */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  organizationId: string;
  organizationName: string;
  isPlatformAdmin: boolean;
  createdAt: string;
}

export interface EventConfig {
  itwDurationMin: number;
  itwBufferMin: number;
  defaultItwQuota: number;
  photoQuotaPerStage: number;
  ageBonusPerHour: number;
  ageBonusCap: number;
}

export interface Event {
  id: string;
  organizationId: string;
  ownerUserId: string;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  languages: Lang[];
  accreditationDeadline: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  subdomainSlug: string | null;
  createdAt: string;
}

export type RecapFrequency = 'none' | 'daily' | 'weekly';

export interface EventRecap {
  frequency: RecapFrequency;
  recipients: string[];
  lastSentAt: string | null;
}

export interface EventBranding {
  logoUrl: string | null;
  accentColor: string | null;
  bgColor: string | null;
  textColor: string | null;
  bgImageUrl: string | null;
}

export interface MediaType {
  id: string;
  eventId: string;
  label: string;
  weight: number;
}

export interface RequestTypeWeight {
  type: RequestType;
  multiplier: number;
}

export interface EmailTemplate {
  id: string;
  eventId: string;
  lang: Lang;
  triggerKey: string;
  channel: 'email' | 'sms';
  subject: string | null;
  body: string;
}

export interface Stage {
  id: string;
  eventId: string;
  name: string;
}

export interface Artist {
  id: string;
  eventId: string;
  name: string;
  stageId: string | null;
  itwQuota: number | null;
  photoQuota: number | null;
  videoQuota: number | null;
}

export interface ArtistWindow {
  id: string;
  artistId: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface InterviewSlot {
  id: string;
  artistId: string;
  windowId: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface Journalist {
  id: string;
  eventId: string;
  token: string | null;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  media: string | null;
  mediaTypeId: string | null;
  audience: string | null;
  prevArticle: string | null;
  lang: Lang;
  accreditationType: AccreditationType | null;
  accStatus: AccreditationStatus;
  commitPublish: boolean;
  consent: boolean;
  /** Hash argon2 du mot de passe d'espace (null = aucun mot de passe défini). Jamais sérialisé tel quel. */
  passwordHash: string | null;
  createdAt: string;
}

export interface RequestRecord {
  id: string;
  eventId: string;
  journalistId: string;
  type: RequestType;
  artistId: string | null;
  slotId: string | null;
  stageId: string | null;
  message: string | null;
  status: RequestStatus;
  createdAt: string;
}

export interface RequestStatusHistoryEntry {
  id: string;
  requestId: string;
  status: RequestStatus;
  changedAt: string;
  changedBy: string | null;
  note: string | null;
}

export type AssetKind = 'photo' | 'video' | 'logo' | 'press_kit' | 'other';

export interface EventAsset {
  id: string;
  eventId: string;
  kind: AssetKind;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  mime: string | null;
  bytes: number | null;
  source: 'upload' | 'link';
  sort: number;
  createdAt: string;
}

export interface PressRelease {
  id: string;
  eventId: string;
  title: string;
  bodyHtml: string;
  publishedAt: string | null;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface Newsletter {
  id: string;
  eventId: string;
  subject: string;
  bodyHtml: string;
  status: 'draft' | 'sent';
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  eventId: string;
  journalistId: string | null;
  channel: 'email' | 'sms';
  triggerKey: string;
  lang: Lang;
  toAddress: string;
  subject: string | null;
  body: string;
  provider: string;
  status: string;
  createdAt: string;
}
