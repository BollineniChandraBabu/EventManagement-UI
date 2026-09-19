import { Component, inject } from '@angular/core';
import { SensitiveDataService } from '../core/services/sensitive-data.service';

@Component({
  selector: 'app-sensitive-info-toggle',
  standalone: true,
  template: `<button class="btn btn-outline-secondary sensitive-info-toggle" type="button" (click)="toggle()" [attr.aria-pressed]="!sensitive.hidden()" [attr.aria-label]="sensitive.hidden() ? 'Show sensitive information' : 'Hide sensitive information'"><i class="fa-solid me-1" [class.fa-eye]="sensitive.hidden()" [class.fa-eye-slash]="!sensitive.hidden()"></i>{{ sensitive.hidden() ? 'Show sensitive info' : 'Hide sensitive info' }}</button>`,
  styles: [`.sensitive-info-toggle{white-space:nowrap}`]
})
export class SensitiveInfoToggleComponent {
  readonly sensitive = inject(SensitiveDataService);
  toggle(): void { this.sensitive.toggle(); }
}
