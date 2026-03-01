import { Injectable, signal, computed } from '@angular/core';
import { AppUser } from '../models/api.models';

const IMPERSONATION_KEY = 'fw_impersonation';

@Injectable({ providedIn: 'root' })
export class ImpersonationService {
  private readonly _impersonatedUser = signal<AppUser | null>(this.loadStored());

  readonly impersonatedUser = computed(() => this._impersonatedUser());
  readonly isImpersonating = computed(() => this._impersonatedUser() !== null);

  startImpersonation(user: AppUser): void {
    sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(user));
    this._impersonatedUser.set(user);
  }

  stopImpersonation(): void {
    sessionStorage.removeItem(IMPERSONATION_KEY);
    this._impersonatedUser.set(null);
  }

  private loadStored(): AppUser | null {
    const stored = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as AppUser;
    } catch {
      return null;
    }
  }
}
