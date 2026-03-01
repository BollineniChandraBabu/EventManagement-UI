import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ImpersonationService } from '../../core/services/impersonation.service';
import { ROLE_ADMIN, ROLE_USER } from '../../core/constants/roles.constants';
import { ToastService } from '../../core/services/toast.service';

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
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly impersonation = inject(ImpersonationService);
  private readonly destroyRef = inject(DestroyRef);
  readonly ROLE_ADMIN = ROLE_ADMIN;
  readonly ROLE_USER = ROLE_USER;

  readonly profileForm = this.fb.nonNullable.group({
    fullName: [''],
    email: [''],
    role: [ROLE_USER]
  });

  readonly wishSettingsForm = this.fb.nonNullable.group({
    isBirthdayEnabled: [false],
    isGoodMorningEnabled: [false],
    isGoodNightEnabled: [false]
  });

  readonly changePasswordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  isChangingPassword = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor() {
    this.auth.getProfile().subscribe({
      next: (profile) => {
        // When impersonating, show the impersonated user's details
        if (this.impersonation.isImpersonating()) {
          const imp = this.impersonation.impersonatedUser()!;
          this.profileForm.patchValue({
            fullName: imp.name ?? '',
            email: imp.email ?? '',
            role: imp.role,
          });
          this.wishSettingsForm.patchValue({
            isBirthdayEnabled: !!imp.isBirthdayEnabled,
            isGoodMorningEnabled: !!imp.isGoodMorningEnabled,
            isGoodNightEnabled: !!imp.isGoodNightEnabled,
          });
          return;
        }

        this.profileForm.patchValue({
          fullName: profile.name ?? '',
          email: profile.email ?? '',
          role: profile.role,
        });
        this.wishSettingsForm.patchValue({
          isBirthdayEnabled: !!profile.isBirthdayEnabled,
          isGoodMorningEnabled: !!profile.isGoodMorningEnabled,
          isGoodNightEnabled: !!profile.isGoodNightEnabled,
        });
      },
      error: () => {
        this.toast.warning('Unable to fetch profile right now.');
      }
    });
  }

  saveWishSettings(): void {
    const payload = this.wishSettingsForm.getRawValue();
    this.api.updateWishSettings(payload).subscribe({
      next: () => this.toast.success('Wish settings updated successfully.'),
      error: () => this.toast.error('Unable to update wish settings. Please try again.')
    });
  }

  logout(): void {
    this.auth.logout();
  }

  returnToAdmin(): void {
    this.auth.switchBackToAdmin().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.impersonation.stopImpersonation();
        this.toast.success('Returned to admin account.');
      },
      error: () => {
        this.toast.error('Unable to switch back to admin right now.');
      }
    });
  }

  submitPasswordChange(): void {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.changePasswordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.toast.error('New password and confirm password must match.');
      return;
    }

    this.isChangingPassword = true;
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.toast.success('Password changed successfully.');
        this.changePasswordForm.reset();
        this.isChangingPassword = false;
      },
      error: () => {
        this.toast.error('Unable to change password. Please verify your current password and try again.');
        this.isChangingPassword = false;
      }
    });
  }

  togglePasswordVisibility(field: 'current' | 'new' | 'confirm'): void {
    if (field === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
      return;
    }

    if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
      return;
    }

    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
