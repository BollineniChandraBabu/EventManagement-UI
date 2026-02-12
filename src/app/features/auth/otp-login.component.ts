import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `<div class="page"><mat-card>
  <h2>OTP Login</h2>
  <form [formGroup]="form" class="form-grid">
    <mat-form-field><mat-label>Email</mat-label><input matInput formControlName="email"></mat-form-field>
    <mat-form-field><mat-label>OTP</mat-label><input matInput formControlName="otp"></mat-form-field>
    <button mat-button type="button" (click)="sendOtp()">Send OTP</button>
    <button mat-raised-button color="primary" type="button" (click)="verifyOtp()">Verify OTP</button>
  </form></mat-card></div>`
})
export class OtpLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], otp: ['', Validators.required] });

  sendOtp() { this.auth.sendOtp({ email: this.form.controls.email.value }).subscribe(); }
  verifyOtp() {
    this.auth.verifyOtp(this.form.getRawValue()).subscribe(() => this.router.navigate(['/dashboard']));
  }
}
