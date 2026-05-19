import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, NgZone } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthSSOClientResponse } from '../../core/models/api.models';
import { LocationService } from '../../core/services/location.service';

declare global {
  interface Window {
    google?: any;
  }
}
const SSO_TOKEN: string = 'fw_sso_token';
@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private ngZone = inject(NgZone);
  private locationService = inject(LocationService);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [true]
  });

  showPassword = false;
  isSubmitting = false;
  isGoogleSsoEnabled = false;
  googleClientId: string = '';

  togglePasswordVisibility() { this.showPassword = !this.showPassword; }

  async submit() {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.isSubmitting = true;
    const loginLocation = await this.resolveLoginLocation();

    this.auth.login({ ...this.form.getRawValue(), loginLocation, forceMfa: true }).subscribe({
      next: () => { this.isSubmitting = false; this.router.navigate(['/dashboard']); },
      error: (error: HttpErrorResponse) => {
        if (this.handleMfaChallenge(error, loginLocation, 'PASSWORD')) return;
        this.toast.error(this.getLoginErrorMessage(error));
        this.isSubmitting = false;
      }
    });
  }

  ngOnInit(): void {
    const encryptedToken = localStorage.getItem(SSO_TOKEN);
    if (encryptedToken === null) {
      this.auth.googleSsoToken().subscribe({
        next: (value: AuthSSOClientResponse) => {
          localStorage.setItem(SSO_TOKEN, window.btoa(value.clientId));
          this.initiateGoogleSSO(value.clientId);
        },
        error: (error) => console.error('Failed to load OAuth config: ', error)
      });
    } else {
      this.initiateGoogleSSO(window.atob(encryptedToken));
    }
  }

  private initiateGoogleSSO(clientId: string): void {
    this.googleClientId = clientId;
    this.isGoogleSsoEnabled = clientId.trim() !== '';
    if (!this.isGoogleSsoEnabled) return;
    this.ensureGoogleScriptLoaded().then(() => this.initializeGoogleSso()).catch(() => this.toast.warning('Google sign-in is currently unavailable.'));
  }

  private ensureGoogleScriptLoaded(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['googleIdentity'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private initializeGoogleSso(): void {
    if (!window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: this.googleClientId,
      callback: (response: { credential?: string }) => this.onGoogleCredential(response?.credential ?? '')
    });
    window.google.accounts.id.renderButton(document.getElementById('google-signin-button'),
      { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular', text: 'signin_with' });
  }

  private onGoogleCredential(idToken: string): void {
    if (!idToken) return void this.toast.error('Google sign-in failed. Missing token.');
    this.isSubmitting = true;
    this.resolveLoginLocation().then((loginLocation) =>
      this.auth.googleSsoLogin(idToken, this.form.controls.rememberMe.value, loginLocation, true).subscribe({
        next: () => this.ngZone.run(() => { this.isSubmitting = false; this.router.navigate(['/dashboard']); }),
        error: (error: HttpErrorResponse) => this.ngZone.run(() => {
          if (this.handleMfaChallenge(error, loginLocation, 'GOOGLE')) return;
          this.toast.error(this.getLoginErrorMessage(error));
          this.isSubmitting = false;
        })
      })
    );
  }

  private async resolveLoginLocation(): Promise<string | undefined> {
    const location = await this.locationService.getUserLocation();
    if (!location) return undefined;
    return [location.city, location.region, location.country].filter(Boolean).join(', ') || undefined;
  }

  private handleMfaChallenge(error: HttpErrorResponse, loginLocation?: string, provider: 'PASSWORD' | 'GOOGLE' = 'PASSWORD'): boolean {
    const message = (error?.error?.message ?? '').toString();
    if (!message.includes('MFA_OTP_REQUIRED')) return false;
    this.router.navigate(['/otp-login'], { state: { email: this.form.controls.email.value, rememberMe: this.form.controls.rememberMe.value, loginLocation, provider, mfaRequired: true } });
    this.isSubmitting = false;
    this.toast.info('MFA verification required. Enter the code sent to your email.');
    return true;
  }

  private getLoginErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error?.error?.message;
    return typeof backendMessage === 'string' && backendMessage.trim() ? backendMessage : 'Unable to login right now. Please try again.';
  }
}
