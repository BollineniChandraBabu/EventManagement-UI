import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { EventItem } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  events: EventItem[] = [];
  viewEvents: EventItem[] = [];
  eventTypeOptions: string[] = [];
  filterText = '';
  filterType = 'ALL';
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  sortBy = 'eventDate';
  sortDir: 'asc' | 'desc' = 'desc';
  loading = false;

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
    this.api.events(this.page, this.pageSize, this.filterText, this.sortBy, this.sortDir).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.events = response.content ?? [];
        this.totalElements = response.totalElements ?? this.events.length;
        this.totalPages = response.totalPages ?? 0;
        this.applyTypeFilter();
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load events right now.');
        this.loading = false;
      }
    });
  }

  onTypeFilter(value: string): void {
    this.filterType = value;
    this.applyTypeFilter();
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

  private applyTypeFilter(): void {
    if (this.filterType === 'ALL') {
      this.viewEvents = [...this.events];
      return;
    }

    this.viewEvents = this.events.filter((event) => event.eventType === this.filterType);
  }

  private loadEventTypeOptions(): void {
    this.api.eventTypeSeeds().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (seeds) => {
        this.eventTypeOptions = (seeds ?? []).map((seed) => seed.displayName);
      }
    });
  }
}
