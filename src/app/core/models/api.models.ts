import { UserRole } from '../constants/roles.constants';

export type ApiResponse<T> = T | { data: T } | { content: T };

export interface DashboardStats {
  totalUsers: number;
  upcomingEvents: number;
  emailsSentToday: number;
  failedEmails: number;
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
  status: string;
  sentAt: string;
}
