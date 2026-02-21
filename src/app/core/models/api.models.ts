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
  role: UserRole;
  active?: boolean;
  relationShip: string;
  isGoodMorningEnabled?: boolean;
  isGoodNightEnabled?: boolean;
  isBirthdayEnabled?: boolean;
}

export interface SaveUserPayload {
  name: string;
  email: string;
  role: UserRole;
  isGoodMorningEnabled?: boolean;
  isGoodNightEnabled?: boolean;
  isBirthdayEnabled?: boolean;
}

export interface EventItem {
  id: number;
  name: string;
  type?: string;
  eventType?: string;
  festival?: string;
  eventDate: string;
  recurring: boolean;
  wish?: string;
}

export interface SaveEventPayload {
  name: string;
  eventType: string;
  festival?: string;
  eventDate: string;
  recurring: boolean;
  wish?: string;
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
  sentAt: string;
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
