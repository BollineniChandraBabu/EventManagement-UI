import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, OtpRequest, OtpVerifyRequest, TokenResponse } from '../models/auth.models';

const ACCESS_TOKEN = 'fw_access_token';
const REFRESH_TOKEN = 'fw_refresh_token';
const ROLE = 'fw_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isAuthed = signal(!!localStorage.getItem(ACCESS_TOKEN));
  private tokenExpiryTimeout?: ReturnType<typeof setTimeout>;

  readonly authenticated = computed(() => this.isAuthed());
  readonly role = computed(() => localStorage.getItem(ROLE) ?? 'USER');

  login(request: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap((res) => this.setSession(res, request.rememberMe))
    );
  }

  sendOtp(payload: OtpRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/otp/send`, payload);
  }

  verifyOtp(payload: OtpVerifyRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/otp/verify`, payload).pipe(
      tap((res) => this.setSession(res, false))
    );
  }

  sendResetLink(email: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword });
  }

  refreshToken(): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
      refreshToken: localStorage.getItem(REFRESH_TOKEN)
    }).pipe(tap((res) => this.setSession(res, true)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(ROLE);
    this.isAuthed.set(false);
    if (this.tokenExpiryTimeout) {
      clearTimeout(this.tokenExpiryTimeout);
    }
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN);
  }

  private setSession(response: TokenResponse, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(ACCESS_TOKEN, response.accessToken);
    storage.setItem(REFRESH_TOKEN, response.refreshToken);
    storage.setItem(ROLE, response.role);
    this.isAuthed.set(true);
    this.scheduleAutoLogout(response.expiresIn);
  }

  private scheduleAutoLogout(expiresInSeconds: number): void {
    if (this.tokenExpiryTimeout) {
      clearTimeout(this.tokenExpiryTimeout);
    }
    this.tokenExpiryTimeout = setTimeout(() => this.logout(), expiresInSeconds * 1000);
    timer(Math.max(expiresInSeconds - 30, 1) * 1000).subscribe(() => this.refreshToken().subscribe());
  }
}
