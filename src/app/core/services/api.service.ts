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
  MailFlowStats,
  EmailStatus,
  EventTypeSeed,
  EventItem,
  PagedResponse,
  SaveEventPayload,
  SaveEventTypeSeedPayload,
  SaveUserPayload,
  SaveRelationshipSeedPayload,
  SchedulerItem,
  SchedulerTriggerResponse,
  RelationshipSeed,
  WishSettingsPayload
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
    return this.http.post(`${environment.apiUrl}/users`, payload);
  }

  updateUser(id: number, payload: SaveUserPayload) {
    return this.http.put(`${environment.apiUrl}/users`, { ...payload, id });
  }

  userById(id: number): Observable<AppUser> {
    return this.http.get<ApiResponse<AppUser>>(`${environment.apiUrl}/users/${id}`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  deactivateUser(id: number) {
    return this.http.post(`${environment.apiUrl}/users/${id}/deactivate`, {});
  }

  relationshipSeeds(searchKey = ''): Observable<RelationshipSeed[]> {
    return this.requestWithFallback<ApiResponse<RelationshipSeed[]>>((path) => this.http.get<ApiResponse<RelationshipSeed[]>>(`${environment.apiUrl}${path}`, {
      params: new HttpParams().set('searchKey', searchKey)
    })).pipe(map((response) => this.unwrap(response)));
  }

  relationshipSeedById(id: number): Observable<RelationshipSeed> {
    return this.requestWithFallback<ApiResponse<RelationshipSeed>>((path) => this.http.get<ApiResponse<RelationshipSeed>>(`${environment.apiUrl}${path}/${id}`)).pipe(
      map((response) => this.unwrap(response))
    );
  }

  saveRelationshipSeed(payload: SaveRelationshipSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.post(`${environment.apiUrl}${path}`, payload));
  }

  updateRelationshipSeed(id: number, payload: SaveRelationshipSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.put(`${environment.apiUrl}${path}`, { ...payload, id }));
  }

  deleteRelationshipSeed(id: number): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.delete(`${environment.apiUrl}${path}/${id}`));
  }

  eventTypeSeeds(searchKey = ''): Observable<EventTypeSeed[]> {
    return this.requestWithFallback<ApiResponse<EventTypeSeed[]>>((path) => this.http.get<ApiResponse<EventTypeSeed[]>>(`${environment.apiUrl}${path}`, {
      params: new HttpParams().set('searchKey', searchKey)
    }), this.eventTypeSeedPaths).pipe(map((response) => this.unwrap(response)));
  }

  eventTypeSeedById(id: number): Observable<EventTypeSeed> {
    return this.requestWithFallback<ApiResponse<EventTypeSeed>>((path) => this.http.get<ApiResponse<EventTypeSeed>>(`${environment.apiUrl}${path}/${id}`), this.eventTypeSeedPaths).pipe(
      map((response) => this.unwrap(response))
    );
  }

  saveEventTypeSeed(payload: SaveEventTypeSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.post(`${environment.apiUrl}${path}`, payload), this.eventTypeSeedPaths);
  }

  updateEventTypeSeed(id: number, payload: SaveEventTypeSeedPayload): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.put(`${environment.apiUrl}${path}`, { ...payload, id }), this.eventTypeSeedPaths);
  }

  deleteEventTypeSeed(id: number): Observable<unknown> {
    return this.requestWithFallback((path) => this.http.delete(`${environment.apiUrl}${path}/${id}`), this.eventTypeSeedPaths);
  }

  events(page = 0, size = 10, searchKey = ''): Observable<PagedResponse<EventItem>> {
    return this.http.get<ApiResponse<PagedResponse<EventItem> | EventItem[]>>(`${environment.apiUrl}/events`, {
      params: this.pagedParams(page, size, searchKey)
    }).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  saveEvent(payload: SaveEventPayload) {
    return this.http.post(`${environment.apiUrl}/events`, payload);
  }

  aiWish(payload: AiWishRequest): Observable<AiWishResponse> {
    return this.http.post<AiWishResponse>(`${environment.apiUrl}/ai/generate-wish`, payload);
  }

  emailStatuses(page = 0, size = 10, searchKey = '', emailType = ''): Observable<PagedResponse<EmailStatus>> {
    return this.http.get<ApiResponse<PagedResponse<EmailStatus> | EmailStatus[]>>(`${environment.apiUrl}/emails/status`, {
      params: this.pagedParams(page, size, searchKey).set('emailType', emailType)
    }).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  sendTestEmail(html: string) {
    return this.http.post(`${environment.apiUrl}/emails/test`, { html });
  }

  updateWishSettings(payload: WishSettingsPayload) {
    return this.http.patch(`${environment.apiUrl}/users/me/wish-settings`, payload);
  }

  schedulers(page = 0, size = 10, searchKey = ''): Observable<PagedResponse<SchedulerItem>> {
    return this.http.get<ApiResponse<PagedResponse<SchedulerItem> | SchedulerItem[]>>(`${environment.apiUrl}/schedulers`, {
      params: this.pagedParams(page, size, searchKey)
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

  private requestWithFallback<T>(requestFactory: (path: string) => Observable<T>, paths: readonly [string, string] = this.relationshipSeedPaths): Observable<T> {
    const [primaryPath, fallbackPath] = paths;

    return requestFactory(primaryPath).pipe(
      catchError((primaryError) => requestFactory(fallbackPath).pipe(
        catchError(() => throwError(() => primaryError))
      ))
    );
  }

  private readonly relationshipSeedPaths: readonly [string, string] = ['/relation-seeds', '/relationship-seeds'];
  private readonly eventTypeSeedPaths: readonly [string, string] = ['/event-type-seeds', '/event-seeds'];
}
