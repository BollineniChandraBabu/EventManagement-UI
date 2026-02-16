import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ROLE_ADMIN, ROLE_USER, UserRole } from '../../core/constants/roles.constants';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './account-management.component.html',
  styleUrl: './account-management.component.css'
})
export class AccountManagementComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly accountMsg = signal('');
  readonly passwordMsg = signal('');
  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;

  readonly profileForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    role: [ROLE_USER as UserRole, [Validators.required]]
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
          fullName: profile.name ?? '',
          email: profile.email ?? '',
          role: profile.role
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

  logout(): void {
    this.auth.logout();
  }
}
