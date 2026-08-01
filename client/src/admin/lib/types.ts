export type Lang = 'fr' | 'en' | 'pt' | 'es';
export type { EventType } from '../../lib/eventProfiles';
import type { EventType } from '../../lib/eventProfiles';
export type RequestType = 'interview' | 'photo_report' | 'video_report';
export type UserRole = 'admin' | 'attache' | 'assistant';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type PressConferenceStatus = 'draft' | 'published' | 'closed' | 'completed';
export type PressConferenceRegistrationMode = 'open' | 'approval' | 'invite_only';
export type PressConferenceRegistrationStatus =
  | 'invited'
  | 'pending'
  | 'registered'
  | 'waitlisted'
  | 'declined'
  | 'checked_in'
  | 'cancelled';

export interface AppReview {
  id: string;
  userId: string | null;
  authorName: string;
  authorRole: string | null;
  authorOrg: string | null;
  rating: number;
  quote: string;
  consentPublic: boolean;
  status: ReviewStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface MyReviewResponse {
  review: AppReview | null;
  suggested: { authorName: string; authorOrg: string };
}

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  eventIds: string[];
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  eventIds: string[];
  expiresAt: string;
  createdAt: string;
}

export interface Team {
  members: TeamMember[];
  invitations: Invitation[];
}

export interface SecretStatus {
  key: string;
  label: string;
  group: string;
  hint: string;
  secret: boolean;
  source: 'db' | 'env' | 'none';
  preview: string | null;
}

export interface SettingsGroupStatus {
  id: string;
  label: string;
  description: string;
  configured: boolean;
}

export interface SettingsStatus {
  encryptionReady: boolean;
  groups: SettingsGroupStatus[];
  items: SecretStatus[];
}

/** Résultat du diagnostic Cloudinary (une ligne par contrainte vérifiée). */
export interface StorageCheck {
  id: string;
  label: string;
  status: 'ok' | 'failed' | 'skipped';
  detail: string;
}

export interface StorageCheckResult {
  ok: boolean;
  checks: StorageCheck[];
}

export type AssetKind = 'photo' | 'video' | 'logo' | 'press_kit' | 'other';
export interface EventAsset {
  id: string;
  kind: AssetKind;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  mime: string | null;
  bytes: number | null;
  source: 'upload' | 'link';
  createdAt: string;
}

export interface PressRelease {
  id: string;
  title: string;
  bodyHtml: string;
  slug: string;
  seoDescription: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface Newsletter {
  id: string;
  subject: string;
  bodyHtml: string;
  status: 'draft' | 'sending' | 'sent';
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

export interface Recipient {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  accStatus: AccStatus;
  accreditationType: 'presse' | 'photo' | 'video' | null;
  lang: Lang;
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  uploadPreset: string;
  signature: string;
  uploadUrl: string;
  maxBytes: number;
}
export type RequestStatus =
  | 'pas_encore_traite'
  | 'en_cours'
  | 'transmise_prod'
  | 'attente_artiste'
  | 'acceptee'
  | 'refusee'
  | 'liste_attente';
export type AccStatus = 'pas_encore_traite' | 'acceptee' | 'refusee';

export interface EventSummary {
  id: string;
  name: string;
  eventType: EventType;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  languages: Lang[];
  accreditationDeadline: string | null;
  branding?: EventBranding | null;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  eventCount: number;
  userCount: number;
}

export type RecapFrequency = 'none' | 'daily' | 'weekly';
export interface EventRecap {
  frequency: RecapFrequency;
  recipients: string[];
  lastSentAt: string | null;
}

export interface EventConfig {
  itwDurationMin: number;
  itwBufferMin: number;
  defaultItwQuota: number;
  photoQuotaPerStage: number;
  ageBonusPerHour: number;
  ageBonusCap: number;
  photoRule: string | null;
  onsiteContract: boolean;
  photoTerms: string | null;
}

export interface MediaType {
  id: string;
  label: string;
  weight: number;
}
export interface TypeWeight {
  type: RequestType;
  multiplier: number;
}
export interface EmailTemplate {
  id: string;
  lang: Lang;
  triggerKey: string;
  channel: 'email' | 'sms';
  subject: string | null;
  body: string;
}
export interface EventBranding {
  logoUrl: string | null;
  accentColor: string | null;
  bgColor: string | null;
  textColor: string | null;
  bgImageUrl: string | null;
}

export interface EventSettings {
  config: EventConfig;
  mediaTypes: MediaType[];
  typeWeights: TypeWeight[];
  templates: EmailTemplate[];
  branding: EventBranding;
  recap: EventRecap;
}

export interface QueueItem {
  id: string;
  type: RequestType;
  status: RequestStatus;
  score: number;
  message: string | null;
  createdAt: string;
  requester: { id: string; firstName: string; lastName: string | null; email: string; media: string | null };
  subject: {
    artistId: string | null;
    artistName: string | null;
    stageId: string | null;
    stageName: string | null;
    slot: string | null;
    slotDay: string | null;
    slotStart: string | null;
    slotEnd: string | null;
  };
  quota: { used: number; limit: number } | null;
  assignedTo: { id: string; fullName: string } | null;
  notesCount: number;
  /** Avis consultatif de la production (le plus récent) ; null si non sollicité. */
  review: {
    verdict: 'favorable' | 'defavorable';
    comment: string | null;
    contactName: string | null;
    at: string;
  } | null;
}

export interface RequestAssignee {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export type RequestTimelineItem =
  | {
      kind: 'status';
      at: string;
      status: RequestStatus;
      author: { id: string; fullName: string } | null;
      note: string | null;
    }
  | {
      kind: 'note';
      at: string;
      author: { id: string; fullName: string } | null;
      body: string;
    }
  | {
      kind: 'assignment';
      at: string;
      author: { id: string; fullName: string } | null;
      body: string;
    };

export interface Dashboard {
  total: number;
  byType: Record<RequestType, number>;
  waitlist: number;
  journalists: number;
}

export interface Accreditation {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  media: string | null;
  lang: Lang;
  accreditationType: 'presse' | 'photo' | 'video' | null;
  accStatus: AccStatus;
  hasPassword: boolean;
  createdAt: string;
}

export interface Slot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}
export interface Stage {
  id: string;
  name: string;
}
export interface ArtistWithSlots {
  id: string;
  name: string;
  stageId: string | null;
  itwQuota: number | null;
  photoQuota: number | null;
  videoQuota: number | null;
  slots: Slot[];
}
export interface Lineup {
  stages: Stage[];
  artists: ArtistWithSlots[];
}

export interface PressConference {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  capacity: number | null;
  registrationMode: PressConferenceRegistrationMode;
  status: PressConferenceStatus;
  allowedAccreditationTypes: Array<'presse' | 'photo' | 'video'>;
  embargoUntil: string | null;
  livestreamUrl: string | null;
  participants: Array<{ id: string; name: string }>;
  counts: Record<PressConferenceRegistrationStatus, number>;
  occupied: number;
  available: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PressConferenceRegistration {
  conferenceId: string;
  journalistId: string;
  status: PressConferenceRegistrationStatus;
  sourceRequestId: string | null;
  firstName: string;
  lastName: string | null;
  email: string;
  media: string | null;
  accreditationType: 'presse' | 'photo' | 'video' | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRow {
  id: string;
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
