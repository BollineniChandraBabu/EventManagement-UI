import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  templateUrl: './account-management.component.html',
  styleUrl: './account-management.component.css'
})
export class AccountManagementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly accountMsg = signal('');
  readonly passwordMsg = signal('');

  readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['']
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  constructor() {
    this.auth.getProfile().subscribe({
      next: (profile) => {
        this.profileForm.patchValue({
          fullName: profile.fullName ?? '',
          email: profile.email ?? '',
          phoneNumber: profile.phoneNumber ?? ''
        });
      },
      error: () => {
        this.accountMsg.set('Unable to fetch profile right now. You can still update details manually.');
      }
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.auth.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: () => this.accountMsg.set('Profile updated successfully.'),
      error: () => this.accountMsg.set('Unable to update profile. Please try again.')
    });
  }

  updatePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.passwordMsg.set('New password and confirmation do not match.');
      return;
    }

    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.passwordMsg.set('Password changed successfully.');
        this.passwordForm.reset();
      },
      error: () => this.passwordMsg.set('Could not change password. Please verify your current password.')
    });
  }
}
