import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { EventItem } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import {AuthService} from "../../core/services/auth.service";
import { MultiSelectFilterComponent, MultiSelectOption } from '../../shared/multi-select-filter.component';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MultiSelectFilterComponent],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly auth = inject(AuthService);
  readonly isAdmin = this.auth.isAdmin;
  events: EventItem[] = [];
  viewEvents: EventItem[] = [];
  eventTypeOptions: MultiSelectOption[] = [];
  userOptions: MultiSelectOption[] = [];
  filterText = '';
  selectedEventTypes: string[] = [];
  selectedUserIds: string[] = [];
  selectedStatuses: string[] = [];
  readonly statusOptions: MultiSelectOption[] = [
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' }
  ];
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  sortBy = 'eventDate';
  sortDir: 'asc' | 'desc' = 'desc';
  loading = false;
  deletingIds = new Set<number>();

  constructor() {
    this.loadEventTypeOptions();
    this.loadEvents();
  }

  get displayPage(): number {
    return this.page + 1;
  }

  get startRow(): number {
    if (this.totalElements === 0 || this.viewEvents.length === 0) {
      return 0;
    }

    return this.page * this.pageSize + 1;
  }

  get endRow(): number {
    return this.viewEvents.length === 0 ? 0 : this.startRow + this.viewEvents.length - 1;
  }

  loadEvents(): void {
    this.loading = true;
    const eventTypesParam = this.selectedEventTypes.length ? this.selectedEventTypes : undefined;
    const userIdsParam = this.selectedUserIds.length ? this.selectedUserIds.map((id) => Number(id)) : undefined;
    const activeParam = this.selectedStatuses.length === 1 ? this.selectedStatuses[0] === 'true' : undefined;

    this.api.events(
      this.page,
      this.pageSize,
      this.filterText,
      this.sortBy,
      this.sortDir,
      eventTypesParam,
      userIdsParam,
      activeParam
    ).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.events = response.content ?? [];
        this.viewEvents = [...this.events];
        this.totalElements = response.totalElements ?? this.events.length;
        this.totalPages = response.totalPages ?? 0;
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load events right now.');
        this.loading = false;
      }
    });
  }

  onEventTypesChange(values: string[]): void {
    this.selectedEventTypes = values;
    this.page = 0;
    this.loadEvents();
  }

  onUsersChange(values: string[]): void {
    this.selectedUserIds = values;
    this.page = 0;
    this.loadEvents();
  }

  onStatusesChange(values: string[]): void {
    this.selectedStatuses = values;
    this.page = 0;
    this.loadEvents();
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
    this.loadEvents();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.page = 0;
    this.loadEvents();
  }

  onSortByChange(value: string): void {
    this.sortBy = value;
    this.page = 0;
    this.loadEvents();
  }

  onSortDirChange(value: string): void {
    this.sortDir = value === 'asc' ? 'asc' : 'desc';
    this.page = 0;
    this.loadEvents();
  }

  toggleSort(field: string): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = 'asc';
    }

    this.page = 0;
    this.loadEvents();
  }

  isSortedBy(field: string): boolean {
    return this.sortBy === field;
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadEvents();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadEvents();
    }
  }

  deleteEvent(event: EventItem): void {
    this.confirmDialog
      .confirmDelete({ itemLabel: `the ${event.eventType || 'event'} event for ${event.userName}` })
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.performDeleteEvent(event));
  }

  private performDeleteEvent(event: EventItem): void {
    this.deletingIds.add(event.id);
    this.api.deleteEvent(event.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Event deleted successfully.');
        this.deletingIds.delete(event.id);
        this.loadEvents();
      },
      error: () => {
        this.toast.error('Unable to delete event right now.');
        this.deletingIds.delete(event.id);
      }
    });
  }

  isDeleting(id: number): boolean {
    return this.deletingIds.has(id);
  }

  private loadEventTypeOptions(): void {
    this.api.eventTypeSeeds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (seeds) => {
        this.eventTypeOptions = (seeds ?? []).map((seed) => ({
          value: seed.code || seed.displayName,
          label: seed.displayName || seed.code || ''
        }));
      }
    });
    this.api.users(0, 1000, '', 'name', 'asc').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.userOptions = (result.content ?? []).map((user) => ({
          value: String(user.id),
          label: user.name,
          hint: user.email
        }));
      },
      error: () => {}
    });
  }
}
