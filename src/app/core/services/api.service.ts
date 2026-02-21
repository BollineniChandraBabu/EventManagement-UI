import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiWishRequest,
  AiWishResponse,
  ApiResponse,
  AppUser,
  DashboardChartResponse,
  DashboardStats,
  EmailStatus,
  EventItem,
  PagedResponse,
  SaveEventPayload,
  SaveTemplatePayload,
  SaveUserPayload,
  SchedulerItem,
  SchedulerTriggerResponse,
  TemplateVersion
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
    return this.http.put(`${environment.apiUrl}/users/${id}`, payload);
  }

  userById(id: number): Observable<AppUser> {
    return this.http.get<ApiResponse<AppUser>>(`${environment.apiUrl}/users/${id}`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  deactivateUser(id: number) {
    return this.http.patch(`${environment.apiUrl}/users/${id}/deactivate`, {});
  }

  events(page = 0, size = 10, searchKey = ''): Observable<PagedResponse<EventItem>> {
    return this.http.get<ApiResponse<PagedResponse<EventItem> | EventItem[]>>(`${environment.apiUrl}/events`, {
      params: this.pagedParams(page, size, searchKey)
    }).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  saveEvent(payload: {
    subject: string;
    body: string;
    eventType: string;
    eventDate: string;
    recurring: boolean;
    festivalName: string | undefined;
    userId: string
  }) {
    return this.http.post(`${environment.apiUrl}/events`, payload);
  }

  updateEvent(id: number, payload: {
    subject: string;
    body: string;
    eventType: string;
    eventDate: string;
    recurring: boolean;
    festivalName: string | undefined;
    userId: string
  }) {
    return this.http.put(`${environment.apiUrl}/events/${id}`, payload);
  }

  aiWish(payload: AiWishRequest): Observable<AiWishResponse> {
    return this.http.post<AiWishResponse>(`${environment.apiUrl}/ai/generate-wish`, payload);
  }

  saveTemplate(payload: SaveTemplatePayload) {
    return this.http.post(`${environment.apiUrl}/templates`, payload);
  }

  templateVersions(): Observable<TemplateVersion[]> {
    return this.http.get<ApiResponse<TemplateVersion[]>>(`${environment.apiUrl}/templates/versions`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  restoreTemplate(id: number) {
    return this.http.post(`${environment.apiUrl}/templates/restore/${id}`, {});
  }

  emailStatuses(page = 0, size = 10, searchKey = ''): Observable<PagedResponse<EmailStatus>> {
    return this.http.get<ApiResponse<PagedResponse<EmailStatus> | EmailStatus[]>>(`${environment.apiUrl}/emails/status`, {
      params: this.pagedParams(page, size, searchKey)
    }).pipe(map((response) => this.normalizePaged(this.unwrap(response), page, size)));
  }

  retryEmail(id: number) {
    return this.http.post(`${environment.apiUrl}/emails/${id}/retry`, {});
  }

  sendTestEmail(html: string) {
    return this.http.post(`${environment.apiUrl}/emails/test`, { html });
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
}
