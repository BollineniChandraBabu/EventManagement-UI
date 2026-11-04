import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LoadingService } from '../core/services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-overlay" *ngIf="loading.loading()" aria-live="polite" aria-busy="true">
      <div class="loading-card">
        <div class="spinner-border text-primary" role="status" aria-hidden="true"></div>
        <span>Loading data...</span>
      </div>
    </div>
  `,
  styles: [
    `
      .loading-overlay {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(18, 27, 49, 0.3);
        backdrop-filter: blur(2px);
        z-index: 1200;
      }

      .loading-card {
        display: inline-flex;
        gap: 0.75rem;
        align-items: center;
        background: var(--modal-bg);
        border: 1px solid var(--c-border);
        border-radius: var(--card-radius);
        padding: 0.85rem 1rem;
        box-shadow: var(--card-shadow-hover);
        font-weight: 500;
        color: var(--c-text);
      }
    `
  ]
})
export class LoadingOverlayComponent {
  readonly loading = inject(LoadingService);
}
