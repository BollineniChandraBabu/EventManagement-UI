import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AppUser, FestivalItem, FestivalWishMapping, SaveFestivalWishMappingPayload } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-festival-wish-mappings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './festival-wish-mappings.component.html',
  styleUrl: './festival-wish-mappings.component.css'
})
export class FestivalWishMappingsComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  festivals: FestivalItem[] = [];
  users: AppUser[] = [];
  mappings: FestivalWishMapping[] = [];

  loadingMappings = false;
  loadingFestivals = false;
  saving = false;
  deletingIds = new Set<number>();

  selectedMonth = new Date().getMonth() + 1;
  mode: 'dashboard' | 'editor' = 'dashboard';
  editingMappingId: number | null = null;

  form: SaveFestivalWishMappingPayload = {
    specialEventId: 0,
    userId: 0,
    active: true
  };

  readonly months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];

  constructor() {
    this.loadUsers();
    this.loadFestivals();
    this.loadMappings();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.mode = params.get('mode') === 'editor' ? 'editor' : 'dashboard';
    });
  }

  loadFestivals(): void {
    this.loadingFestivals = true;
    this.api.festivals(this.selectedMonth).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (festivals) => {
        this.festivals = (festivals ?? []).filter((festival) => festival.active !== false);

        const selectedFestivalExists = this.festivals.some((festival) => festival.id === this.form.specialEventId);
        this.form.specialEventId = selectedFestivalExists ? this.form.specialEventId : (this.festivals[0]?.id ?? 0);
        this.loadingFestivals = false;
      },
      error: () => {
        this.toast.error('Unable to load festivals right now.');
        this.loadingFestivals = false;
      }
    });
  }

  loadMappings(): void {
    this.loadingMappings = true;
    this.api.festivalWishMappings().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (mappings) => {
        this.mappings = mappings ?? [];
        this.loadingMappings = false;
      },
      error: () => {
        this.toast.error('Unable to load festival wish mappings right now.');
        this.loadingMappings = false;
      }
    });
  }

  onMonthChange(month: number): void {
    this.selectedMonth = Number(month);
    this.loadFestivals();
  }

  save(): void {
    if (!this.form.specialEventId || !this.form.userId) {
      this.toast.error('Please select both a festival and user.');
      return;
    }

    this.saving = true;
    const payload: SaveFestivalWishMappingPayload = { ...this.form };

    this.api.saveFestivalWishMapping(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success(this.editingMappingId ? 'Festival wish mapping updated successfully.' : 'Festival wish mapping saved successfully.');
        this.saving = false;
        this.resetForm();
        this.loadMappings();
        this.goToDashboardMode();
      },
      error: () => {
        this.toast.error('Unable to save festival wish mapping.');
        this.saving = false;
      }
    });
  }

  deleteMapping(mapping: FestivalWishMapping): void {
    this.deletingIds.add(mapping.id);
    this.api.deleteFestivalWishMapping(mapping.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Festival wish mapping deleted successfully.');
        this.deletingIds.delete(mapping.id);
        this.loadMappings();
      },
      error: () => {
        this.toast.error('Unable to delete mapping right now.');
        this.deletingIds.delete(mapping.id);
      }
    });
  }

  isDeleting(id: number): boolean {
    return this.deletingIds.has(id);
  }

  goToEditorMode(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: 'editor' },
      queryParamsHandling: 'merge'
    });
  }

  goToDashboardMode(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { mode: null },
      queryParamsHandling: 'merge'
    });
  }

  startCreate(): void {
    this.editingMappingId = null;
    this.resetForm();
    this.goToEditorMode();
  }

  startEdit(mapping: FestivalWishMapping): void {
    this.editingMappingId = mapping.id;
    this.form = {
      specialEventId: mapping.specialEventId,
      userId: mapping.userId,
      active: mapping.active
    };
    this.goToEditorMode();
  }

  private loadUsers(): void {
    this.api.users(0, 500, '', 'name', 'asc').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.users = response.content ?? [];
        const selectedUserExists = this.users.some((user) => user.id === this.form.userId);
        this.form.userId = selectedUserExists ? this.form.userId : (this.users[0]?.id ?? 0);
      },
      error: () => this.toast.error('Unable to load users right now.')
    });
  }

  private resetForm(): void {
    this.form = {
      specialEventId: this.festivals[0]?.id ?? 0,
      userId: this.users[0]?.id ?? 0,
      active: true
    };
  }
}
