import { Component, inject } from '@angular/core';
import { SensitiveDataService } from '../core/services/sensitive-data.service';

@Component({
  selector: 'app-sensitive-info-toggle',
  standalone: true,
  template: `
    <button
      class="sensitive-info-toggle"
      type="button"
      (click)="toggle()"
      [class.is-revealed]="!sensitive.hidden()"
      [attr.aria-pressed]="!sensitive.hidden()"
      [attr.aria-label]="sensitive.hidden() ? 'Show sensitive information' : 'Hide sensitive information'">
      <span class="sensitive-info-toggle__icon" aria-hidden="true">
        <i class="fa-solid" [class.fa-eye]="sensitive.hidden()" [class.fa-eye-slash]="!sensitive.hidden()"></i>
      </span>
      <span class="sensitive-info-toggle__copy">
        <span class="sensitive-info-toggle__label">{{ sensitive.hidden() ? 'Sensitive data hidden' : 'Sensitive data visible' }}</span>
        <span class="sensitive-info-toggle__action">{{ sensitive.hidden() ? 'Show details' : 'Hide details' }}</span>
      </span>
    </button>
  `,
  styles: [`
    .sensitive-info-toggle { align-items:center; background:#fff; border:1px solid #cbd5e1; border-radius:999px; color:#334155; display:inline-flex; font:inherit; gap:.55rem; min-height:42px; padding:.34rem .78rem .34rem .38rem; text-align:left; transition:border-color .2s ease, box-shadow .2s ease, transform .2s ease; white-space:nowrap; }
    .sensitive-info-toggle:hover { border-color:#64748b; box-shadow:0 5px 14px rgba(15,23,42,.12); transform:translateY(-1px); }
    .sensitive-info-toggle:focus-visible { box-shadow:0 0 0 3px rgba(37,99,235,.25); outline:0; }
    .sensitive-info-toggle__icon { align-items:center; background:#e2e8f0; border-radius:50%; display:flex; height:31px; justify-content:center; transition:background .2s ease, color .2s ease; width:31px; }
    .sensitive-info-toggle__copy { display:flex; flex-direction:column; line-height:1.1; }
    .sensitive-info-toggle__label { font-size:.75rem; font-weight:700; }
    .sensitive-info-toggle__action { color:#64748b; font-size:.68rem; margin-top:.14rem; }
    .sensitive-info-toggle.is-revealed { border-color:#86efac; color:#166534; }
    .sensitive-info-toggle.is-revealed .sensitive-info-toggle__icon { background:#dcfce7; color:#15803d; }
    .sensitive-info-toggle.is-revealed .sensitive-info-toggle__action { color:#15803d; }
  `]
})
export class SensitiveInfoToggleComponent {
  readonly sensitive = inject(SensitiveDataService);
  toggle(): void { this.sensitive.toggle(); }
}
