import { UserRole } from '../constants/roles.constants';

export type ApiResponse<T> = T | { data: T } | { content: T };

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
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

export interface LoginLocationChartPoint {
  userName:string,
  email:string,
  loggedInAt: string;
  loginLocation?: string | null;
  location?: string | null;
  count?: number | null;
  ipAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LoginLocationChartResponse {
  points: LoginLocationChartPoint[];
  /** true when older logins in the range were left out; narrow the date range to see them. */
  truncated?: boolean;
}


export interface ViolatedUserIpInfo {
  ipAddress?: string | null;
  status?: string | null;
  message?: string | null;
  country?: string | null;
  countryCode?: string | null;
  region?: string | null;
  regionName?: string | null;
  city?: string | null;
  zip?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  isp?: string | null;
  organization?: string | null;
  asn?: string | null;
  mobile?: boolean | null;
  proxy?: boolean | null;
  hosting?: boolean | null;
}

export interface ViolatedUserInfo {
  id: number;
  email: string;
  password?: string | null;
  loginLocation?: string | null;
  ipAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  loggedInAt: string;
  ipInfo?: ViolatedUserIpInfo | null;
}

export interface ViolatedUserChartPoint {
  date: string;
  total: number;
}

export interface ViolatedUserMapPoint extends Omit<ViolatedUserInfo, 'password'> {}

/** One IP address and how often it failed to log in (many different emails = guessing). */
export interface ViolatedUserIpSummary {
  ipAddress: string;
  attempts: number;
  distinctEmails: number;
  lastAttemptAt: string;
}

/** One email address and how often someone failed to log in as it. */
export interface ViolatedUserEmailSummary {
  email: string;
  attempts: number;
  distinctIps: number;
  lastAttemptAt: string;
}

export interface ViolatedUsersDashboardResponse {
  startDate: string;
  endDate: string;
  totalAttempts: number;
  chartPoints: ViolatedUserChartPoint[];
  mapPoints: ViolatedUserMapPoint[];
  users: ViolatedUserInfo[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  /** Added in the newer API; older servers omit these. */
  uniqueIps?: number;
  uniqueEmails?: number;
  topIps?: ViolatedUserIpSummary[];
  topEmails?: ViolatedUserEmailSummary[];
}

export interface AuthSSOClientResponse {
  clientId: string;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  profilePictureUrl?: string;
  dob?: string;
  dateOfBirth?: string;
  role: UserRole;
  active?: boolean;
  relationShip: string;
  isGoodMorningEnabled?: boolean;
  isGoodNightEnabled?: boolean;
  isBirthdayEnabled?: boolean;
  /** Optional link to a custom birthday wishes page, added to the birthday email. */
  birthdayWishesUrl?: string | null;
}

export interface SaveUserPayload {
  id?: number;
  name: string;
  email: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  role: UserRole;
  relationShip: string;
  isGoodMorningEnabled?: boolean;
  isGoodNightEnabled?: boolean;
  isBirthdayEnabled?: boolean;
  /** Send '' to remove the link. */
  birthdayWishesUrl?: string;
}

/** An administrator-uploaded image used as a fallback for a generated wish. */
export interface WishImage {
  id: number;
  userId?: number | null;
  userName?: string | null;
  eventType: string;
  imageUrl: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserStatusUpdateRequest {
  active: boolean;
}

export interface RelationshipSeed {
  id: number;
  category?: string;
  code: string;
  displayName?: string;
  active?: boolean;
}

export interface SaveRelationshipSeedPayload {
  id?: number;
  name: string;
}

export interface EventTypeSeed {
  id: number;
  code?: string;
  displayName: string;
  active?: boolean;
}

export interface FestivalItem {
  id: number;
  eventName: string;
  eventDate: string;
  active: boolean;
}

export interface CalendarResItem {
  id: number;
  eventType: string;
  eventName: string;
  eventDate: string;
  active: boolean;
  /** false = happens only on eventDate; missing/true = repeats every year (older API versions omit it). */
  recurring?: boolean;
  /** Person the event belongs to (events and birthdays). */
  ownerName?: string | null;
}

export interface FestivalWishMapping {
  id: number;
  specialEventId: number;
  festivalName: string;
  userId: number;
  userName: string;
  active: boolean;
  eventDate: string;
  /** Personal note added to the festival email. */
  customMessage?: string | null;
  imageUrl?: string | null;
  lastWishSentOn?: string | null;
  /** true = the last attempt to send this wish failed. */
  error?: boolean;
}

export interface SaveFestivalWishMappingPayload {
  specialEventId: number;
  userId: number;
  active: boolean;
  customMessage?: string;
}

export type FestivalMappingStatus = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'FAILED';

export interface BulkFestivalWishMappingPayload {
  specialEventId: number;
  userIds: number[];
  active: boolean;
  customMessage?: string;
}

export interface BulkFestivalWishMappingResult {
  created: number;
  updated: number;
}

export interface FestivalWishMappingSummary {
  total: number;
  active: number;
  inactive: number;
  /** Active mappings whose festival falls in the next 30 days. */
  upcoming: number;
  failed: number;
}

export interface SaveEventTypeSeedPayload {
  id?: number;
  name: string;
}

export interface EventItem {
  id: number;
  eventType?: string;
  eventDate: string;
  recurring: boolean;
  userName: string;
  active?: boolean;
  userId?: number;
  /** Optional link to a custom wishes page, added to the event's email. */
  wishesUrl?: string | null;
}

export interface SaveEventPayload {
  eventType: string | undefined;
  festivalName?: string;
  eventDate: string;
  recurring: boolean;
  userId: number;
  /** Send '' to remove the link. */
  wishesUrl?: string;
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
  /** The image itself is not part of the list; fetch it on demand with ApiService.emailImage(). */
  hasImage: boolean;
  status: string;
  emailType?: string;
  sentAt: string;
}

export interface WishSettingsPayload {
  isGoodMorningEnabled: boolean;
  isGoodNightEnabled: boolean;
  isBirthdayEnabled: boolean;
}

export interface WishPreviewResponse {
  showMessage: boolean;
  wishType?: string | null;
  subject?: string | null;
  htmlMessage?: string | null;
  imageData?: number[] | string | null;
}

export interface PollinationsBalanceResponse {
  balance: number;
}

export interface ProfilePictureUploadUrlRequest {
  fileName: string;
  contentType: string;
}

export interface ProfilePictureUploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  objectKey: string;
  method: string;
  expiresInSeconds: number;
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


export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  published: boolean;
  canSendEmail: boolean;
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
  publishedAt?: string | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveNotificationPayload {
  title: string;
  message: string;
  canSendEmail: boolean;
  scheduledFrom?: string | null;
  scheduledTo?: string | null;
}

export interface AgentStatus {
  wishComposer: { enabled: boolean };
  deliveryOps: { enabled: boolean; dryRun: boolean; failedEmails: number };
  copilot: { enabled: boolean };
}

export interface CopilotAnswer {
  answer: string;
}

export interface DeliveryOpsRunResult {
  ran: boolean;
  dryRun: boolean;
  report: string;
}
