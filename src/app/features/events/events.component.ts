import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { EventItem } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './events.component.html',
  styleUrl: './events.component.css'
})
export class EventsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  events: EventItem[] = [];
  loading = false;

  constructor() {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.api.events(0, 100).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.events = response.content ?? [];
        this.loading = false;
      },
      error: () => {
        this.toast.error('Unable to load events right now.');
        this.loading = false;
      }
    });
  }
}
