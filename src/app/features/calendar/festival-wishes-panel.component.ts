import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { AppUser, FestivalWishMapping } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { MediaPreviewKind, mediaError, previewKindFor } from '../../core/utils/media';
import { WISHES_URL_MAX_LENGTH, wishesUrlError } from '../../core/utils/wishes-url';
import { startOfDay } from './calendar.utils';
import { filterUsers, lastSentLabel, statusOf } from '../festival-wish-mappings/festival-mappings.utils';

const MAX_LOADED = 1000;
const MAX_NOTE_LENGTH = 500;

/**
 * Festival wish mappings for one festival, shown inside the calendar's festival dialog. Admins can
 * link people, change their note/link/status or remove them; everyone else sees their own wish.
 */
@Component({
  selector: 'app-festival-wishes-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './festival-wishes-panel.component.html',
  styleUrl: './festival-wishes-panel.component.css'
})
export class FestivalWishesPanelComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) festivalId!: number;
  @Input() festivalName = '';

  readonly isAdmin = this.auth.isAdmin;
  readonly today = startOfDay(new Date());
  readonly noteMaxLength = MAX_NOTE_LENGTH;
  readonly wishesUrlMaxLength = WISHES_URL_MAX_LENGTH;

  mappings: FestivalWishMapping[] = [];
  loading = false;
  failed = false;

  users: AppUser[] = [];
  usersLoaded = false;
  usersFailed = false;
  userQuery = '';
  readonly newUserIds = new Set<number>();
  adding = false;

  editingId: number | null = null;
  editActive = true;
  editNote = '';
  editWishesUrl = '';
  editImage?: File;
  editImageError = '';
  savingEdit = false;

  readonly togglingIds = new Set<number>();
  readonly deletingIds = new Set<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['festivalId']) {
      this.resetEditor();
      this.newUserIds.clear();
      this.userQuery = '';
      this.reload();
      if (this.isAdmin()) {
        this.ensureUsers();
      }
    }
  }

  // ------------------------------------------------------------------ loading

  reload(): void {
    this.loading = true;
    this.failed = false;
    const request = this.isAdmin()
      ? this.api.festivalWishMappingsPaged(0, MAX_LOADED, '', 'id', 'desc', 'ALL', [this.festivalId])
      : this.api.myFestivalWishMappings(0, MAX_LOADED);
    request.pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef)).subscribe((result) => {
      this.loading = false;
      if (result === null) {
        this.failed = true;
        return;
      }
      this.mappings = result.content.filter((mapping) => mapping.specialEventId === this.festivalId);
    });
  }

  private ensureUsers(): void {
    if (this.usersLoaded) {
      return;
    }
    this.api
      .users(0, MAX_LOADED, '', 'name', 'asc')
      .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === null) {
          this.usersFailed = true;
          return;
        }
        this.users = result.content ?? [];
        this.usersLoaded = true;
      });
  }

  retry(): void {
    this.reload();
    if (this.isAdmin() && !this.usersLoaded) {
      this.usersFailed = false;
      this.ensureUsers();
    }
  }

  // ------------------------------------------------------------------ read-only info

  get myMapping(): FestivalWishMapping | undefined {
    return this.mappings[0];
  }

  get activeCount(): number {
    return this.mappings.filter((mapping) => mapping.active).length;
  }

  statusOf(mapping: FestivalWishMapping): string {
    return statusOf(mapping);
  }

  lastSent(mapping: FestivalWishMapping): string {
    return lastSentLabel(mapping.lastWishSentOn, this.today);
  }

  mediaKindFor(url: string | null | undefined): MediaPreviewKind {
    return previewKindFor(null, url);
  }

  // ------------------------------------------------------------------ link people

  get mappedUserIds(): Set<number> {
    return new Set(this.mappings.map((mapping) => mapping.userId));
  }

  /** People who can still be linked to this festival, filtered by the search box. */
  get availableUsers(): AppUser[] {
    const mapped = this.mappedUserIds;
    return filterUsers(this.users, this.userQuery).filter((user) => !mapped.has(user.id));
  }

  get allAvailableSelected(): boolean {
    const ids = this.availableUsers.map((user) => user.id);
    return ids.length > 0 && ids.every((id) => this.newUserIds.has(id));
  }

  isNewSelected(userId: number): boolean {
    return this.newUserIds.has(userId);
  }

  toggleNewUser(userId: number): void {
    if (this.newUserIds.has(userId)) {
      this.newUserIds.delete(userId);
    } else {
      this.newUserIds.add(userId);
    }
  }

  toggleAllAvailable(): void {
    const ids = this.availableUsers.map((user) => user.id);
    if (this.allAvailableSelected) {
      this.newUserIds.clear();
      return;
    }
    this.newUserIds.clear();
    ids.forEach((id) => this.newUserIds.add(id));
  }

  addSelected(): void {
    const userIds = [...this.newUserIds];
    if (!userIds.length || this.adding) {
      return;
    }
    this.adding = true;
    this.api
      .saveFestivalWishMappingsBulk({ specialEventId: this.festivalId, userIds, active: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.adding = false;
          this.newUserIds.clear();
          const parts: string[] = [];
          if (result.created > 0) parts.push(`${result.created} added`);
          if (result.updated > 0) parts.push(`${result.updated} updated`);
          this.toast.success(`${this.festivalName}: ${parts.join(', ') || 'nothing changed'}.`);
          this.reload();
        },
        error: (error: HttpErrorResponse) => {
          this.adding = false;
          this.toast.error(apiErrorMessage(error, 'Unable to link the selected people right now.'));
        }
      });
  }

  // ------------------------------------------------------------------ edit a mapping

  startEdit(mapping: FestivalWishMapping): void {
    this.editingId = mapping.id;
    this.editActive = mapping.active;
    this.editNote = mapping.customMessage ?? '';
    this.editWishesUrl = mapping.wishesUrl ?? '';
    this.editImage = undefined;
    this.editImageError = '';
  }

  cancelEdit(): void {
    this.resetEditor();
  }

  private resetEditor(): void {
    this.editingId = null;
    this.editImage = undefined;
    this.editImageError = '';
  }

  get editWishesUrlMessage(): string | null {
    return wishesUrlError(this.editWishesUrl);
  }

  get canSaveEdit(): boolean {
    return !this.savingEdit && !this.editWishesUrlMessage;
  }

  onEditImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const error = mediaError(file);
    if (error) {
      this.editImageError = error;
      input.value = '';
      return;
    }
    this.editImageError = '';
    this.editImage = file;
  }

  clearEditImage(): void {
    this.editImage = undefined;
    this.editImageError = '';
  }

  saveEdit(mapping: FestivalWishMapping): void {
    if (!this.canSaveEdit) {
      return;
    }
    const note = this.editNote.trim();
    const wishesUrl = this.editWishesUrl.trim();
    this.savingEdit = true;
    this.api
      .saveFestivalWishMappingWithImage(mapping.specialEventId, mapping.userId, this.editActive, note, this.editImage, wishesUrl)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingEdit = false;
          this.resetEditor();
          this.toast.success('Festival wish updated.');
          this.reload();
        },
        error: (error: HttpErrorResponse) => {
          this.savingEdit = false;
          this.toast.error(apiErrorMessage(error, 'Unable to save the wish right now.'));
        }
      });
  }

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
        customMessage: mapping.customMessage ?? '',
        wishesUrl: mapping.wishesUrl ?? ''
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          mapping.active = saved.active;
          this.togglingIds.delete(mapping.id);
        },
        error: (error: HttpErrorResponse) => {
          this.togglingIds.delete(mapping.id);
          this.toast.error(apiErrorMessage(error, 'Unable to change the status right now.'));
        }
      });
  }

  remove(mapping: FestivalWishMapping): void {
    this.confirmDialog
      .confirmDelete({ itemLabel: `the wish for ${mapping.userName}`, detail: 'Any uploaded media for it is removed from storage as well.' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.performRemove(mapping);
        }
      });
  }

  private performRemove(mapping: FestivalWishMapping): void {
    this.deletingIds.add(mapping.id);
    this.api
      .deleteFestivalWishMapping(mapping.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deletingIds.delete(mapping.id);
          this.toast.success('Festival wish removed.');
          this.reload();
        },
        error: () => {
          this.deletingIds.delete(mapping.id);
          this.toast.error('Unable to remove the wish right now.');
        }
      });
  }

  trackById(_: number, mapping: FestivalWishMapping): number {
    return mapping.id;
  }

  trackByUser(_: number, user: AppUser): number {
    return user.id;
  }
}
