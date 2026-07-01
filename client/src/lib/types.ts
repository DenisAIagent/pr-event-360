import type { Lang } from '../i18n';
import type { PressCoverageItem } from './mediaCategories';

export type RequestType = 'interview' | 'photo_report' | 'video_report';
export type RequestStatus =
  | 'pas_encore_traite'
  | 'en_cours'
  | 'transmise_prod'
  | 'attente_artiste'
  | 'acceptee'
  | 'refusee'
  | 'liste_attente';
export type AccreditationType = 'presse' | 'photo' | 'video';

export interface EventBranding {
  logoUrl: string | null;
  accentColor: string | null;
  bgColor: string | null;
  textColor: string | null;
  bgImageUrl: string | null;
}

export type NewsroomAssetKind = 'photo' | 'video' | 'logo' | 'press_kit' | 'other';
export interface NewsroomAsset {
  id: string;
  kind: NewsroomAssetKind;
  title: string;
  description: string | null;
  url: string;
  thumbnailUrl: string | null;
  mime: string | null;
  bytes: number | null;
}
export interface NewsroomPressRelease {
  id: string;
  title: string;
  bodyHtml: string;
  slug: string;
  seoDescription: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
}
export interface NewsroomData {
  event: {
    id: string;
    name: string;
    location: string | null;
    branding: EventBranding | null;
    deadline: string | null;
    registrationClosed: boolean;
  };
  assets: NewsroomAsset[];
  pressReleases: NewsroomPressRelease[];
}

export interface PressReleaseDetail {
  event: { id: string; name: string; branding: EventBranding | null };
  pressRelease: NewsroomPressRelease;
}

export interface PublicEvent {
  id: string;
  name: string;
  location: string | null;
  languages: Lang[];
  mediaTypes: { id: string; label: string }[];
  branding: EventBranding;
  registrationClosed: boolean;
  deadline: string | null;
}

export interface PublicSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}
export interface PublicArtist {
  id: string;
  name: string;
  stageId: string | null;
  slots: PublicSlot[];
}
export interface PublicStage {
  id: string;
  name: string;
}

export interface RequestHistoryEntry {
  status: RequestStatus;
  changedAt: string;
  note: string | null;
}
export interface JournalistRequest {
  id: string;
  type: RequestType;
  status: RequestStatus;
  message: string | null;
  createdAt: string;
  artistName: string | null;
  stageName: string | null;
  slotDay: string | null;
  slotStart: string | null;
  slotEnd: string | null;
  history: RequestHistoryEntry[];
}

export interface SpaceResponse {
  event: { id: string; name: string; languages: Lang[]; branding: EventBranding; ended?: boolean };
  journalist: {
    firstName: string;
    lastName: string | null;
    lang: Lang;
    accreditationType: AccreditationType | null;
    hasPassword: boolean;
  };
  lineup: { stages: PublicStage[]; artists: PublicArtist[] };
  requests: JournalistRequest[];
  photoRules?: { photoRule: string | null; onsiteContract: boolean; photoTerms: string | null } | null;
  coverage?: PressCoverageItem[];
  coverageCategories?: { value: string; label: string }[];
}
