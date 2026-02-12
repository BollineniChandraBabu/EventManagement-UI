import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
    <h2>Reset Password</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
      <mat-form-field><mat-label>New Password</mat-label><input matInput type="password" formControlName="newPassword"></mat-form-field>
      <button mat-raised-button color="primary">Reset password</button>
    </form>
  </mat-card></div>`
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  form = this.fb.nonNullable.group({ newPassword: ['', Validators.required] });
  submit() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.auth.resetPassword(token, this.form.controls.newPassword.value).subscribe(() => this.router.navigate(['/login']));
  }
}
