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
import { BulkSelection } from '../../shared/bulk-selection';
import { apiErrorMessage } from '../../core/utils/api-error';

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
  readonly selection = new BulkSelection();
  bulkDeleting = false;

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
        // Rows can only be ticked while they are on screen.
        this.selection.retainOnly(this.notifications.map((item) => item.id));
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

  // ------------------------------------------------------------ bulk delete

  get pageIds(): number[] {
    return this.notifications.map((item) => item.id);
  }

  get allSelected(): boolean {
    return this.selection.allSelected(this.pageIds);
  }

  toggleAll(): void {
    this.selection.toggleAll(this.pageIds);
  }

  /** True when every ticked row is still a draft; published ones cannot be deleted. */
  get canDeleteSelected(): boolean {
    const ids = new Set(this.selection.ids());
    return ids.size > 0 && this.notifications.filter((item) => ids.has(item.id)).every((item) => !item.published);
  }

  deleteSelected(): void {
    const ids = this.selection.ids();
    if (!ids.length || this.bulkDeleting) {
      return;
    }
    if (!this.canDeleteSelected) {
      this.toast.error('Published notifications cannot be deleted. Unpublish them first.');
      return;
    }
    this.confirmDialog
      .confirmDelete({ itemLabel: `${ids.length} selected ${ids.length === 1 ? 'notification' : 'notifications'}` })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performBulkDelete(ids));
  }

  private performBulkDelete(ids: number[]): void {
    this.bulkDeleting = true;
    this.api.deleteNotifications(ids).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.bulkDeleting = false;
        this.selection.clear();
        this.toast.success(`${ids.length} ${ids.length === 1 ? 'notification' : 'notifications'} deleted.`);
        this.load();
      },
      error: (error) => {
        this.bulkDeleting = false;
        this.toast.error(apiErrorMessage(error, 'Unable to delete the selected notifications right now.'));
      }
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
