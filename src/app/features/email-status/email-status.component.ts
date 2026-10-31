import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { EmailStatus } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { SensitiveInfoToggleComponent } from '../../shared/sensitive-info-toggle.component';
import { MultiSelectFilterComponent, MultiSelectOption } from '../../shared/multi-select-filter.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe, SensitiveInfoToggleComponent, MultiSelectFilterComponent],
  templateUrl: './email-status.component.html',
  styleUrl: './email-status.component.css'
})
export class EmailStatusComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  deletingIds = new Set<number>();
  readonly isAdmin = this.auth.isAdmin;
  readonly pageTitle: string;
  readonly emailTypeFilter: string;

  allItems: EmailStatus[] = [];
  viewItems: EmailStatus[] = [];

  filterText = '';
  selectedStatuses: string[] = [];
  selectedEmailTypes: string[] = [];
  statusOptions: MultiSelectOption[] = [];
  emailTypeOptions: MultiSelectOption[] = [];
  sortBy: 'id' | 'toEmail' | 'status' | 'sentAt' = 'id';
  sortDir: 'asc' | 'desc' = 'desc';
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  loading = false;
  selectedItem: EmailStatus | null = null;
  previewMode: 'desktop' | 'mobile' = 'desktop';
  isImageExpanded = false;
  imageState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';

  /** Object URLs of images already fetched, by email id (oldest first). */
  private readonly imageUrls = new Map<number, string>();
  private static readonly MAX_CACHED_IMAGES = 20;
  private imageRequestToken = 0;
  readonly previewFrom = 'Event Management <no-reply@eventmanagement.app>';

  constructor() {
    this.pageTitle = this.route.snapshot.data['title'] ?? 'Email Status';
    this.emailTypeFilter = (this.route.snapshot.data['emailType'] ?? '').toString();
    this.loadFilterValues();
    this.loadItems();
  }

  loadFilterValues(): void {
    this.api.getEmailStatusesFilterValues().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        if (res.statuses?.length) this.statusOptions = res.statuses.map((status) => ({ value: status, label: status }));
        if (res.emailTypes?.length) this.emailTypeOptions = res.emailTypes.map((type) => ({ value: type, label: type }));
      },
      error: () => {}
    });
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
    return Boolean(item.body?.trim() || item.hasImage);
  }

  get selectedImageUrl(): string | null {
    return this.selectedItem ? this.imageUrls.get(this.selectedItem.id) ?? null : null;
  }

  ngOnDestroy(): void {
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
    this.imageUrls.clear();
  }

  openPreview(item: EmailStatus): void {
    this.selectedItem = item;
    this.previewMode = 'desktop';
    this.isImageExpanded = false;
    this.imageState = 'idle';
    if (item.hasImage) {
      this.loadImage(item.id);
    }
  }

  retryImage(): void {
    if (this.selectedItem?.hasImage) {
      this.loadImage(this.selectedItem.id);
    }
  }

  setPreviewMode(mode: 'desktop' | 'mobile'): void {
    this.previewMode = mode;
  }

  closePreview(): void {
    this.selectedItem = null;
    this.isImageExpanded = false;
    this.imageRequestToken++; // ignore an image response that is still in flight
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

  onStatusesChange(values: string[]): void {
    this.selectedStatuses = values;
    this.page = 0;
    this.loadItems();
  }

  onEmailTypesChange(values: string[]): void {
    this.selectedEmailTypes = values;
    this.page = 0;
    this.loadItems();
  }

  toggleSort(field: typeof this.sortBy): void {
    this.sortDir = this.sortBy === field ? (this.sortDir === 'asc' ? 'desc' : 'asc') : 'asc';
    this.sortBy = field;
    this.page = 0;
    this.loadItems();
  }

  isSortedBy(field: typeof this.sortBy): boolean { return this.sortBy === field; }

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

    const statusesParam = this.selectedStatuses.length ? this.selectedStatuses : undefined;
    const emailTypesParam = this.selectedEmailTypes.length ? this.selectedEmailTypes : undefined;

    this.api.emailStatuses(
      this.page,
      this.pageSize,
      this.filterText,
      this.emailTypeFilter,
      this.sortBy,
      this.sortDir,
      statusesParam,
      emailTypesParam
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.allItems = response.content ?? [];
        this.viewItems = [...this.allItems];
        this.totalElements = response.totalElements ?? this.allItems.length;
        this.totalPages = response.totalPages ?? 0;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to fetch email status records.');
        this.loading = false;
      }
    });
  }

  private loadImage(id: number): void {
    if (this.imageUrls.has(id)) {
      this.imageState = 'ready';
      return;
    }
    const token = ++this.imageRequestToken;
    this.imageState = 'loading';
    this.api.emailImage(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (blob) => {
        this.rememberImage(id, URL.createObjectURL(blob));
        if (token === this.imageRequestToken) {
          this.imageState = 'ready';
        }
      },
      error: () => {
        if (token === this.imageRequestToken) {
          this.imageState = 'error';
        }
      }
    });
  }

  private rememberImage(id: number, url: string): void {
    this.imageUrls.set(id, url);
    if (this.imageUrls.size > EmailStatusComponent.MAX_CACHED_IMAGES) {
      const oldestId = this.imageUrls.keys().next().value as number;
      URL.revokeObjectURL(this.imageUrls.get(oldestId) as string);
      this.imageUrls.delete(oldestId);
    }
  }

  deleteEmail(id: number): void {
    this.confirmDialog
      .confirmDelete({ itemLabel: `${this.emailLabel(id)}`, detail: 'Any attached image is removed from storage as well.' })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performDeleteEmail(id));
  }

  private performDeleteEmail(id: number): void {
    this.deletingIds.add(id);
    this.api.deleteEmail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Email info deleted successfully.');
        this.deletingIds.delete(id);
        this.loadItems();
      },
      error: () => {
        this.toast.error('Unable to delete email info right now.');
        this.deletingIds.delete(id);
      }
    });
  }

  isDeleting(id: number): boolean {
    return this.deletingIds.has(id);
  }

  private emailLabel(id: number): string {
    const item = this.allItems.find((email) => email.id === id);
    return item?.subject ? `the email “${item.subject}”` : 'this email record';
  }
}
