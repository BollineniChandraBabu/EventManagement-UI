import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  isSubmitting = false;

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    this.auth.sendResetLink(this.form.controls.email.value).subscribe({
      next: () => {
        this.toast.success('Reset link sent successfully. Please check your email.');
        this.isSubmitting = false;
      },
      error: () => {
        this.toast.error('We could not send the reset link right now. Please try again.');
        this.isSubmitting = false;
      }
    });
  }
}
