import { Component, DestroyRef, effect, inject } from '@angular/core';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ImpersonationService } from './core/services/impersonation.service';
import { ToastContainerComponent } from './shared/toast-container.component';
import { LoadingOverlayComponent } from './shared/loading-overlay.component';
import { ChatWidgetComponent } from './shared/chat-widget/chat-widget.component';
import { ToastService } from './core/services/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from './core/services/api.service';
import { WishPreviewResponse } from './core/models/api.models';

const WISH_PREVIEW_SEEN_KEY = 'fw_wish_preview_seen_token';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent, LoadingOverlayComponent, ChatWidgetComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly impersonation = inject(ImpersonationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly api = inject(ApiService);
  readonly currentYear = new Date().getFullYear();
  private router = inject(Router);

  isMobileMenuOpen = false;
  isSidebarCollapsed = false;
  isWishPreviewVisible = false;
  wishPreview?: WishPreviewResponse;

  constructor() {
    effect(() => {
      if (!this.auth.authenticated()) {
        this.isWishPreviewVisible = false;
        this.wishPreview = undefined;
        return;
      }

      const token = this.auth.getAccessToken();
      if (!token || sessionStorage.getItem(WISH_PREVIEW_SEEN_KEY) === token) {
        return;
      }

      this.api.getMyWishPreview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response) => {
          sessionStorage.setItem(WISH_PREVIEW_SEEN_KEY, token);
          this.wishPreview = response;
          this.isWishPreviewVisible = !!response.showMessage;
        },
        error: () => {
          // Keep key unset so the app can retry later in this login session.
        }
      });
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  exitImpersonation(): void {
    this.auth.switchBackToAdmin().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.impersonation.stopImpersonation();
        this.closeMobileMenu();
        this.router.navigate(['/users']);
      },
      error: () => {
        this.toast.error('Unable to switch back to admin right now.');
      }
    });
  }

  closeWishPreview(): void {
    this.isWishPreviewVisible = false;
  }

  wishPreviewImage(): string | null {
    const imageData = this.wishPreview?.imageData;
    if (!imageData) {
      return null;
    }

    if (typeof imageData === 'string') {
      return imageData.startsWith('data:image')
        ? imageData
        : `data:image/png;base64,${imageData}`;
    }

    if (!imageData.length) {
      return null;
    }

    const binary = imageData.map((value) => String.fromCharCode(value)).join('');
    return `data:image/png;base64,${btoa(binary)}`;
  }
}
