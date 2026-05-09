import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NotificationItem } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  notifications: NotificationItem[] = [];
  loading = false;

  constructor() { this.load(); }

  load(): void {
    this.loading = true;
    this.api.notifications().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => { this.notifications = items; this.loading = false; },
      error: () => { this.toast.error('Unable to load notifications right now.'); this.loading = false; }
    });
  }

  remove(item: NotificationItem): void {
    this.api.deleteNotification(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.toast.success('Notification deleted.'); this.load(); },
      error: () => this.toast.error('Unable to delete notification.')
    });
  }

  publish(item: NotificationItem): void {
    this.api.publishNotification(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.toast.success('Notification published for all users.'); this.load(); },
      error: () => this.toast.error('Unable to publish notification right now.')
    });
  }

  unpublish(item: NotificationItem): void {
    this.api.unpublishNotification(item.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.toast.success('Notification unpublished.'); this.load(); },
      error: () => this.toast.error('Unable to unpublish notification right now.')
    });
  }
}
