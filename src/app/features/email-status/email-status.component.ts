import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailStatus } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-status.component.html',
  styleUrl: './email-status.component.css'
})
export class EmailStatusComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  readonly isAdmin = this.auth.isAdmin;

  allItems: EmailStatus[] = [];
  viewItems: EmailStatus[] = [];

  filterText = '';
  filterStatus = 'ALL';
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  retryingIds = new Set<number>();
  selectedItem: EmailStatus | null = null;
  previewMode: 'desktop' | 'mobile' = 'desktop';
  isImageExpanded = false;
  readonly previewFrom = 'Event Management <no-reply@eventmanagement.app>';

  constructor() {
    this.loadItems();
  }

  get displayPage(): number {
    return this.page + 1;
  }

  get startRow(): number {
    if (this.totalElements === 0 || this.viewItems.length === 0) {
      return 0;
    }

    return this.page * this.pageSize + 1;
  }

  get endRow(): number {
    return this.viewItems.length === 0 ? 0 : this.startRow + this.viewItems.length - 1;
  }

  retry(id: number): void {
    if (!this.isAdmin()) {
      return;
    }

    this.retryingIds.add(id);
    this.api.retryEmail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Email retry requested successfully.');
        this.retryingIds.delete(id);
        this.loadItems();
      },
      error: () => {
        this.toast.error('Unable to retry email right now.');
        this.retryingIds.delete(id);
      }
    });
  }

  isRetrying(id: number): boolean {
    return this.retryingIds.has(id);
  }

  canPreview(item: EmailStatus): boolean {
    return Boolean(item.body?.trim() || item.imgData?.trim());
  }

  openPreview(item: EmailStatus): void {
    this.selectedItem = item;
    this.previewMode = 'desktop';
    this.isImageExpanded = false;
  }

  setPreviewMode(mode: 'desktop' | 'mobile'): void {
    this.previewMode = mode;
  }

  closePreview(): void {
    this.selectedItem = null;
    this.isImageExpanded = false;
  }

  openImagePreview(): void {
    this.isImageExpanded = true;
  }

  closeImagePreview(): void {
    this.isImageExpanded = false;
  }

  onSearch(value: string): void {
    this.filterText = value.trim();
    this.page = 0;
    this.loadItems();
  }

  onStatusFilter(value: string): void {
    this.filterStatus = value;
    this.applyStatusFilter();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.page = 0;
    this.loadItems();
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadItems();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadItems();
    }
  }

  private loadItems(): void {
    this.loading = true;
    this.allItems = [];
    this.viewItems = [];
    this.totalElements = 0;
    this.totalPages = 0;

    this.api.emailStatuses(this.page, this.pageSize, this.filterText).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.allItems = response.content ?? [];
        this.totalElements = response.totalElements ?? this.allItems.length;
        this.totalPages = response.totalPages ?? 0;

        this.allItems.forEach((item: EmailStatus) => {
          if (item.imgData?.trim() && !item.imgData.startsWith('data:image')) {
            item.imgData = `data:image/png;base64,${item.imgData}`;
          }
        });

        this.applyStatusFilter();
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to fetch email status records.');
        this.loading = false;
      }
    });
  }

  private applyStatusFilter(): void {
    if (this.filterStatus === 'ALL') {
      this.viewItems = [...this.allItems];
      return;
    }

    this.viewItems = this.allItems.filter((item) => item.status === this.filterStatus);
  }
}
