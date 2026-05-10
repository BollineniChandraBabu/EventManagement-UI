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
import { NotificationRealtimeService } from './core/services/notification-realtime.service';
import { NotificationItem, WishPreviewResponse } from './core/models/api.models';

const WISH_PREVIEW_SEEN_KEY = 'fw_wish_preview_seen_token';
const PUBLISHED_NOTIFICATION_DISMISSED_KEY = 'fw_published_notification_dismissed_id';

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
  private readonly notificationRealtime = inject(NotificationRealtimeService);

  isMobileMenuOpen = false;
  isSidebarCollapsed = false;
  isWishPreviewVisible = false;
  wishPreview?: WishPreviewResponse;
  activeNotification: NotificationItem | null = null;
  private scheduleStartTimerId: number | null = null;
  private scheduleEndTimerId: number | null = null;

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

      queueMicrotask(() => {
        this.api.getMyWishPreview()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (response) => {
                sessionStorage.setItem(WISH_PREVIEW_SEEN_KEY, token);
                this.wishPreview = response;
                this.isWishPreviewVisible = !!response.showMessage;
              }
            });
      });
    });

    this.notificationRealtime.connect();
    this.notificationRealtime.published$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((notification) => {
      this.consumeNotification(notification, true);
    });

    queueMicrotask(() => {
      this.fetchLatestPublishedNotification();
    });

    this.destroyRef.onDestroy(() => {
      this.clearScheduleStartTimer();
      this.clearScheduleEndTimer();
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
  closeNotificationBanner(): void {
    if (this.activeNotification?.id) {
      sessionStorage.setItem(PUBLISHED_NOTIFICATION_DISMISSED_KEY, String(this.activeNotification.id));
    }
    this.activeNotification = null;
  }

  private isNotificationDismissed(notificationId: number): boolean {
    return sessionStorage.getItem(PUBLISHED_NOTIFICATION_DISMISSED_KEY) === String(notificationId);
  }

  private consumeNotification(notification: NotificationItem | null, showToast: boolean): void {
    this.clearScheduleStartTimer();
    this.clearScheduleEndTimer();
    if (!notification || !notification.title || !notification.message || this.isNotificationDismissed(notification.id)) {
      this.activeNotification = null;
      return;
    }

    const start = this.parseDate(notification.scheduledFrom);
    const end = this.parseDate(notification.scheduledTo);
    const now = Date.now();

    if (end && now > end.getTime()) {
      this.activeNotification = null;
      return;
    }

    if (start && now < start.getTime()) {
      this.activeNotification = null;
      const delayMs = start.getTime() - now;
      this.scheduleStartTimerId = window.setTimeout(() => {
        this.activeNotification = notification;
        if (showToast) this.toast.info(`New notification: ${notification.title}`);
        this.scheduleNotificationHideAtEnd(notification);
      }, delayMs);
      return;
    }

    this.activeNotification = notification;
    if (showToast) this.toast.info(`New notification: ${notification.title}`);
    this.scheduleNotificationHideAtEnd(notification);
  }

  private clearScheduleStartTimer(): void {
    if (this.scheduleStartTimerId !== null) {
      window.clearTimeout(this.scheduleStartTimerId);
      this.scheduleStartTimerId = null;
    }
  }

  private clearScheduleEndTimer(): void {
    if (this.scheduleEndTimerId !== null) {
      window.clearTimeout(this.scheduleEndTimerId);
      this.scheduleEndTimerId = null;
    }
  }

  private scheduleNotificationHideAtEnd(notification: NotificationItem): void {
    const end = this.parseDate(notification.scheduledTo);
    if (!end) return;
    const delayMs = end.getTime() - Date.now();
    if (delayMs <= 0) {
      this.activeNotification = null;
      return;
    }
    this.scheduleEndTimerId = window.setTimeout(() => {
      if (this.activeNotification?.id === notification.id) {
        this.activeNotification = null;
      }
    }, delayMs);
  }

  private fetchLatestPublishedNotification(): void {
    this.api.latestPublishedNotification()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notification) => this.consumeNotification(notification, false)
      });
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
