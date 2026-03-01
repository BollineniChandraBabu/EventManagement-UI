import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subscription, tap, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, OtpRequest, OtpVerifyRequest, TokenResponse } from '../models/auth.models';
import { ROLE_ADMIN, ROLE_USER } from '../constants/roles.constants';
import { AppUser } from '../models/api.models';
import { ImpersonationService } from './impersonation.service';

const ACCESS_TOKEN = 'fw_access_token';
const REFRESH_TOKEN = 'fw_refresh_token';
const ROLE = 'fw_role';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly impersonation = inject(ImpersonationService);
  private readonly isAuthed = signal(this.hasToken());
  private readonly currentRole = signal(this.getStoredValue(ROLE) ?? ROLE_USER);
  private tokenExpiryTimeout?: ReturnType<typeof setTimeout>;
  private refreshTimerSub?: Subscription;

  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;
  readonly authenticated = computed(() => this.isAuthed());
  readonly role = computed(() => this.currentRole());

  /**
   * isAdmin returns false when impersonating a non-admin user so that all
   * admin-only sections are hidden, giving an accurate preview of what the
   * impersonated user sees. The underlying JWT is still the admin token so
   * all API calls succeed.
   */
  readonly isAdmin = computed(() => {
    if (this.impersonation.isImpersonating()) {
      return false;
    }
    return this.currentRole() === ROLE_ADMIN;
  });

  login(request: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap((res) => this.setSession(res, request.rememberMe))
    );
  }

  loginAsUser(email: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/admin/login-as-user`, { email }).pipe(
      tap((res) => this.setSession(res, this.shouldPersistSession()))
    );
  }

  switchBackToAdmin(): Observable<TokenResponse> {
    return this.http.get<TokenResponse>(`${environment.apiUrl}/auth/admin/switch-back`).pipe(
      tap((res) => this.setSession(res, this.shouldPersistSession()))
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

  resetPassword(email: string, token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/password-reset/confirm`, { email, token, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    });
  }

  getProfile(): Observable<AppUser> {
    return this.http.get<AppUser>(`${environment.apiUrl}/users/me`);
  }

  refreshToken(): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiUrl}/auth/refresh`, {
      refreshToken: localStorage.getItem(REFRESH_TOKEN)
    }).pipe(tap((res) => this.setSession(res, true)));
  }

  logout(): void {
    // If currently impersonating, stop impersonation first (return to admin)
    if (this.impersonation.isImpersonating()) {
      this.impersonation.stopImpersonation();
      this.router.navigate(['/dashboard']);
      return;
    }

    this.clearStoredSession();
    this.isAuthed.set(false);
    this.currentRole.set(ROLE_USER);
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
    this.currentRole.set(response.role);
    this.scheduleAutoLogout(response.expiresIn);
  }

  private scheduleAutoLogout(expiresInSeconds?: number): void {
    this.cancelTimers();

    if (!Number.isFinite(expiresInSeconds) || (expiresInSeconds ?? 0) <= 0) {
      return;
    }

    const validExpiry = expiresInSeconds as number;
    const expiryMs = validExpiry * 1000;
    this.tokenExpiryTimeout = setTimeout(() => this.logout(), expiryMs);

    const refreshInMs = Math.max(validExpiry - 30, 1) * 1000;
    this.refreshTimerSub = timer(refreshInMs).subscribe(() => {
      this.refreshToken().subscribe({ error: () => this.logout() });
    });
  }

  private getStorage(rememberMe: boolean): Storage {
    return rememberMe ? localStorage : sessionStorage;
  }

  private shouldPersistSession(): boolean {
    return localStorage.getItem(ACCESS_TOKEN) !== null;
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
