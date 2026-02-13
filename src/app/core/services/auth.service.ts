import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subscription, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, OtpRequest, OtpVerifyRequest, TokenResponse } from '../models/auth.models';

const ACCESS_TOKEN = 'fw_access_token';
const REFRESH_TOKEN = 'fw_refresh_token';
const ROLE = 'fw_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly isAuthed = signal(this.hasToken());
  private tokenExpiryTimeout?: ReturnType<typeof setTimeout>;
  private refreshTimerSub?: Subscription;

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
    this.clearStoredSession();
    this.isAuthed.set(false);
    this.cancelTimers();
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.getStoredValue(ACCESS_TOKEN);
  }

  private setSession(response: TokenResponse, rememberMe: boolean): void {
    const storage = this.getStorage(rememberMe);

    this.clearStoredSession();
    storage.setItem(ACCESS_TOKEN, response.accessToken);
    storage.setItem(REFRESH_TOKEN, response.refreshToken);
    storage.setItem(ROLE, response.role);

    this.isAuthed.set(true);
    this.scheduleAutoLogout(response.expiresIn);
  }

  private scheduleAutoLogout(expiresInSeconds: number): void {
    this.cancelTimers();

    this.tokenExpiryTimeout = setTimeout(() => this.logout(), expiresInSeconds * 1000);

    const refreshInMs = Math.max(expiresInSeconds - 30, 1) * 1000;
    this.refreshTimerSub = timer(refreshInMs).subscribe(() => {
      this.refreshToken().subscribe({ error: () => this.logout() });
    });
  }

  private getStorage(rememberMe: boolean): Storage {
    return rememberMe ? localStorage : sessionStorage;
  }

  private getStoredValue(key: string): string | null {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  }

  private hasToken(): boolean {
    return !!this.getStoredValue(ACCESS_TOKEN);
  }

  private clearStoredSession(): void {
    localStorage.removeItem(ACCESS_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
    localStorage.removeItem(ROLE);

    sessionStorage.removeItem(ACCESS_TOKEN);
    sessionStorage.removeItem(REFRESH_TOKEN);
    sessionStorage.removeItem(ROLE);
  }

  private cancelTimers(): void {
    if (this.tokenExpiryTimeout) {
      clearTimeout(this.tokenExpiryTimeout);
      this.tokenExpiryTimeout = undefined;
    }

    if (this.refreshTimerSub) {
      this.refreshTimerSub.unsubscribe();
      this.refreshTimerSub = undefined;
    }
  }
}
