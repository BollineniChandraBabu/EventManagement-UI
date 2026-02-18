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

  schedulers: SchedulerItem[] = [];
  viewSchedulers: SchedulerItem[] = [];
  loading = false;
  message = '';
  filterText = '';
  triggeringJobs = new Set<string>();

  constructor() {
    this.loadSchedulers();
  }

  refresh(): void {
    this.loadSchedulers();
  }

  onSearch(value: string): void {
    this.filterText = value.trim().toLowerCase();
    this.applyFilter();
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

    this.api.schedulers().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.schedulers = (items ?? []).slice().sort((a, b) => `${a.type}-${a.name}`.localeCompare(`${b.type}-${b.name}`));
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.schedulers = [];
        this.viewSchedulers = [];
        this.loading = false;
        this.message = 'Unable to fetch schedulers from /api/schedulers.';
      }
    });
  }

  private applyFilter(): void {
    if (!this.filterText) {
      this.viewSchedulers = [...this.schedulers];
      return;
    }

    this.viewSchedulers = this.schedulers.filter((scheduler) => {
      const target = `${scheduler.name} ${scheduler.type} ${scheduler.lastStatus ?? ''} ${scheduler.lastError ?? ''}`.toLowerCase();
      return target.includes(this.filterText);
    });
  }
}
