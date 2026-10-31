import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, forkJoin, of, switchMap, tap } from 'rxjs';
import {
  AppUser,
  FestivalItem,
  FestivalMappingStatus,
  FestivalWishMapping,
  FestivalWishMappingSummary
} from '../../core/models/api.models';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { ApiService } from '../../core/services/api.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { SensitiveInfoToggleComponent } from '../../shared/sensitive-info-toggle.component';
import { MultiSelectFilterComponent, MultiSelectOption } from '../../shared/multi-select-filter.component';
import { startOfDay } from '../calendar/calendar.utils';
import {
  FestivalTiming,
  MappingStatus,
  addIds,
  bulkResultMessage,
  festivalTiming,
  filterUsers,
  lastSentLabel,
  pickableFestivals,
  removeIds,
  statusOf,
  toggleId
} from './festival-mappings.utils';

const SEARCH_DEBOUNCE_MS = 300;
const MAX_NOTE_LENGTH = 500;
const MAX_LOADED = 1000;

interface SortOption {
  id: string;
  label: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

@Component({
  selector: 'app-festival-wish-mappings',
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe, SensitiveInfoToggleComponent, MultiSelectFilterComponent],
  templateUrl: './festival-wish-mappings.component.html',
  styleUrl: './festival-wish-mappings.component.css'
})
export class FestivalWishMappingsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly today = startOfDay(new Date());
  readonly noteMaxLength = MAX_NOTE_LENGTH;
  readonly pageSizes = [10, 25, 50];
  readonly statusTabs: Array<{ id: FestivalMappingStatus; label: string }> = [
    { id: 'ALL', label: 'All' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'INACTIVE', label: 'Inactive' },
    { id: 'FAILED', label: 'Failed' }
  ];
  readonly sortOptions: SortOption[] = [
    { id: 'newest', label: 'Newest first', sortBy: 'id', sortDir: 'desc' },
    { id: 'festival', label: 'Festival A–Z', sortBy: 'festivalName', sortDir: 'asc' },
    { id: 'recipient', label: 'Recipient A–Z', sortBy: 'userName', sortDir: 'asc' },
    { id: 'lastSent', label: 'Recently sent', sortBy: 'lastWishSentOn', sortDir: 'desc' }
  ];

  // ---- dashboard
  mappings: FestivalWishMapping[] = [];
  summary: FestivalWishMappingSummary | null = null;
  search = '';
  status: FestivalMappingStatus = 'ALL';
  sortId = 'newest';
  size = 10;
  page = 0;
  totalElements = 0;
  totalPages = 1;
  loading = false;
  loadFailed = false;
  readonly togglingIds = new Set<number>();
  readonly deletingIds = new Set<number>();

  // ---- editor
  editorOpen = false;
  editingMapping: FestivalWishMapping | null = null;
  festivals: FestivalItem[] = [];
  users: AppUser[] = [];
  selectedFestivalIds: string[] = [];
  selectedFilterUserIds: string[] = [];
  festivalOptions: MultiSelectOption[] = [];
  filterUserOptions: MultiSelectOption[] = [];
  private filterValuesLoaded = false;
  referenceLoaded = false;
  referenceLoading = false;
  referenceFailed = false;
  showPastFestivals = false;
  selectedFestivalId: number | null = null;
  userQuery = '';
  selectedUserIds = new Set<number>();
  alreadyMappedIds = new Set<number>();
  loadingMapped = false;
  active = true;
  note = '';
  saving = false;

  // ---- image upload in editor
  selectedImageFile?: File;
  imagePreviewUrl?: string;
  imageError = '';

  // ---- image lightbox
  previewImage?: FestivalWishMapping;

  private readonly load$ = new Subject<number>();
  private readonly search$ = new Subject<string>();

  constructor() {
    this.load$
      .pipe(
        tap((page) => {
          this.page = page;
          this.loading = true;
          this.loadFailed = false;
        }),
        switchMap((page) => {
          const sort = this.sortOptions.find((option) => option.id === this.sortId) ?? this.sortOptions[0];
          const hasMulti = this.selectedFestivalIds.length > 0 || this.selectedFilterUserIds.length > 0;
          return this.api
            .festivalWishMappingsPaged(
              page,
              this.size,
              this.search.trim(),
              sort.sortBy,
              sort.sortDir,
              this.status,
              hasMulti ? this.selectedFestivalIds.map((id) => Number(id)) : undefined,
              hasMulti ? this.selectedFilterUserIds.map((id) => Number(id)) : undefined
            )
            .pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.loading = false;
        this.loadFailed = result === null;
        if (result) {
          this.mappings = result.content;
          this.totalElements = result.totalElements;
          this.totalPages = Math.max(1, result.totalPages);
        }
      });

    this.search$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(0));

    // The editor is part of the URL (?mode=editor), so the browser's back button closes it.
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.editorOpen = params.get('mode') === 'editor';
      if (this.editorOpen) {
        this.ensureReferenceData();
      } else {
        this.editingMapping = null;
      }
    });

    this.load(0);
    this.loadSummary();
    this.loadFilterValues();
  }

  loadFilterValues(): void {
    if (this.filterValuesLoaded) {
      return;
    }
    this.filterValuesLoaded = true;
    forkJoin({
      festivals: this.api.festivals(undefined, 0, 500),
      users: this.api.users(0, MAX_LOADED, '', 'name', 'asc')
    })
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;
        this.festivalOptions = (result.festivals ?? []).map((festival) => ({ value: String(festival.id), label: festival.eventName }));
        this.filterUserOptions = (result.users.content ?? []).map((user) => ({ value: String(user.id), label: user.name, hint: user.email }));
      });
  }

  onFestivalsChange(values: string[]): void {
    this.selectedFestivalIds = values;
    this.load(0);
  }

  onFilterUsersChange(values: string[]): void {
    this.selectedFilterUserIds = values;
    this.load(0);
  }

  // ------------------------------------------------------------------ dashboard

  load(page = this.page): void {
    this.load$.next(Math.max(0, page));
  }

  loadSummary(): void {
    this.api
      .festivalWishMappingSummary()
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((summary) => (this.summary = summary));
  }

  refresh(): void {
    this.load();
    this.loadSummary();
  }

  onSearchInput(value: string): void {
    this.search = value;
    this.search$.next(value.trim());
  }

  setStatus(status: FestivalMappingStatus): void {
    this.status = status;
    this.load(0);
  }

  onSortChange(id: string): void {
    this.sortId = id;
    this.load(0);
  }

  onPageSizeChange(size: number | string): void {
    this.size = Number(size);
    this.load(0);
  }

  get hasFilters(): boolean {
    return (
      this.search.trim().length > 0 ||
      this.status !== 'ALL' ||
      this.selectedFestivalIds.length > 0 ||
      this.selectedFilterUserIds.length > 0
    );
  }

  clearFilters(): void {
    this.search = '';
    this.status = 'ALL';
    this.selectedFestivalIds = [];
    this.selectedFilterUserIds = [];
    this.load(0);
  }

  get firstRow(): number {
    return this.totalElements ? this.page * this.size + 1 : 0;
  }

  get lastRow(): number {
    return Math.min((this.page + 1) * this.size, this.totalElements);
  }

  statusOf(mapping: FestivalWishMapping): MappingStatus {
    return statusOf(mapping);
  }

  statusLabel(mapping: FestivalWishMapping): string {
    switch (statusOf(mapping)) {
      case 'failed': return 'Failed';
      case 'inactive': return 'Inactive';
      default: return 'Active';
    }
  }

  timing(mapping: FestivalWishMapping): FestivalTiming {
    return festivalTiming(mapping.eventDate, this.today);
  }

  lastSent(mapping: FestivalWishMapping): string {
    return lastSentLabel(mapping.lastWishSentOn, this.today);
  }

  trackById(_: number, mapping: FestivalWishMapping): number {
    return mapping.id;
  }

  /** Switches a mapping on or off without opening the editor. */
  toggleActive(mapping: FestivalWishMapping): void {
    if (this.togglingIds.has(mapping.id)) {
      return;
    }
    this.togglingIds.add(mapping.id);
    this.api
      .saveFestivalWishMapping({
        specialEventId: mapping.specialEventId,
        userId: mapping.userId,
        active: !mapping.active,
        customMessage: mapping.customMessage ?? ''
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          mapping.active = saved.active;
          this.togglingIds.delete(mapping.id);
          this.loadSummary();
        },
        error: (error: HttpErrorResponse) => {
          this.togglingIds.delete(mapping.id);
          this.toast.error(error.error?.message || 'Unable to change the status right now.');
        }
      });
  }

  deleteMapping(mapping: FestivalWishMapping): void {
    this.confirmDialog
      .confirmDelete({ itemLabel: `the wish mapping for “${mapping.festivalName}” (${mapping.userName})` })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performDeleteMapping(mapping));
  }

  private performDeleteMapping(mapping: FestivalWishMapping): void {
    this.deletingIds.add(mapping.id);
    this.api
      .deleteFestivalWishMapping(mapping.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingIds.delete(mapping.id);
          this.toast.success('Festival wish mapping deleted.');
          // Step back a page when the last row of a later page was removed.
          this.load(this.mappings.length === 1 && this.page > 0 ? this.page - 1 : this.page);
          this.loadSummary();
        },
        error: () => {
          this.deletingIds.delete(mapping.id);
          this.toast.error('Unable to delete the mapping right now.');
        }
      });
  }

  // ------------------------------------------------------------------ editor: open / close

  openCreate(): void {
    this.clearEditorImage();
    this.editingMapping = null;
    this.selectedFestivalId = null;
    this.selectedUserIds = new Set();
    this.alreadyMappedIds = new Set();
    this.userQuery = '';
    this.active = true;
    this.note = '';
    this.showPastFestivals = false;
    this.navigateEditor(true);
  }

  openEdit(mapping: FestivalWishMapping): void {
    this.clearEditorImage();
    this.editingMapping = mapping;
    this.active = mapping.active;
    this.note = mapping.customMessage ?? '';
    if (mapping.imageUrl) {
      this.imagePreviewUrl = mapping.imageUrl;
    }
    this.navigateEditor(true);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.imageError = 'Unsupported image format. Use PNG, JPEG, GIF or WebP.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'File size exceeds 5 MB limit.';
      input.value = '';
      return;
    }
    this.imageError = '';
    this.clearEditorImagePreview();
    this.selectedImageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
  }

  removeSelectedImage(): void {
    this.clearEditorImage();
  }

  private clearEditorImagePreview(): void {
    if (this.imagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imagePreviewUrl = undefined;
  }

  private clearEditorImage(): void {
    this.clearEditorImagePreview();
    this.selectedImageFile = undefined;
    this.imageError = '';
  }

  closeEditor(): void {
    if (!this.saving) {
      this.navigateEditor(false);
    }
  }

  openImage(mapping: FestivalWishMapping): void {
    if (mapping.imageUrl) {
      this.previewImage = mapping;
    }
  }

  closeImage(): void {
    this.previewImage = undefined;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.previewImage) {
      this.closeImage();
      return;
    }
    if (this.editorOpen) {
      this.closeEditor();
    }
  }

  private navigateEditor(open: boolean): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { mode: open ? 'editor' : null }, queryParamsHandling: 'merge' });
  }

  // ------------------------------------------------------------------ editor: data

  get isEditing(): boolean {
    return this.editingMapping !== null;
  }

  get pickerFestivals(): FestivalItem[] {
    return pickableFestivals(this.festivals, this.today, this.showPastFestivals);
  }

  get selectedFestival(): FestivalItem | undefined {
    return this.festivals.find((festival) => festival.id === this.selectedFestivalId);
  }

  festivalTimingOf(festival: FestivalItem): FestivalTiming {
    return festivalTiming(festival.eventDate, this.today);
  }

  get visibleUsers(): AppUser[] {
    return filterUsers(this.users, this.userQuery);
  }

  /** Shown people who are not added to this festival yet, so "select all" never overwrites anyone. */
  get selectableVisibleIds(): number[] {
    return this.visibleUsers.filter((user) => !this.alreadyMappedIds.has(user.id)).map((user) => user.id);
  }

  get allVisibleSelected(): boolean {
    const ids = this.selectableVisibleIds;
    return ids.length > 0 && ids.every((id) => this.selectedUserIds.has(id));
  }

  get canSave(): boolean {
    return !this.saving && (this.isEditing || (this.selectedFestivalId !== null && this.selectedUserIds.size > 0));
  }

  get saveLabel(): string {
    if (this.saving) return 'Saving…';
    if (this.isEditing) return 'Save changes';
    const count = this.selectedUserIds.size;
    return count > 1 ? `Add ${count} recipients` : count === 1 ? 'Add 1 recipient' : 'Add recipients';
  }

  isSelected(userId: number): boolean {
    return this.selectedUserIds.has(userId);
  }

  isAlreadyMapped(userId: number): boolean {
    return this.alreadyMappedIds.has(userId);
  }

  toggleUser(userId: number): void {
    this.selectedUserIds = toggleId(this.selectedUserIds, userId);
  }

  toggleAllVisible(): void {
    const ids = this.selectableVisibleIds;
    this.selectedUserIds = this.allVisibleSelected ? removeIds(this.selectedUserIds, ids) : addIds(this.selectedUserIds, ids);
  }

  clearSelection(): void {
    this.selectedUserIds = new Set();
  }

  onFestivalChanged(): void {
    this.selectedUserIds = new Set();
    this.alreadyMappedIds = new Set();
    const festival = this.selectedFestival;
    if (!festival) {
      return;
    }
    // People who already have this festival: shown as "Already added" and left alone by default.
    this.loadingMapped = true;
    this.api
      .festivalWishMappingsPaged(0, MAX_LOADED, festival.eventName, 'id', 'desc', 'ALL')
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.loadingMapped = false;
        if (this.selectedFestivalId === festival.id && result) {
          this.alreadyMappedIds = new Set(result.content.filter((mapping) => mapping.specialEventId === festival.id).map((mapping) => mapping.userId));
        }
      });
  }

  retryReferenceData(): void {
    this.referenceLoaded = false;
    this.ensureReferenceData();
  }

  private ensureReferenceData(): void {
    if (this.referenceLoaded || this.referenceLoading) {
      return;
    }
    this.referenceLoading = true;
    this.referenceFailed = false;
    forkJoin({
      festivals: this.api.festivals(undefined, 0, 500),
      users: this.api.users(0, MAX_LOADED, '', 'name', 'asc')
    })
      .pipe(
        catchError(() => {
          this.referenceFailed = true;
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.referenceLoading = false;
        if (result) {
          this.festivals = result.festivals;
          this.users = result.users.content ?? [];
          this.referenceLoaded = true;
        }
      });
  }

  // ------------------------------------------------------------------ editor: save

  save(): void {
    if (!this.canSave) {
      return;
    }
    const note = this.note.trim();
    this.saving = true;

    if (this.editingMapping) {
      const mapping = this.editingMapping;
      if (this.selectedImageFile) {
        this.api
          .saveFestivalWishMappingWithImage(
            mapping.specialEventId,
            mapping.userId,
            this.active,
            note,
            this.selectedImageFile
          )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.onSaved('Festival wish mapping updated with image.'),
            error: (error: HttpErrorResponse) => this.onSaveFailed(error)
          });
      } else {
        this.api
          .saveFestivalWishMapping({ specialEventId: mapping.specialEventId, userId: mapping.userId, active: this.active, customMessage: note })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.onSaved('Festival wish mapping updated.'),
            error: (error: HttpErrorResponse) => this.onSaveFailed(error)
          });
      }
      return;
    }

    // Creating mappings
    if (this.selectedImageFile && this.selectedUserIds.size === 1) {
      const userId = Array.from(this.selectedUserIds)[0];
      this.api
        .saveFestivalWishMappingWithImage(
          this.selectedFestivalId as number,
          userId,
          this.active,
          note,
          this.selectedImageFile
        )
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.onSaved('Festival wish mapping created with custom image.'),
          error: (error: HttpErrorResponse) => this.onSaveFailed(error)
        });
      return;
    }

    const festival = this.selectedFestival;
    this.api
      .saveFestivalWishMappingsBulk({ specialEventId: this.selectedFestivalId as number, userIds: [...this.selectedUserIds], active: this.active, customMessage: note })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.onSaved(bulkResultMessage(result, festival?.eventName ?? 'Festival')),
        error: (error: HttpErrorResponse) => this.onSaveFailed(error)
      });
  }

  private onSaved(message: string): void {
    this.saving = false;
    this.toast.success(message);
    this.navigateEditor(false);
    this.refresh();
  }

  private onSaveFailed(error: HttpErrorResponse): void {
    this.saving = false;
    this.toast.error(error.error?.message || 'Unable to save the mapping right now.');
  }
}
