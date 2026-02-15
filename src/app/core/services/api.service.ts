import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AiWishRequest,
  AiWishResponse,
  ApiResponse,
  AppUser,
  DashboardStats,
  EmailStatus,
  EventItem,
  SaveEventPayload,
  SaveTemplatePayload,
  SaveUserPayload,
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

  users(): Observable<AppUser[]> {
    return this.http.get<ApiResponse<AppUser[]>>(`${environment.apiUrl}/users`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  saveUser(payload: SaveUserPayload) {
    return this.http.post(`${environment.apiUrl}/users`, payload);
  }

  updateUser(id: number, payload: SaveUserPayload) {
    return this.http.put(`${environment.apiUrl}/users/${id}`, payload);
  }

  deactivateUser(id: number) {
    return this.http.patch(`${environment.apiUrl}/users/${id}/deactivate`, {});
  }

  events(): Observable<EventItem[]> {
    return this.http.get<ApiResponse<EventItem[]>>(`${environment.apiUrl}/events`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  saveEvent(payload: {
    name: string;
    eventType: string;
    eventDate: string;
    recurring: boolean;
    wish: string;
    festival: string | undefined;
    relation: string
  }) {
    return this.http.post(`${environment.apiUrl}/events`, payload);
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

  emailStatuses(): Observable<EmailStatus[]> {
    return this.http.get<ApiResponse<EmailStatus[]>>(`${environment.apiUrl}/emails/status`).pipe(
      map((response) => this.unwrap(response))
    );
  }

  retryEmail(id: number) {
    return this.http.post(`${environment.apiUrl}/emails/${id}/retry`, {});
  }

  sendTestEmail(html: string) {
    return this.http.post(`${environment.apiUrl}/emails/test`, { html });
  }

  private unwrap<T>(response: ApiResponse<T>): T {
    if (typeof response === 'object' && response !== null && 'data' in response) {
      return response.data;
    }

    if (typeof response === 'object' && response !== null && 'content' in response) {
      return response.content;
    }

    return response as T;
  }
}
