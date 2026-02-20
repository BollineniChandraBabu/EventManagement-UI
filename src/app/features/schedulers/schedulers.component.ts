import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { SchedulerItem } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedulers.component.html',
  styleUrl: './schedulers.component.css'
})
export class SchedulersComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  viewSchedulers: SchedulerItem[] = [];
  loading = false;
  message = '';
  filterText = '';
  page = 0;
  readonly pageSizes = [5, 10, 20];
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;
  triggeringJobs = new Set<string>();

  constructor() {
    this.loadSchedulers();
  }

  get displayPage(): number {
    return this.page + 1;
  }

  get startRow(): number {
    if (this.totalElements === 0 || this.viewSchedulers.length === 0) {
      return 0;
    }

    return this.page * this.pageSize + 1;
  }

  get endRow(): number {
    return this.viewSchedulers.length === 0 ? 0 : this.startRow + this.viewSchedulers.length - 1;
  }

  refresh(): void {
    this.loadSchedulers();
  }

  onSearch(value: string): void {
    this.filterText = value.trim();
    this.page = 0;
    this.loadSchedulers();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value);
    this.page = 0;
    this.loadSchedulers();
  }

  nextPage(): void {
    if (this.page < this.totalPages - 1) {
      this.page++;
      this.loadSchedulers();
    }
  }

  prevPage(): void {
    if (this.page > 0) {
      this.page--;
      this.loadSchedulers();
    }
  }

  trigger(scheduler: SchedulerItem): void {
    const jobName = scheduler.name;
    if (!jobName || this.triggeringJobs.has(jobName)) {
      return;
    }

    this.triggeringJobs.add(jobName);
    this.api.triggerScheduler(jobName).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message = res.message || `Triggered ${res.name} successfully.`;
        this.triggeringJobs.delete(jobName);
        this.loadSchedulers();
      },
      error: () => {
        this.message = `Unable to trigger scheduler ${jobName}.`;
        this.triggeringJobs.delete(jobName);
      }
    });
  }

  isTriggering(jobName: string): boolean {
    return this.triggeringJobs.has(jobName);
  }

  successRate(item: SchedulerItem): number {
    if (!item.totalRuns) {
      return 0;
    }

    return Math.round((item.successRuns / item.totalRuns) * 100);
  }

  trackByScheduler(_: number, scheduler: SchedulerItem): string {
    return `${scheduler.name}-${scheduler.type}`;
  }

  private loadSchedulers(): void {
    this.loading = true;
    this.message = '';

    this.api.schedulers(this.page, this.pageSize, this.filterText).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.viewSchedulers = (response.content ?? []).slice().sort((a, b) => `${a.type}-${a.name}`.localeCompare(`${b.type}-${b.name}`));
        this.totalElements = response.totalElements ?? this.viewSchedulers.length;
        this.totalPages = response.totalPages ?? 0;
        this.loading = false;
      },
      error: () => {
        this.viewSchedulers = [];
        this.totalElements = 0;
        this.totalPages = 0;
        this.loading = false;
        this.message = 'Unable to fetch schedulers from /api/schedulers.';
      }
    });
  }
}
