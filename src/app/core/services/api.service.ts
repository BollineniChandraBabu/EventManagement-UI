import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiWishRequest,
  AiWishResponse,
  ApiResponse,
  AppUser,
  DashboardChartResponse,
  DashboardStats,
  FestivalItem,
  FestivalWishMapping,
  MailFlowStats,
  EmailStatus,
  EventTypeSeed,
  EventItem,
  PagedResponse,
  SaveEventPayload,
  SaveEventTypeSeedPayload,
  SaveFestivalWishMappingPayload,
  SaveUserPayload,
  SaveRelationshipSeedPayload,
  SchedulerItem,
  SchedulerTriggerResponse,
  RelationshipSeed,
  WishSettingsPayload,
  PollinationsBalanceResponse,
  UserStatusUpdateRequest,
  ProfilePictureUploadUrlRequest,
  ProfilePictureUploadUrlResponse,
  WishPreviewResponse
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(`${environment.apiUrl}/dashboard/mail`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  getIGDashboard(): Observable<DashboardStats> {
    return this.http.get<ApiResponse<DashboardStats>>(`${environment.apiUrl}/dashboard/insta`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  getMailChart(days = 0): Observable<DashboardChartResponse> {
    return this.http.get<ApiResponse<DashboardChartResponse>>(`${environment.apiUrl}/dashboard/chart/mail`, {
      params: new HttpParams().set('days', days)
    }).pipe(map((response) => this.unwrap(response)));
  }

  getInstaChart(days = 0): Observable<DashboardChartResponse> {
    return this.http.get<ApiResponse<DashboardChartResponse>>(`${environment.apiUrl}/dashboard/chart/insta`, {
      params: new HttpParams().set('days', days)
    }).pipe(map((response) => this.unwrap(response)));
  }

  getOtpMailDashboard(): Observable<MailFlowStats> {
    return this.http.get<ApiResponse<MailFlowStats>>(`${environment.apiUrl}/dashboard/mail/otp`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  getForgotPasswordMailDashboard(): Observable<MailFlowStats> {
    return this.http.get<ApiResponse<MailFlowStats>>(`${environment.apiUrl}/dashboard/mail/forgot-password`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  getOtpMailChart(days = 7): Observable<DashboardChartResponse> {
    return this.http.get<ApiResponse<DashboardChartResponse>>(`${environment.apiUrl}/dashboard/chart/mail/otp`, {
      params: new HttpParams().set('days', days)
    }).pipe(map((response) => this.unwrap(response)));
  }

  getForgotPasswordMailChart(days = 7): Observable<DashboardChartResponse> {
    return this.http.get<ApiResponse<DashboardChartResponse>>(`${environment.apiUrl}/dashboard/chart/mail/forgot-password`, {
      params: new HttpParams().set('days', days)
    }).pipe(map((response) => this.unwrap(response)));
  }

  users(
    page = 0,
    size = 10,
    searchKey = '',
    sortBy = 'createdAt',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Observable<PagedResponse<AppUser>> {
    return this.http.get<ApiResponse<PagedResponse<AppUser> | AppUser[]>>(`${environment.apiUrl}/users`, {
      params: this.pagedParams(page, size, searchKey, sortBy, sortDir)
    }).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  saveUser(payload: SaveUserPayload) {
    return this.http.post(`${environment.apiUrl}/users`, this.normalizeUserPayload(payload));
  }

  updateUser(id: number, payload: SaveUserPayload) {
    return this.http.put(`${environment.apiUrl}/users`, this.normalizeUserPayload(payload, id));
  }

  userById(id: number): Observable<AppUser> {
    return this.http.get<ApiResponse<AppUser>>(`${environment.apiUrl}/users/${id}`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  deactivateUser(id: number, userStatusUpdateRequest: UserStatusUpdateRequest) {
    return this.http.patch(`${environment.apiUrl}/users/${id}/status`, userStatusUpdateRequest);
  }

  relationshipSeeds(
    searchKey = '',
    page = 0,
    size = 1000,
    sortBy = 'displayName',
    sortDir: 'asc' | 'desc' = 'asc'
  ): Observable<RelationshipSeed[]> {
    return this.requestWithFallback((path) => this.http.get<ApiResponse<RelationshipSeed[] | PagedResponse<RelationshipSeed>>>(`${environment.apiUrl}${path}`, {
      params: this.pagedParams(page, size, searchKey, sortBy, sortDir)
    })).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeCollection(payload))
    );
  }

  relationshipSeedsPaged(
    page = 0,
    size = 10,
    searchKey = '',
    sortBy = 'displayName',
    sortDir: 'asc' | 'desc' = 'asc'
  ): Observable<PagedResponse<RelationshipSeed>> {
    return this.requestWithFallback((path) => this.http.get<ApiResponse<PagedResponse<RelationshipSeed> | RelationshipSeed[]>>(`${environment.apiUrl}${path}`, {
      params: this.pagedParams(page, size, searchKey, sortBy, sortDir)
    })).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  relationshipSeedById(id: number): Observable<RelationshipSeed> {
    return this.requestWithFallback((path) => this.http.get<ApiResponse<RelationshipSeed>>(`${environment.apiUrl}${path}/${id}`)).pipe(
      map((response) => this.unwrap(response))
    );
  }

  saveRelationshipSeed(payload: SaveRelationshipSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.post(`${environment.apiUrl}${path}`, this.normalizeEnumSeedPayload(payload)));
  }

  updateRelationshipSeed(code: string, payload: SaveRelationshipSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.put(`${environment.apiUrl}${path}/${encodeURIComponent(code)}`, this.normalizeEnumSeedPayload(payload)));
  }

  deleteRelationshipSeed(id: number): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.delete(`${environment.apiUrl}${path}/${id}`));
  }

  eventTypeSeeds(
    searchKey = '',
    page = 0,
    size = 1000,
    sortBy = 'displayName',
    sortDir: 'asc' | 'desc' = 'asc'
  ): Observable<EventTypeSeed[]> {
    return this.requestWithFallback<ApiResponse<EventTypeSeed[] | PagedResponse<EventTypeSeed>>>((path) => this.http.get<ApiResponse<EventTypeSeed[] | PagedResponse<EventTypeSeed>>>(`${environment.apiUrl}${path}`, {
      params: this.pagedParams(page, size, searchKey, sortBy, sortDir)
    }), this.eventTypeSeedPaths).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeCollection(payload))
    );
  }

  eventTypeSeedById(id: number): Observable<EventTypeSeed> {
    return this.requestWithFallback<ApiResponse<EventTypeSeed>>((path) => this.http.get<ApiResponse<EventTypeSeed>>(`${environment.apiUrl}${path}/${id}`), this.eventTypeSeedPaths).pipe(
      map((response) => this.unwrap(response))
    );
  }

  saveEventTypeSeed(payload: SaveEventTypeSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.post(`${environment.apiUrl}${path}`, this.normalizeEnumSeedPayload(payload)), this.eventTypeSeedPaths);
  }

  updateEventTypeSeed(code: string, payload: SaveEventTypeSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.put(`${environment.apiUrl}${path}/${encodeURIComponent(code)}`, this.normalizeEnumSeedPayload(payload)), this.eventTypeSeedPaths);
  }

  deleteEventTypeSeed(id: number): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.delete(`${environment.apiUrl}${path}/${id}`), this.eventTypeSeedPaths);
  }

  events(
    page = 0,
    size = 10,
    searchKey = '',
    sortBy = 'eventDate',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Observable<PagedResponse<EventItem>> {
    return this.http.get<ApiResponse<PagedResponse<EventItem> | EventItem[]>>(`${environment.apiUrl}/events`, {
      params: this.pagedParams(page, size, searchKey, sortBy, sortDir)
    }).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  saveEvent(payload: SaveEventPayload) {
    return this.http.post(`${environment.apiUrl}/events`, payload);
  }

  festivals(
    month?: number,
    page = 0,
    size = 200,
    searchKey = '',
    sortBy = 'eventDate',
    sortDir: 'asc' | 'desc' = 'asc'
  ): Observable<FestivalItem[]> {
    let params = this.pagedParams(page, size, searchKey, sortBy, sortDir);
    if (month) {
      params = params.set('month', month);
    }

    return this.http.get<ApiResponse<FestivalItem[] | PagedResponse<FestivalItem>>>(`${environment.apiUrl}/festivals`, { params }).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeCollection(payload))
    );
  }

  festivalWishMappings(
    page = 0,
    size = 200,
    searchKey = '',
    sortBy = 'id',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Observable<FestivalWishMapping[]> {
    return this.http.get<ApiResponse<FestivalWishMapping[] | PagedResponse<FestivalWishMapping>>>(`${environment.apiUrl}/festival-wish-mappings`, {
      params: this.pagedParams(page, size, searchKey, sortBy, sortDir)
    }).pipe(
      map((response) => this.unwrap(response)),
      map((payload) => this.normalizeCollection(payload))
    );
  }

  saveFestivalWishMapping(payload: SaveFestivalWishMappingPayload): Observable<FestivalWishMapping> {
    return this.http.post<ApiResponse<FestivalWishMapping>>(`${environment.apiUrl}/festival-wish-mappings`, payload).pipe(
      map((response) => this.unwrap(response))
    );
  }

  deleteFestivalWishMapping(id: number): Observable<unknown> {
    return this.http.delete(`${environment.apiUrl}/festival-wish-mappings/${id}`);
  }

  aiWish(payload: AiWishRequest): Observable<AiWishResponse> {
    return this.http.post<AiWishResponse>(`${environment.apiUrl}/ai/generate-wish`, payload);
  }

  emailStatuses(page = 0, size = 10, searchKey = '', emailType = ''): Observable<PagedResponse<EmailStatus>> {
    let url = `${environment.apiUrl}/emails/status`;
    if (emailType === 'OTP') {
      url += '/admin/otp';
    } else if (emailType === 'FORGOT_PASSWORD') {
      url += '/admin/forgot-password';
    } else if (emailType === 'FESTIVAL_WISH') {
      url += '/festival-wishes';
    } else if (emailType === 'UNREAD_CHAT_MESSAGE') {
      url += '/unread-chat-messages';
    }
    const params = this.pagedParams(page, size, searchKey);
    const requestWithEmailType = () => this.http.get<ApiResponse<PagedResponse<EmailStatus> | EmailStatus[]>>(url, {
      params: emailType ? params.set('emailType', emailType) : params
    });

    const requestWithoutEmailType = () => this.http.get<ApiResponse<PagedResponse<EmailStatus> | EmailStatus[]>>(`${environment.apiUrl}/emails/status`, {
      params
    });

    return requestWithEmailType().pipe(
      catchError((error) => {
        if (!emailType) {
          return throwError(() => error);
        }

        return requestWithoutEmailType();
      }),
      map((response) => this.normalizePaged(this.unwrap(response), page, size))
    );
  }

  sendTestEmail(html: string) {
    return this.http.post(`${environment.apiUrl}/emails/test`, { html });
  }

  updateWishSettings(payload: WishSettingsPayload) {
    return this.http.patch(`${environment.apiUrl}/users/me/wish-settings`, payload);
  }

  getMyWishPreview(): Observable<WishPreviewResponse> {
    return this.http.get<ApiResponse<WishPreviewResponse>>(`${environment.apiUrl}/users/me/wish-preview`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  getProfilePictureUploadUrl(payload: ProfilePictureUploadUrlRequest): Observable<ProfilePictureUploadUrlResponse> {
    return this.http.post<ApiResponse<ProfilePictureUploadUrlResponse>>(`${environment.apiUrl}/users/me/profile-picture/presigned-url`, payload).pipe(
      map((response) => this.unwrap(response))
    );
  }

  uploadMyProfilePicture(file: File): Observable<AppUser> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<AppUser>>(`${environment.apiUrl}/users/me/profile-picture`, formData).pipe(
      map((response) => this.unwrap(response))
    );
  }

  removeMyProfilePicture(): Observable<AppUser> {
    return this.http.delete<ApiResponse<AppUser>>(`${environment.apiUrl}/users/me/profile-picture`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  getPollinationsBalance(): Observable<number> {
    return this.http.get<ApiResponse<PollinationsBalanceResponse>>(`${environment.apiUrl}/ai/pollinations/balance`).pipe(
      map((response) => this.unwrap(response).balance)
    );
  }

  schedulers(
    page = 0,
    size = 10,
    searchKey = '',
    sortBy = 'name',
    sortDir: 'asc' | 'desc' = 'asc'
  ): Observable<PagedResponse<SchedulerItem>> {
    return this.http.get<ApiResponse<PagedResponse<SchedulerItem> | SchedulerItem[]>>(`${environment.apiUrl}/schedulers`, {
      params: this.pagedParams(page, size, searchKey, sortBy, sortDir)
    }).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  triggerScheduler(jobName: string): Observable<SchedulerTriggerResponse> {
    return this.http.post<ApiResponse<SchedulerTriggerResponse>>(`${environment.apiUrl}/schedulers/${encodeURIComponent(jobName)}/trigger`, {}).pipe(
      map((response) => this.unwrap(response))
    );
  }

  private pagedParams(
    page: number,
    size: number,
    searchKey: string,
    sortBy?: string,
    sortDir?: 'asc' | 'desc'
  ): HttpParams {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('searchKey', searchKey ?? '');

    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }

    if (sortDir) {
      params = params.set('sortDir', sortDir);
    }

    return params;
  }

  private normalizePaged<T>(payload: PagedResponse<T> | T[], page: number, size: number): PagedResponse<T> {
    if (Array.isArray(payload)) {
      return {
        content: payload,
        page,
        size,
        totalElements: payload.length,
        totalPages: payload.length ? 1 : 0
      };
    }

    return {
      content: payload.content ?? [],
      page: payload.page ?? page,
      size: payload.size ?? size,
      totalElements: payload.totalElements ?? (payload.content?.length ?? 0),
      totalPages: payload.totalPages ?? 0
    };
  }

  private normalizeCollection<T>(payload: T[] | PagedResponse<T> | unknown): T[] {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'content' in payload && Array.isArray(payload.content)) {
      return payload.content as T[];
    }

    return [];
  }

  private normalizeUserPayload(payload: SaveUserPayload, id?: number): Record<string, unknown> {
    return {
      ...payload,
      ...(id ? { id, userId: id } : {}),
      dob: payload.dob ?? '',
      dateOfBirth: payload.dob ?? '',
      relationShip: payload.relationShip ?? '',
      relationship: payload.relationShip ?? '',
      isBirthdayEnabled: payload.isBirthdayEnabled ?? false,
      isGoodMorningEnabled: payload.isGoodMorningEnabled ?? false,
      isGoodNightEnabled: payload.isGoodNightEnabled ?? false
    };
  }

  private normalizeEnumSeedPayload(payload: SaveRelationshipSeedPayload | SaveEventTypeSeedPayload): Record<string, unknown> {
    const normalizedName = (payload.name ?? '').trim();
    const normalizedCode = normalizedName.replace(/\s+/g, '_').toUpperCase();

    return {
      code: normalizedCode,
      displayName: normalizedName,
      active: true
    };
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (typeof response === 'object' && response !== null && 'data' in response) {
      return response.data;
    }

    if (
      typeof response === 'object' &&
      response !== null &&
      'content' in response &&
      !('totalElements' in response) &&
      !('totalPages' in response) &&
      !('page' in response) &&
      !('size' in response)
    ) {
      return response.content as T;
    }

    return response as T;
  }

  private requestWithFallback<T>(
    requestFactory: (path: string) => Observable<T>,
    paths: readonly [string, string] = this.relationshipSeedPaths
  ): Observable<T> {
    const [primaryPath, fallbackPath] = paths;

    return requestFactory(primaryPath).pipe(
      catchError((primaryError) => requestFactory(fallbackPath).pipe(
        catchError(() => throwError(() => primaryError))
      ))
    );
  }

  private readonly relationshipSeedPaths = ['/seed/relationships', '/relation-seeds'] as const;
  private readonly eventTypeSeedPaths = ['/seed/event-types', '/event-types-seeds'] as const;


}
