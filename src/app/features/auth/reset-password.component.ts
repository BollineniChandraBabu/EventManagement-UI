import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly emailFromQuery = this.route.snapshot.queryParamMap.get('email') ?? '';

  form = this.fb.nonNullable.group({
    email: [this.emailFromQuery, [Validators.required, Validators.email]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  isSubmitting = false;

  constructor() {
    if (!this.token) {
      this.toast.warning('Reset token not found. Open the reset link from your email again.');
    }
  }

  submit() {
    if (!this.token) {
      this.toast.error('This reset link is missing a token. Please request a new reset email.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.toast.error('Password and confirm password must match.');
      return;
    }

    this.isSubmitting = true;

    this.auth.resetPassword(email, this.token, newPassword).subscribe({
      next: () => {
        this.toast.success('Password reset successfully. Redirecting to login...');
        this.isSubmitting = false;
        this.form.reset();

        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: () => {
        this.toast.error('Reset link is invalid or expired. Please request a new reset email.');
        this.isSubmitting = false;
      }
    });
  }
}
