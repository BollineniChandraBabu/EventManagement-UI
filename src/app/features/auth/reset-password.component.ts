import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

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

  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  readonly emailFromQuery = this.route.snapshot.queryParamMap.get('email') ?? '';

  form = this.fb.nonNullable.group({
    email: [this.emailFromQuery, [Validators.required, Validators.email]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  isSubmitting = false;
  submitted = false;
  errorMessage = '';

  submit() {
    if (!this.token) {
      this.errorMessage = 'This reset link is missing a token. Please request a new reset email.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Password and confirm password must match.';
      return;
    }

    this.errorMessage = '';
    this.submitted = false;
    this.isSubmitting = true;

    this.auth.resetPassword(email, this.token, newPassword).subscribe({
      next: () => {
        this.submitted = true;
        this.isSubmitting = false;
        this.form.reset();

        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: () => {
        this.errorMessage = 'Reset link is invalid or expired. Please request a new reset email.';
        this.isSubmitting = false;
      }
    });
  }
}
