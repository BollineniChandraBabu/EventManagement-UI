import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
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

  constructor() {
    this.auth.getProfile().subscribe({
      next: (profile) => {
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
}
