import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './otp-login.component.html',
  styleUrl: './otp-login.component.css'
})
export class OtpLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]]
  });

  isSendingOtp = false;
  isVerifying = false;
  otpSent = false;
  errorMessage = '';

  sendOtp() {
    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSendingOtp = true;

    this.auth.sendOtp({ email: this.form.controls.email.value }).subscribe({
      next: () => {
        this.otpSent = true;
        this.isSendingOtp = false;
      },
      error: () => {
        this.errorMessage = 'Unable to send OTP right now. Please try again in a moment.';
        this.isSendingOtp = false;
      }
    });
  }

  verifyOtp() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isVerifying = true;

    this.auth.verifyOtp(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.errorMessage = 'Invalid OTP. Please check the code and try again.';
        this.isVerifying = false;
      }
    });
  }
}
