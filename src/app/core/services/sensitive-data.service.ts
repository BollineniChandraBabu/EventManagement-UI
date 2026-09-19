import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SensitiveDataService {
  /** Sensitive values are concealed unless the signed-in user explicitly reveals them. */
  readonly hidden = signal(true);

  toggle(): void {
    this.hidden.update((value) => !value);
  }

  maskEmail(email: string | null | undefined): string {
    if (!email || !this.hidden()) return email ?? '—';
    const at = email.indexOf('@');
    const local = at >= 0 ? email.slice(0, at) : email;
    const domain = at >= 0 ? email.slice(at) : '';
    const first = local.slice(0, 4);
    const tail = local.length > 10 ? local.slice(-6) : '';
    return `${first}****${tail}${domain}`;
  }

  mask(value: string | null | undefined): string {
    if (!value || !this.hidden()) return value ?? '—';
    return '••••••••';
  }
}
