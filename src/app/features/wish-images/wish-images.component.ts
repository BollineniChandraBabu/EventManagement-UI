import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, OnDestroy, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, filter, forkJoin, of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AppUser, WishImage } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { SensitiveInfoToggleComponent } from '../../shared/sensitive-info-toggle.component';

/** Same limits as the server (only real PNG, JPEG, GIF or WebP images). */
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** "Festival" is used for every festival that has no image of its own. */
const GENERAL_EVENT_TYPES = ['Birthday', 'Anniversary', 'Festival'];

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe, SensitiveInfoToggleComponent],
  templateUrl: './wish-images.component.html',
  styleUrl: './wish-images.component.css'
})
export class WishImagesComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly toast = inject(ToastService);

  images: WishImage[] = [];
  users: AppUser[] = [];
  page = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  filterText = '';
  eventTypeFilter = '';
  activeFilter = 'ALL';
  sortBy: 'id' | 'eventType' | 'active' | 'createdAt' | 'updatedAt' = 'updatedAt';
  sortDir: 'asc' | 'desc' = 'desc';
  loading = false;
  saving = false;
  deletingIds = new Set<number>();
  editorOpen = false;
  editing?: WishImage;
  selectedFile?: File;
  previewUrl?: string;
  selectedImage: WishImage | null = null;
  eventTypeSuggestions: string[] = GENERAL_EVENT_TYPES;
  fileError = '';
  readonly imageHint = 'PNG, JPEG, GIF or WebP, up to 5 MB';
  readonly acceptedTypes = ALLOWED_IMAGE_TYPES.join(',');
  form = { eventType: '', userId: '', active: true };

  constructor() {
    this.loadImages();
    this.api.users(0, 1000, '', 'name', 'asc').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (result) => this.users = result.content ?? [] });
    this.loadEventTypeSuggestions();
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  get startRow(): number { return this.totalElements ? this.page * this.pageSize + 1 : 0; }
  get endRow(): number { return Math.min((this.page + 1) * this.pageSize, this.totalElements); }

  search(): void { this.page = 0; this.loadImages(); }
  clearSearch(): void { this.filterText = ''; this.search(); }
  changePageSize(value: string): void { this.pageSize = Number(value); this.page = 0; this.loadImages(); }
  toggleSort(field: typeof this.sortBy): void { this.sortDir = this.sortBy === field ? (this.sortDir === 'asc' ? 'desc' : 'asc') : 'asc'; this.sortBy = field; this.page = 0; this.loadImages(); }
  isSortedBy(field: typeof this.sortBy): boolean { return this.sortBy === field; }
  previousPage(): void { if (this.page) { this.page--; this.loadImages(); } }
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadImages(); } }

  openCreate(): void { this.releasePreview(); this.editing = undefined; this.form = { eventType: '', userId: '', active: true }; this.selectedFile = undefined; this.previewUrl = undefined; this.fileError = ''; this.editorOpen = true; }
  openEdit(image: WishImage): void { this.releasePreview(); this.editing = image; this.form = { eventType: image.eventType, userId: image.userId ? String(image.userId) : '', active: image.active }; this.selectedFile = undefined; this.previewUrl = image.imageUrl; this.fileError = ''; this.editorOpen = true; }
  closeEditor(): void { if (!this.saving) { this.editorOpen = false; this.releasePreview(); } }

  openImagePreview(image: WishImage): void { this.selectedImage = image; }
  closeImagePreview(): void { this.selectedImage = null; }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedImage) this.closeImagePreview();
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.fileError = this.validateFile(file);
    if (this.fileError) {
      input.value = ''; // so the same file can be chosen again after fixing it
      return;
    }
    this.releasePreview();
    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  /** Mirrors the server rules, so a bad file is explained before anything is uploaded. */
  private validateFile(file: File): string {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return `${file.name || 'This file'} is not supported. Use ${this.imageHint}.`;
    if (file.size > MAX_IMAGE_BYTES) return `The image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
    return '';
  }

  /** Object URLs keep the whole file in memory until they are released. */
  private releasePreview(): void {
    if (this.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = undefined;
  }

  private loadEventTypeSuggestions(): void {
    forkJoin({
      types: this.api.eventTypeSeeds().pipe(catchError(() => of([]))),
      festivals: this.api.festivals(undefined, 0, 500).pipe(catchError(() => of([])))
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ types, festivals }) => {
      const names = [...GENERAL_EVENT_TYPES, ...types.map((type) => type.displayName), ...festivals.map((festival) => festival.eventName)];
      const seen = new Set<string>();
      this.eventTypeSuggestions = names.filter((name) => {
        const key = (name ?? '').trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  }

  save(): void {
    const eventType = this.form.eventType.trim();
    if (!eventType) { this.toast.error('Event type is required.'); return; }
    if (eventType.length > 150) { this.toast.error('Event type must be at most 150 characters.'); return; }
    if (!this.editing && !this.selectedFile) { this.toast.error('Please select an image to upload.'); return; }
    this.saving = true;
    const userId = this.form.userId ? Number(this.form.userId) : undefined;
    const request = this.editing
      ? this.api.updateWishImage(this.editing.id, eventType, this.form.active, userId, !userId, this.selectedFile)
      : this.api.createWishImage(this.selectedFile!, eventType, this.form.active, userId);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.toast.success(this.editing ? 'Wish image updated.' : 'Wish image uploaded.'); this.saving = false; this.editorOpen = false; this.releasePreview(); this.loadImages(); },
      error: (error: HttpErrorResponse) => { this.toast.error(error.error?.message || 'Unable to save the wish image right now.'); this.saving = false; }
    });
  }

  deleteImage(image: WishImage): void {
    this.confirmDialog
      .confirmDelete({ itemLabel: `the ${image.eventType} wish image` })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performDeleteImage(image));
  }

  private performDeleteImage(image: WishImage): void {
    this.deletingIds.add(image.id);
    this.api.deleteWishImage(image.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.deletingIds.delete(image.id); this.toast.success('Wish image deleted.'); this.loadImages(); },
      error: () => { this.deletingIds.delete(image.id); this.toast.error('Unable to delete the wish image right now.'); }
    });
  }

  private loadImages(): void {
    this.loading = true;
    const active = this.activeFilter === 'ALL' ? undefined : this.activeFilter === 'ACTIVE';
    this.api.wishImages(this.page, this.pageSize, this.filterText.trim(), this.eventTypeFilter.trim(), undefined, active, this.sortBy, this.sortDir)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result) => { this.images = result.content ?? []; this.totalElements = result.totalElements; this.totalPages = result.totalPages; this.loading = false; },
        error: () => { this.images = []; this.loading = false; this.toast.error('Unable to load wish images right now.'); }
      });
  }
}
