import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NotificationItem } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { MultiSelectFilterComponent, MultiSelectOption } from '../../shared/multi-select-filter.component';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MultiSelectFilterComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);

  notifications: NotificationItem[] = [];
  loading = false;
  page = 0;
  size = 10;
  totalElements = 0;
  totalPages = 0;
  searchKey = '';
  sortBy: 'createdAt' | 'title' | 'published' | 'publishedAt' = 'createdAt';
  sortDir: 'asc' | 'desc' = 'desc';
  selectedStatuses: string[] = [];
  readonly statusOptions: MultiSelectOption[] = [
    { value: 'true', label: 'Published' },
    { value: 'false', label: 'Draft' }
  ];

  constructor() { this.load(); }

  onStatusesChange(values: string[]): void {
    this.selectedStatuses = values;
    this.load(0);
  }

  load(page = this.page): void {
    this.page = Math.max(0, page);
    this.loading = true;
    const publishedParam = this.selectedStatuses.length === 1 ? this.selectedStatuses[0] === 'true' : undefined;
    this.api.notificationsPaged(this.page, this.size, this.searchKey, this.sortBy, this.sortDir, publishedParam).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    this.confirmDialog
      .confirmDelete({ itemLabel: `the notification “${item.title}”` })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performRemove(item));
  }

  private performRemove(item: NotificationItem): void {
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
