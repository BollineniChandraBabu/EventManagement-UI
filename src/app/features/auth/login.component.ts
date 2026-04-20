import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    google?: any;
  }
}

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

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [true]
  });

  showPassword = false;
  isSubmitting = false;
  readonly isGoogleSsoEnabled = !!environment.googleClientId;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(this.getLoginErrorMessage(error));
        this.isSubmitting = false;
      }
    });
  }

  ngOnInit(): void {
    if (!this.isGoogleSsoEnabled) {
      return;
    }

    this.ensureGoogleScriptLoaded()
      .then(() => this.initializeGoogleSso())
      .catch(() => this.toast.warning('Google sign-in is currently unavailable.'));
  }

  private ensureGoogleScriptLoaded(): Promise<void> {
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

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
    if (!window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential?: string }) => this.onGoogleCredential(response?.credential ?? '')
    });

    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-button'),
      { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular', text: 'signin_with' }
    );
  }

  private onGoogleCredential(idToken: string): void {
    if (!idToken) {
      this.toast.error('Google sign-in failed. Missing token.');
      return;
    }

    this.isSubmitting = true;
    this.auth.googleSsoLogin(idToken, this.form.controls.rememberMe.value).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.toast.error(this.getLoginErrorMessage(error));
        this.isSubmitting = false;
      }
    });
  }

  private getLoginErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error?.error?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }

    return 'Unable to login right now. Please try again.';
  }
}
