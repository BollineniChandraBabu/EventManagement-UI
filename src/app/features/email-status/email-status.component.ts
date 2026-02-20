import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailStatus } from '../../core/models/api.models';

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

    this.api.retryEmail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadItems());
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
    this.api.emailStatuses(this.page, this.pageSize, this.filterText).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response) => {
      this.allItems = response.content ?? [];
      this.totalElements = response.totalElements ?? this.allItems.length;
      this.totalPages = response.totalPages ?? 0;

      this.allItems.forEach((item: EmailStatus) => {
        if (item.imgData?.trim() && !item.imgData.startsWith('data:image')) {
          item.imgData = `data:image/png;base64,${item.imgData}`;
        }
      });

      this.applyStatusFilter();
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
