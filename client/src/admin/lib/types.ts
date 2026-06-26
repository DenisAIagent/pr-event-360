export type Lang = 'fr' | 'en' | 'pt' | 'es';
export type RequestType = 'interview' | 'photo_report' | 'video_report';
export type UserRole = 'admin' | 'attache' | 'assistant';

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
  secret: boolean;
  source: 'db' | 'env' | 'none';
  preview: string | null;
}

export interface SettingsStatus {
  encryptionReady: boolean;
  items: SecretStatus[];
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
  publishedAt: string | null;
  status: 'draft' | 'published';
  createdAt: string;
}

export interface Newsletter {
  id: string;
  subject: string;
  bodyHtml: string;
  status: 'draft' | 'sent';
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
  signature: string;
  uploadUrl: string;
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
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  languages: Lang[];
  accreditationDeadline: string | null;
  branding?: EventBranding | null;
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
}

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
  token: string | null;
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
  slots: Slot[];
}
export interface Lineup {
  stages: Stage[];
  artists: ArtistWithSlots[];
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
