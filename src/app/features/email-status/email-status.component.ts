import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailStatus } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './email-status.component.html',
  styleUrl: './email-status.component.css'
})
export class EmailStatusComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly isAdmin = this.auth.isAdmin;
  readonly pageTitle: string;
  readonly emailTypeFilter: string;

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
  selectedItem: EmailStatus | null = null;
  previewMode: 'desktop' | 'mobile' = 'desktop';
  isImageExpanded = false;
  readonly previewFrom = 'Event Management <no-reply@eventmanagement.app>';

  constructor() {
    this.pageTitle = this.route.snapshot.data['title'] ?? 'Email Status';
    this.emailTypeFilter = (this.route.snapshot.data['emailType'] ?? '').toString();
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

  onSearchInput(value: string): void {
    const previousFilter = this.filterText;
    this.filterText = value;

    if (previousFilter.trim() && !this.filterText.trim()) {
      this.applySearch();
    }
  }

  clearSearch(): void {
    if (!this.filterText) {
      return;
    }

    this.filterText = '';
    this.applySearch();
  }

  applySearch(): void {
    this.filterText = this.filterText.trim();
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

    this.api.emailStatuses(this.page, this.pageSize, this.filterText, this.emailTypeFilter).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const typeFiltered = this.emailTypeFilter
      ? this.allItems.filter((item) => this.isSameEmailType(item.emailType, this.emailTypeFilter))
      : [...this.allItems];

    if (this.filterStatus === 'ALL') {
      this.viewItems = typeFiltered;
      return;
    }

    this.viewItems = typeFiltered.filter((item) => item.status === this.filterStatus);
  }

  private isSameEmailType(actualType: string | undefined, expectedType: string): boolean {
    if (!actualType) {
      return false;
    }

    const normalizedActual = actualType.replace(/[-_\s]/g, '').toUpperCase();
    const normalizedExpected = expectedType.replace(/[-_\s]/g, '').toUpperCase();

    return normalizedActual === normalizedExpected;
  }
}
