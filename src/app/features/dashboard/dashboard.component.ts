import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardChartPoint, DashboardStats, MailFlowStats } from '../../core/models/api.models';
import { LineChartComponent } from './line-chart.component';
import { LineChartData } from './line-chart.utils';
import { DeliveryHealth, RANGE_PRESETS, activeRangePreset, deliveryHealth } from './dashboard.utils';

@Component({
  standalone: true,
  imports: [CommonModule, AsyncPipe, LineChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly maildata$ = this.api.getDashboard();
  readonly igdata$ = this.api.getIGDashboard();
  readonly otpMailStats$ = this.api.getOtpMailDashboard();
  readonly forgotPasswordMailStats$ = this.api.getForgotPasswordMailDashboard();
  readonly maxDate = this.toDateInputValue(new Date());
  selectedStartDate = this.toDateInputValue(this.daysAgo(6));
  selectedEndDate = this.maxDate;
  readonly rangePresets = RANGE_PRESETS;
  /** Which quick-pick is active, so it can be highlighted; null for a custom range. */
  activePreset: number | null = 7;

  private readonly selectedDateRangeSubject = new BehaviorSubject<{ startDate: string; endDate: string }>({
    startDate: this.selectedStartDate,
    endDate: this.selectedEndDate
  });
  private readonly selectedDateRange$ = this.selectedDateRangeSubject.asObservable().pipe(
    distinctUntilChanged(),
    map(({ startDate, endDate }) => ({ startDate, endDate }))
  );

  readonly otpMailChart$ = this.selectedDateRange$.pipe(
    switchMap(({ startDate, endDate }) => this.api.getOtpMailChart(startDate, endDate)),
    map((response) => this.toLineChartData(response.points))
  );

  readonly forgotPasswordMailChart$ = this.selectedDateRange$.pipe(
    switchMap(({ startDate, endDate }) => this.api.getForgotPasswordMailChart(startDate, endDate)),
    map((response) => this.toLineChartData(response.points))
  );

  readonly mailChart$ = this.selectedDateRange$.pipe(
    switchMap(({ startDate, endDate }) => this.api.getMailChart(startDate, endDate)),
    map((response) => this.toLineChartData(response.points))
  );

  readonly instaChart$ = this.selectedDateRange$.pipe(
    switchMap(({ startDate, endDate }) => this.api.getInstaChart(startDate, endDate)),
    map((response) => this.toLineChartData(response.points))
  );

  onStartDateChange(dateValue: string): void {
    const selectedDate = this.parseInputDate(dateValue);
    const now = new Date();

    if (!selectedDate || selectedDate > now) {
      this.selectedStartDate = this.toDateInputValue(this.daysAgo(6));
      this.pushDateRange();
      return;
    }

    this.selectedStartDate = this.toDateInputValue(selectedDate);
    if (this.selectedStartDate > this.selectedEndDate) {
      this.selectedEndDate = this.selectedStartDate;
    }
    this.pushDateRange();
  }

  onEndDateChange(dateValue: string): void {
    const selectedDate = this.parseInputDate(dateValue);
    const now = new Date();

    if (!selectedDate || selectedDate > now) {
      this.selectedEndDate = this.maxDate;
      this.pushDateRange();
      return;
    }

    this.selectedEndDate = this.toDateInputValue(selectedDate);
    if (this.selectedEndDate < this.selectedStartDate) {
      this.selectedStartDate = this.selectedEndDate;
    }
    this.pushDateRange();
  }

  /** A short "1 Nov – 7 Nov · 7 days" caption shown under the range controls. */
  rangeSummary(): string {
    const days = this.rangeDayCount();
    const start = this.toShortDate(this.selectedStartDate);
    const end = this.toShortDate(this.selectedEndDate);
    const dayLabel = days === 1 ? 'day' : 'days';
    return `${start} – ${end} · ${days} ${dayLabel}`;
  }

  mailFlowCards(stats: MailFlowStats | null | undefined): Array<{ label: string; value: number }> {
    const safeStats = stats ?? { emailsSentToday: 0, failedEmails: 0 };

    return [
      { label: 'Emails sent today', value: safeStats.emailsSentToday ?? 0 },
      { label: 'Failed emails', value: safeStats.failedEmails ?? 0 }
    ];
  }

  deliveryHealth(stats: DashboardStats | null | undefined): DeliveryHealth {
    return deliveryHealth(stats);
  }

  /** The last N days as a range, so a preset button can jump the whole dashboard to it. */
  applyPreset(days: number): void {
    this.selectedStartDate = this.toDateInputValue(this.daysAgo(days - 1));
    this.selectedEndDate = this.maxDate;
    this.pushDateRange();
  }

  private rangeDayCount(): number {
    const start = this.parseInputDate(this.selectedStartDate)?.getTime();
    const end = this.parseInputDate(this.selectedEndDate)?.getTime();
    if (start == null || end == null || end < start) {
      return 0;
    }
    return Math.round((end - start) / 86_400_000) + 1;
  }

  private toShortDate(dateValue: string): string {
    const parsedDate = this.parseInputDate(dateValue);
    if (!parsedDate) {
      return dateValue;
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parsedDate);
  }

  private parseInputDate(dateValue: string): Date | null {
    if (!dateValue) {
      return null;
    }

    const [year, month, day] = dateValue.split('-').map((value) => Number(value));
    if (!year || !month || !day) {
      return null;
    }

    const parsedDate = new Date(year, month - 1, day);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toLineChartData(points: DashboardChartPoint[]): LineChartData {
    const safePoints = this.normalizeChartPoints(points);
    const seriesLabels = safePoints.map((item) => this.toDateLabel(item.date));

    return [
      {
        name: 'Sent',
        series: safePoints.map((item, index) => ({
          name: seriesLabels[index],
          value: this.toSafeMetric(item.sent)
        }))
      },
      {
        name: 'Failed',
        series: safePoints.map((item, index) => ({
          name: seriesLabels[index],
          value: this.toSafeMetric(item.failed)
        }))
      }
    ];
  }

  private normalizeChartPoints(points: DashboardChartPoint[] | null | undefined): DashboardChartPoint[] {
    const safePoints = points ?? [];

    return [...safePoints].sort((left, right) => {
      const leftDate = this.parseApiDate(left.date)?.getTime() ?? Number.NEGATIVE_INFINITY;
      const rightDate = this.parseApiDate(right.date)?.getTime() ?? Number.NEGATIVE_INFINITY;

      return leftDate - rightDate;
    });
  }

  private toSafeMetric(value: number | null | undefined): number {
    const safeValue = value ?? 0;

    if (!Number.isFinite(safeValue)) {
      return 0;
    }

    return Math.max(0, safeValue);
  }


  private toDateLabel(dateValue: string): string {
    const parsedDate = this.parseApiDate(dateValue);

    if (!parsedDate) {
      return dateValue;
    }

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).format(parsedDate);
  }

  private parseApiDate(dateValue: string): Date | null {
    if (!dateValue) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private pushDateRange(): void {
    this.activePreset = activeRangePreset(this.selectedStartDate, this.selectedEndDate);
    this.selectedDateRangeSubject.next({
      startDate: this.selectedStartDate,
      endDate: this.selectedEndDate
    });
  }

  private daysAgo(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
