import { UserRole } from '../constants/roles.constants';

export type ApiResponse<T> = T | { data: T } | { content: T };

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface DashboardStats {
  totalUsers: number;
  upcomingEvents: number;
  emailsSentToday: number;
  failedEmails: number;
}

export interface MailFlowStats {
  emailsSentToday: number;
  failedEmails: number;
}

export interface DashboardChartPoint {
  date: string;
  sent: number;
  failed: number;
  total: number;
}

export interface DashboardChartResponse {
  days: number;
  points: DashboardChartPoint[];
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  dob?: string;
  dateOfBirth?: string;
  role: UserRole;
  active?: boolean;
  relationShip: string;
  isGoodMorningEnabled?: boolean;
  isGoodNightEnabled?: boolean;
  isBirthdayEnabled?: boolean;
}

export interface SaveUserPayload {
  id?: number;
  name: string;
  email: string;
  dob: string;
  role: UserRole;
  relationShip: string;
  isGoodMorningEnabled?: boolean;
  isGoodNightEnabled?: boolean;
  isBirthdayEnabled?: boolean;
}

export interface RelationshipSeed {
  id: number;
  code: string;
  active?: boolean;
}

export interface SaveRelationshipSeedPayload {
  id?: number;
  name: string;
}

export interface EventTypeSeed {
  id: number;
  displayName: string;
  active?: boolean;
}

export interface SaveEventTypeSeedPayload {
  id?: number;
  name: string;
}

export interface EventItem {
  id: number;
  eventType?: string;
  festivalName?: string;
  eventDate: string;
  recurring: boolean;
  userId: number;
  active?: boolean;
}

export interface SaveEventPayload {
  eventType: string;
  festivalName?: string;
  eventDate: string;
  recurring: boolean;
  userId: number;
}

export interface AiWishRequest {
  name: string;
  relation?: string;
  event: string;
  tone: string;
  language: string;
}

export interface AiWishResponse {
  message: string;
  htmlMessage: string;
  subject: string;
}

export interface TemplateVersion {
  id: number;
  updatedAt: string;
}

export interface SaveTemplatePayload {
  html: string;
  css?: string;
}

export interface EmailStatus {
  id: number;
  toEmail: string;
  subject: string;
  body: string;
  imgData: string;
  status: string;
  emailType?: string;
  sentAt: string;
}

export interface WishSettingsPayload {
  isGoodMorningEnabled: boolean;
  isGoodNightEnabled: boolean;
  isBirthdayEnabled: boolean;
}

// Matches scheduler API response payload shape from backend.
export interface SchedulerItem {
  name: string;
  type: string;
  running: boolean;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastDurationMs?: number;
  lastStatus?: string;
  lastError?: string;
  nextFireTime?: string;
  previousFireTime?: string;
}


export interface SchedulerTriggerResponse {
  name: string;
  message: string;
  triggeredAt: string;
}
