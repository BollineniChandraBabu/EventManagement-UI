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
  private scheduledCandidate: NotificationItem | null = null;
  private scheduleIntervalId: number | null = null;

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
      this.fetchInitialNotification();
    });

    this.destroyRef.onDestroy(() => {
      if (this.scheduleIntervalId !== null) {
        window.clearInterval(this.scheduleIntervalId);
        this.scheduleIntervalId = null;
      }
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
    if (!notification || !notification.title || !notification.message || this.isNotificationDismissed(notification.id)) {
      this.scheduledCandidate = null;
      this.activeNotification = null;
      return;
    }

    this.scheduledCandidate = notification;
    this.evaluateScheduledCandidate(showToast);
    this.startScheduleInterval(showToast);
  }

  private startScheduleInterval(showToast: boolean): void {
    if (this.scheduleIntervalId !== null) {
      window.clearInterval(this.scheduleIntervalId);
    }
    this.scheduleIntervalId = window.setInterval(() => this.evaluateScheduledCandidate(showToast), 1000);
  }

  private evaluateScheduledCandidate(showToast: boolean): void {
    const notification = this.scheduledCandidate;
    if (!notification) {
      this.activeNotification = null;
      return;
    }

    const now = Date.now();
    const start = this.parseDate(notification.scheduledFrom)?.getTime();
    const end = this.parseDate(notification.scheduledTo)?.getTime();

    const inStartWindow = !start || now >= start;
    const inEndWindow = !end || now <= end;

    if (inStartWindow && inEndWindow) {
      const wasHidden = !this.activeNotification || this.activeNotification.id !== notification.id;
      this.activeNotification = notification;
      if (showToast && wasHidden) this.toast.info(`New notification: ${notification.title}`);
      return;
    }

    this.activeNotification = null;
    if (end && now > end) {
      this.scheduledCandidate = null;
      if (this.scheduleIntervalId !== null) {
        window.clearInterval(this.scheduleIntervalId);
        this.scheduleIntervalId = null;
      }
    }
  }

  private fetchInitialNotification(): void {
    this.api.latestPublishedNotification()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (notification) => {
          if (notification) {
            this.consumeNotification(notification, false);
            return;
          }
          this.loadPublishedNotificationFromCollection();
        },
        error: () => {
          this.loadPublishedNotificationFromCollection();
        }
      });
  }

  private loadPublishedNotificationFromCollection(): void {
    this.api.notifications()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const candidate = items
            .filter((item) => item.published && !!item.title && !!item.message)
            .filter((item) => {
              const end = this.parseDate(item.scheduledTo);
              return !end || end.getTime() > Date.now();
            })
            .sort((a, b) => {
              const aStart = this.parseDate(a.scheduledFrom)?.getTime() ?? 0;
              const bStart = this.parseDate(b.scheduledFrom)?.getTime() ?? 0;
              return bStart - aStart;
            })[0] ?? null;

          this.consumeNotification(candidate, false);
        }
      });
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
