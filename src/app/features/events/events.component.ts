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
  filterType = 'ALL';
  loading = false;

  constructor() {
    this.loadEventTypeOptions();
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.api.events(0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.events = response.content ?? [];
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
