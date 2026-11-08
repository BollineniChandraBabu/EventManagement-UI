import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

/**
 * Full-screen notice shown when the backend reports this session was replaced by a newer sign-in on
 * an account that allows only one session.
 *
 * It stays up until the user acts, so the reason is never missed. The only action is to sign out and
 * sign in again, which is what the backend requires to continue.
 */
@Component({
  selector: 'app-concurrent-login-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="concurrent-backdrop" *ngIf="auth.concurrentLoginNotice() as notice" role="alertdialog"
         aria-modal="true" aria-label="Signed in elsewhere">
      <section class="concurrent-card">
        <div class="concurrent-icon"><i class="fa-solid fa-right-from-bracket"></i></div>
        <h2 class="concurrent-title">Signed in on another device</h2>
        <p class="concurrent-text">{{ notice }}</p>
        <p class="concurrent-hint">
          For your security, only one session is allowed at a time. Sign in again to continue here.
        </p>
        <button class="btn btn-primary concurrent-action" type="button" (click)="signInAgain()">
          <i class="fa-solid fa-arrow-right-to-bracket me-2"></i>Sign out &amp; sign in again
        </button>
      </section>
    </div>
  `,
  styles: [
    `
      .concurrent-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2100;
        display: grid;
        place-items: center;
        padding: 1.25rem;
        background: rgba(9, 14, 28, 0.78);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        animation: concurrent-fade 0.18s ease-out;
      }

      .concurrent-card {
        width: min(440px, 100%);
        background: var(--modal-bg);
        border: 1px solid var(--c-border);
        border-radius: var(--modal-radius, var(--card-radius));
        box-shadow: var(--modal-shadow, var(--card-shadow-hover));
        color: var(--c-text);
        padding: 2rem 1.5rem;
        text-align: center;
        animation: concurrent-pop 0.22s ease-out;
      }

      .concurrent-icon {
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

      .concurrent-title {
        font-size: 1.15rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
      }

      .concurrent-text {
        font-size: 0.92rem;
        line-height: 1.5;
        color: var(--c-text);
        margin: 0 0 0.5rem;
      }

      .concurrent-hint {
        font-size: 0.85rem;
        line-height: 1.5;
        color: var(--c-text-secondary);
        margin: 0 0 1.25rem;
      }

      .concurrent-action {
        width: 100%;
        max-width: 280px;
      }

      @keyframes concurrent-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes concurrent-pop {
        from { opacity: 0; transform: translateY(8px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      @media (prefers-reduced-motion: reduce) {
        .concurrent-backdrop, .concurrent-card {
          animation: none;
        }
      }
    `
  ]
})
export class ConcurrentLoginOverlayComponent {
  readonly auth = inject(AuthService);

  signInAgain(): void {
    this.auth.logout();
  }
}
