import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AppUser, WishImage } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe],
  templateUrl: './wish-images.component.html',
  styleUrl: './wish-images.component.css'
})
export class WishImagesComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
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
  loading = false;
  saving = false;
  deletingIds = new Set<number>();
  editorOpen = false;
  editing?: WishImage;
  selectedFile?: File;
  previewUrl?: string;
  form = { eventType: '', userId: '', active: true };

  constructor() {
    this.loadImages();
    this.api.users(0, 1000, '', 'name', 'asc').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (result) => this.users = result.content ?? [] });
  }

  get startRow(): number { return this.totalElements ? this.page * this.pageSize + 1 : 0; }
  get endRow(): number { return Math.min((this.page + 1) * this.pageSize, this.totalElements); }

  search(): void { this.page = 0; this.loadImages(); }
  clearSearch(): void { this.filterText = ''; this.search(); }
  changePageSize(value: string): void { this.pageSize = Number(value); this.page = 0; this.loadImages(); }
  previousPage(): void { if (this.page) { this.page--; this.loadImages(); } }
  nextPage(): void { if (this.page + 1 < this.totalPages) { this.page++; this.loadImages(); } }

  openCreate(): void { this.editing = undefined; this.form = { eventType: '', userId: '', active: true }; this.selectedFile = undefined; this.previewUrl = undefined; this.editorOpen = true; }
  openEdit(image: WishImage): void { this.editing = image; this.form = { eventType: image.eventType, userId: image.userId ? String(image.userId) : '', active: image.active }; this.selectedFile = undefined; this.previewUrl = image.imageUrl; this.editorOpen = true; }
  closeEditor(): void { if (!this.saving) this.editorOpen = false; }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.toast.error('Please select an image file.'); return; }
    this.selectedFile = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  save(): void {
    const eventType = this.form.eventType.trim();
    if (!eventType) { this.toast.error('Event type is required.'); return; }
    if (!this.editing && !this.selectedFile) { this.toast.error('Please select an image to upload.'); return; }
    this.saving = true;
    const userId = this.form.userId ? Number(this.form.userId) : undefined;
    const request = this.editing
      ? this.api.updateWishImage(this.editing.id, eventType, this.form.active, userId, !userId, this.selectedFile)
      : this.api.createWishImage(this.selectedFile!, eventType, this.form.active, userId);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.toast.success(this.editing ? 'Wish image updated.' : 'Wish image uploaded.'); this.saving = false; this.editorOpen = false; this.loadImages(); },
      error: () => { this.toast.error('Unable to save the wish image right now.'); this.saving = false; }
    });
  }

  deleteImage(image: WishImage): void {
    if (!confirm(`Delete the ${image.eventType} wish image? This cannot be undone.`)) return;
    this.deletingIds.add(image.id);
    this.api.deleteWishImage(image.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.deletingIds.delete(image.id); this.toast.success('Wish image deleted.'); this.loadImages(); },
      error: () => { this.deletingIds.delete(image.id); this.toast.error('Unable to delete the wish image right now.'); }
    });
  }

  private loadImages(): void {
    this.loading = true;
    const active = this.activeFilter === 'ALL' ? undefined : this.activeFilter === 'ACTIVE';
    this.api.wishImages(this.page, this.pageSize, this.filterText.trim(), this.eventTypeFilter.trim(), undefined, active)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (result) => { this.images = result.content ?? []; this.totalElements = result.totalElements; this.totalPages = result.totalPages; this.loading = false; },
        error: () => { this.images = []; this.loading = false; this.toast.error('Unable to load wish images right now.'); }
      });
  }
}
