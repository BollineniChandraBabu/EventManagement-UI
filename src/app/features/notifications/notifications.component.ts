import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotificationItem } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  notifications: NotificationItem[] = [];
  loading = false;
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  searchKey = '';
  sortBy: 'createdAt' | 'title' | 'published' | 'publishedAt' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';

  constructor() { this.load(); }

  load(page = this.page): void {
    this.page = Math.max(0, page);
    this.loading = true;
    this.api.notificationsPaged(this.page, this.size, this.searchKey, this.sortBy, this.sortDir).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.notifications = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: () => { this.toast.error('Unable to load notifications right now.'); this.loading = false; }
    });
  }

  applySearch(): void {
    this.searchKey = this.searchKey.trim();
    this.load(0);
  }

  toggleSort(field: 'createdAt' | 'title' | 'published' | 'publishedAt'): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = field === 'title' ? 'asc' : 'desc';
    }

    this.load(0);
  }

  isSortedBy(field: 'createdAt' | 'title' | 'published' | 'publishedAt'): boolean {
    return this.sortBy === field;
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
