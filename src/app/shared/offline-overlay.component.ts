import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { ConnectivityService } from '../core/services/connectivity.service';

/**
 * Full-screen notice shown while the device is offline.
 *
 * The moment connectivity returns the overlay switches to a short "You're back online" state and
 * then removes itself, so the user lands back on the page they were on.
 */
@Component({
  selector: 'app-offline-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="offline-backdrop" *ngIf="visible()" role="alertdialog" aria-modal="true"
         [attr.aria-label]="restored() ? 'Back online' : 'No internet connection'">
      <section class="offline-card" [class.offline-card--restored]="restored()">
        <div class="offline-icon" [class.offline-icon--restored]="restored()">
          <i class="fa-solid" [ngClass]="restored() ? 'fa-wifi' : 'fa-plug-circle-xmark'"></i>
        </div>

        <ng-container *ngIf="restored(); else offlineBody">
          <h2 class="offline-title">You're back online</h2>
          <p class="offline-text">Connection restored. Taking you back to where you left off…</p>
          <div class="offline-progress" aria-hidden="true"><span></span></div>
        </ng-container>

        <ng-template #offlineBody>
          <h2 class="offline-title">No internet connection</h2>
          <p class="offline-text">
            You appear to be offline. Check your Wi-Fi or mobile data — this page will pick up
            automatically as soon as you're reconnected.
          </p>
          <div class="offline-dots" aria-hidden="true"><span></span><span></span><span></span></div>
          <button class="btn btn-primary offline-retry" type="button" (click)="retry()"
                  [disabled]="connectivity.checking()">
            <i class="fa-solid fa-rotate-right me-2" [class.fa-spin]="connectivity.checking()"></i>
            {{ connectivity.checking() ? 'Checking…' : 'Retry now' }}
          </button>
        </ng-template>
      </section>
    </div>
  `,
  styles: [
    `
      .offline-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: grid;
        place-items: center;
        padding: 1.25rem;
        background: rgba(9, 14, 28, 0.72);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        animation: offline-fade 0.18s ease-out;
      }

      .offline-card {
        width: min(420px, 100%);
        background: var(--modal-bg);
        border: 1px solid var(--c-border);
        border-radius: var(--modal-radius, var(--card-radius));
        box-shadow: var(--modal-shadow, var(--card-shadow-hover));
        color: var(--c-text);
        padding: 2rem 1.5rem;
        text-align: center;
        animation: offline-pop 0.22s ease-out;
      }

      .offline-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 1rem;
        display: grid;
        place-items: center;
        border-radius: 50%;
        font-size: 1.6rem;
        color: #b45309;
        background: rgba(245, 158, 11, 0.16);
        border: 1px solid rgba(245, 158, 11, 0.35);
      }

      .offline-icon--restored {
        color: #047857;
        background: rgba(16, 185, 129, 0.16);
        border-color: rgba(16, 185, 129, 0.35);
      }

      .offline-title {
        font-size: 1.15rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }

      .offline-text {
        font-size: 0.9rem;
        line-height: 1.5;
        color: var(--c-text-secondary);
        margin: 0 0 1.1rem;
      }

      .offline-dots {
        display: flex;
        justify-content: center;
        gap: 0.4rem;
        margin-bottom: 1.1rem;
      }

      .offline-dots span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--c-primary);
        opacity: 0.35;
        animation: offline-bounce 1.1s infinite ease-in-out;
      }

      .offline-dots span:nth-child(2) { animation-delay: 0.15s; }
      .offline-dots span:nth-child(3) { animation-delay: 0.3s; }

      .offline-retry {
        width: 100%;
        max-width: 220px;
      }

      .offline-progress {
        height: 4px;
        border-radius: 999px;
        overflow: hidden;
        background: var(--c-surface-alt);
      }

      .offline-progress span {
        display: block;
        height: 100%;
        width: 100%;
        border-radius: 999px;
        background: #10b981;
        transform-origin: left center;
        animation: offline-fill 1.6s linear forwards;
      }

      @keyframes offline-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes offline-pop {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @keyframes offline-bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
        40% { transform: translateY(-5px); opacity: 1; }
      }

      @keyframes offline-fill {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
      }

      @media (prefers-reduced-motion: reduce) {
        .offline-backdrop, .offline-card, .offline-dots span, .offline-progress span {
          animation: none;
        }
      }
    `
  ]
})
export class OfflineOverlayComponent implements OnDestroy {
  readonly connectivity = inject(ConnectivityService);

  private readonly restoredState = signal(false);
  private restoreTimer?: ReturnType<typeof setTimeout>;
  private wasOnline = this.connectivity.online();

  /** True while either offline, or briefly after reconnecting to show the "back online" state. */
  readonly visible = computed(() => !this.connectivity.online() || this.restoredState());
  readonly restored = computed(() => this.restoredState());

  constructor() {
    // Watch for the moment connectivity returns and show the confirmation briefly. The signal
    // write is deferred to a microtask: writing signals directly inside an effect throws NG0600.
    effect(() => {
      const isOnline = this.connectivity.online();
      if (isOnline && !this.wasOnline) {
        queueMicrotask(() => this.showRestored());
      }
      this.wasOnline = isOnline;
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.restoreTimer);
  }

  retry(): void {
    this.connectivity.confirmOnline();
  }

  private showRestored(): void {
    this.restoredState.set(true);
    clearTimeout(this.restoreTimer);
    this.restoreTimer = setTimeout(() => this.restoredState.set(false), 1800);
  }
}
