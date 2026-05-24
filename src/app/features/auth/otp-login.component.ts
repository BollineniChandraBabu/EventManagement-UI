import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './otp-login.component.html',
  styleUrl: './otp-login.component.css'
})
export class OtpLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  private readonly navState = (history.state ?? {}) as {
    email?: string;
    rememberMe?: boolean;
    loginLocation?: string;
    provider?: 'PASSWORD' | 'GOOGLE';
    mfaRequired?: boolean;
    ipAddress?: string;
    latitude?: number;
    longitude?: number;
  };

  form = this.fb.nonNullable.group({
    email: [this.navState.email ?? '', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]]
  });

  isSendingOtp = false;
  isVerifying = false;
  otpSent = false;

  ngOnInit(): void {
    if (this.navState.mfaRequired && this.form.controls.email.valid) {
      this.sendOtp();
    }
  }

  sendOtp() {
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }

    this.isSendingOtp = true;

    this.auth.sendOtp({ email: this.form.controls.email.value }).subscribe({
      next: () => {
        this.otpSent = true;
        this.toast.success('OTP sent. Please check your inbox.');
        this.isSendingOtp = false;
      },
      error: () => {
        this.toast.error('Unable to send OTP right now. Please try again in a moment.');
        this.isSendingOtp = false;
      }
    });
  }

  verifyOtp() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isVerifying = true;

    this.auth.verifyLoginOtp({
      email: this.form.controls.email.value,
      otp: this.form.controls.otp.value,
      rememberMe: this.navState.rememberMe ?? false,
      loginLocation: this.navState.loginLocation,
      provider: this.navState.provider,
      ipAddress: this.navState.ipAddress,
      latitude: this.navState.latitude,
      longitude: this.navState.longitude
    }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.toast.error('Invalid OTP. Please check the code and try again.');
        this.isVerifying = false;
      }
    });
  }
}
