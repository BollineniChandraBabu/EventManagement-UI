import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `<div class="page"><mat-card>
    <h2>Forgot Password</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
      <mat-form-field><mat-label>Email</mat-label><input matInput formControlName="email"></mat-form-field>
      <button mat-raised-button color="primary">Send reset link</button>
    </form>
  </mat-card></div>`
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  submit() { this.auth.sendResetLink(this.form.controls.email.value).subscribe(); }
}
