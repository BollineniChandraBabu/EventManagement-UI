import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<{ totalUsers: number; upcomingEvents: number; emailsSentToday: number; failedEmails: number }> {
    return this.http.get<{ totalUsers: number; upcomingEvents: number; emailsSentToday: number; failedEmails: number }>(`${environment.apiUrl}/dashboard`);
  }

  users() { return this.http.get<any[]>(`${environment.apiUrl}/users`); }
  saveUser(payload: any) { return this.http.post(`${environment.apiUrl}/users`, payload); }
  updateUser(id: number, payload: any) { return this.http.put(`${environment.apiUrl}/users/${id}`, payload); }
  deactivateUser(id: number) { return this.http.patch(`${environment.apiUrl}/users/${id}/deactivate`, {}); }

  events() { return this.http.get<any[]>(`${environment.apiUrl}/events`); }
  saveEvent(payload: any) { return this.http.post(`${environment.apiUrl}/events`, payload); }
  aiWish(payload: any) { return this.http.post<{ message: string }>(`${environment.apiUrl}/wishes/generate`, payload); }

  saveTemplate(payload: any) { return this.http.post(`${environment.apiUrl}/templates`, payload); }
  templateVersions() { return this.http.get<any[]>(`${environment.apiUrl}/templates/versions`); }
  restoreTemplate(id: number) { return this.http.post(`${environment.apiUrl}/templates/restore/${id}`, {}); }

  emailStatuses() { return this.http.get<any[]>(`${environment.apiUrl}/emails/status`); }
  retryEmail(id: number) { return this.http.post(`${environment.apiUrl}/emails/${id}/retry`, {}); }
  sendTestEmail(html: string) { return this.http.post(`${environment.apiUrl}/emails/test`, { html }); }
}
