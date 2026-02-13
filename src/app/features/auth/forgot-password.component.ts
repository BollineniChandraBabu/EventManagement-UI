import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  isSubmitting = false;
  submitted = false;
  errorMessage = '';

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.submitted = false;
    this.isSubmitting = true;

    this.auth.sendResetLink(this.form.controls.email.value).subscribe({
      next: () => {
        this.submitted = true;
        this.isSubmitting = false;
      },
      error: () => {
        this.errorMessage = 'We could not send the reset link right now. Please try again.';
        this.isSubmitting = false;
      }
    });
  }
}
