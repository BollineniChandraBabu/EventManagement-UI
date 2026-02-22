import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map, switchMap } from 'rxjs';
import { LegendPosition, NgxChartsModule, ScaleType } from '@swimlane/ngx-charts';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardChartPoint, MailFlowStats } from '../../core/models/api.models';

type LineChartData = Array<{ name: string; series: Array<{ name: string; value: number }> }>;

@Component({
  standalone: true,
  imports: [CommonModule, AsyncPipe, NgxChartsModule],
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

  selectedDate = this.toDateInputValue(new Date());
  readonly maxDate = this.toDateInputValue(new Date());

  private readonly selectedDaysSubject = new BehaviorSubject<number>(1);
  private readonly selectedDays$ = this.selectedDaysSubject.asObservable().pipe(distinctUntilChanged());

  readonly otpMailChart$ = this.selectedDays$.pipe(
    switchMap((days) => this.api.getOtpMailChart(days)),
    map((response) => this.toLineChartData(response.points))
  );

  readonly forgotPasswordMailChart$ = this.selectedDays$.pipe(
    switchMap((days) => this.api.getForgotPasswordMailChart(days)),
    map((response) => this.toLineChartData(response.points))
  );

  readonly mailChart$ = this.selectedDays$.pipe(
    switchMap((days) => this.api.getMailChart(days)),
    map((response) => this.toLineChartData(response.points))
  );

  readonly instaChart$ = this.selectedDays$.pipe(
    switchMap((days) => this.api.getInstaChart(days)),
    map((response) => this.toLineChartData(response.points))
  );


  readonly legendPosition = LegendPosition.Below;

  readonly chartColorScheme = {
    name: 'mailChartScheme',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#14b8a6', '#ef4444']
  };

  readonly yAxisTickFormatter = (value: number): string => {
    if (!Number.isFinite(value)) {
      return '0';
    }

    return Number.isInteger(value) ? `${value}` : value.toFixed(1);
  };

  onChartDateChange(dateValue: string): void {
    const selectedDate = this.parseInputDate(dateValue);
    const now = new Date();

    if (!selectedDate || selectedDate > now) {
      this.selectedDate = this.toDateInputValue(now);
      this.selectedDaysSubject.next(1);
      return;
    }

    this.selectedDate = this.toDateInputValue(selectedDate);
    this.selectedDaysSubject.next(this.calculateDaysFromDate(selectedDate));
  }

  mailFlowCards(stats: MailFlowStats | null | undefined): Array<{ label: string; value: number }> {
    const safeStats = stats ?? { emailsSentToday: 0, failedEmails: 0 };

    return [
      { label: 'Emails sent today', value: safeStats.emailsSentToday ?? 0 },
      { label: 'Failed emails', value: safeStats.failedEmails ?? 0 }
    ];
  }

  private calculateDaysFromDate(date: Date): number {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfSelectedDate = new Date(date);
    startOfSelectedDate.setHours(0, 0, 0, 0);

    const msInDay = 24 * 60 * 60 * 1000;
    const dayDifference = Math.floor((startOfToday.getTime() - startOfSelectedDate.getTime()) / msInDay);

    return Math.max(dayDifference + 1, 1);
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

  chartYAxisMax(chartData: LineChartData | null | undefined): number {
    const maxDataPoint = (chartData ?? [])
      .flatMap((series) => series.series)
      .reduce((max, point) => Math.max(max, point.value ?? 0), 0);

    if (maxDataPoint <= 5) {
      return 5;
    }

    return Math.ceil(maxDataPoint * 1.1);
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
}
