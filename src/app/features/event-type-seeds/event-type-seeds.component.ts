import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventTypeSeed } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './event-type-seeds.component.html',
  styleUrl: './event-type-seeds.component.css'
})
export class EventTypeSeedsComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);

  eventTypeSeeds: EventTypeSeed[] = [];
  filterText = '';
  loading = false;
  deletingIds = new Set<number>();

  constructor() {
    this.loadEventTypeSeeds();
  }

  onSearchInput(value: string): void {
    const previousFilter = this.filterText;
    this.filterText = value;

    if (previousFilter.trim() && !this.filterText.trim()) {
      this.applySearch();
    }
  }

  applySearch(): void {
    this.filterText = this.filterText.trim();
    this.loadEventTypeSeeds();
  }

  clearSearch(): void {
    if (!this.filterText) {
      return;
    }

    this.filterText = '';
    this.loadEventTypeSeeds();
  }

  deleteSeed(seed: EventTypeSeed): void {
    this.deletingIds.add(seed.id);
    this.api.deleteEventTypeSeed(seed.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toast.success('Event type deleted successfully.');
        this.deletingIds.delete(seed.id);
        this.loadEventTypeSeeds();
      },
      error: () => {
        this.toast.error('Unable to delete event type right now.');
        this.deletingIds.delete(seed.id);
      }
    });
  }

  isDeleting(id: number): boolean {
    return this.deletingIds.has(id);
  }

  private loadEventTypeSeeds(): void {
    this.loading = true;
    this.eventTypeSeeds = [];

    this.api.eventTypeSeeds(this.filterText).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.eventTypeSeeds = response ?? [];
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load event type seeds right now.');
        this.loading = false;
      }
    });
  }
}
