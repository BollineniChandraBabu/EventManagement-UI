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
    <h2>Change Password</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
      <mat-form-field><mat-label>Current Password</mat-label><input matInput type="password" formControlName="currentPassword"></mat-form-field>
      <mat-form-field><mat-label>New Password</mat-label><input matInput type="password" formControlName="newPassword"></mat-form-field>
      <button mat-raised-button color="primary">Change Password</button>
    </form>
  </mat-card></div>`
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  form = this.fb.nonNullable.group({ currentPassword: ['', Validators.required], newPassword: ['', Validators.required] });
  submit() {
    this.auth.changePassword(this.form.controls.currentPassword.value, this.form.controls.newPassword.value).subscribe();
  }
}
