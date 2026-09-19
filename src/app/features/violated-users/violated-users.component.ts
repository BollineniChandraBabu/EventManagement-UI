import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { SensitiveInfoToggleComponent } from '../../shared/sensitive-info-toggle.component';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ViolatedUserInfo, ViolatedUserMapPoint } from '../../core/models/api.models';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe, SensitiveInfoToggleComponent],
  templateUrl: './violated-users.component.html',
  styleUrl: './violated-users.component.css'
})
export class ViolatedUsersComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly maxDate = this.toDateInputValue(new Date());
  startDate = this.toDateInputValue(this.daysAgo(6));
  endDate = this.maxDate;
  page = 0;
  size = 25;
  includeIpInfo = true;
  loading = false;

  totalAttempts = 0;
  totalElements = 0;
  totalPages = 0;
  hasNext = false;
  hasPrevious = false;
  chartPoints: Array<{ date: string; total: number }> = [];
  users: ViolatedUserInfo[] = [];
  mapPoints: ViolatedUserMapPoint[] = [];

  constructor() {
    this.load();
  }

  load(page = this.page): void {
    this.page = Math.max(0, page);
    this.loading = true;
    this.api.getViolatedUsersDashboard(this.startDate, this.endDate, this.page, this.size, this.includeIpInfo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.totalAttempts = response.totalAttempts ?? 0;
          this.totalElements = response.totalElements ?? 0;
          this.totalPages = response.totalPages ?? 0;
          this.hasNext = response.hasNext ?? false;
          this.hasPrevious = response.hasPrevious ?? false;
          this.chartPoints = response.chartPoints ?? [];
          this.users = response.users ?? [];
          this.mapPoints = response.mapPoints ?? [];
          this.loading = false;
        },
        error: () => {
          this.toast.error('Unable to load violated user attempts right now.');
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    if (this.startDate > this.endDate) {
      this.endDate = this.startDate;
    }
    this.load(0);
  }

  cityLabel(user: ViolatedUserInfo | ViolatedUserMapPoint): string {
    const ipInfo = user.ipInfo;
    return [ipInfo?.city, ipInfo?.regionName, ipInfo?.country].filter(Boolean).join(', ') || user.loginLocation || 'Unknown';
  }

  riskBadges(user: ViolatedUserInfo): string[] {
    const ipInfo = user.ipInfo;
    if (!ipInfo) return [];
    return [
      ipInfo.proxy ? 'Proxy' : '',
      ipInfo.hosting ? 'Hosting' : '',
      ipInfo.mobile ? 'Mobile' : ''
    ].filter(Boolean);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
