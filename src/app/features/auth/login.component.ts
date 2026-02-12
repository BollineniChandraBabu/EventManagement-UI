import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSlideToggleModule],
  template: `
  <div class="page"><mat-card>
    <h2>Login</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
      <mat-form-field><mat-label>Email</mat-label><input matInput formControlName="email"></mat-form-field>
      <mat-form-field><mat-label>Password</mat-label><input matInput type="password" formControlName="password"></mat-form-field>
      <mat-slide-toggle formControlName="rememberMe">Remember Me</mat-slide-toggle>
      <button mat-raised-button color="primary">Login</button>
      <a mat-button routerLink="/otp-login">OTP Login</a>
      <a mat-button routerLink="/forgot-password">Forgot Password</a>
    </form>
  </mat-card></div>`
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [true]
  });

  submit() {
    if (this.form.invalid) return;
    this.auth.login(this.form.getRawValue()).subscribe(() => this.router.navigate(['/dashboard']));
  }
}
