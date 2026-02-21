import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged, map, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardChartPoint, MailFlowStats } from '../../core/models/api.models';

interface ChartBarViewModel {
  dateLabel: string;
  sent: number;
  failed: number;
  total: number;
  sentHeightPct: number;
  failedHeightPct: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, AsyncPipe, DatePipe],
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
    map((response) => this.toBars(response.points))
  );

  readonly forgotPasswordMailChart$ = this.selectedDays$.pipe(
    switchMap((days) => this.api.getForgotPasswordMailChart(days)),
    map((response) => this.toBars(response.points))
  );

  readonly mailChart$ = this.selectedDays$.pipe(
    switchMap((days) => this.api.getMailChart(days)),
    map((response) => this.toBars(response.points))
  );

  readonly instaChart$ = this.selectedDays$.pipe(
    switchMap((days) => this.api.getInstaChart(days)),
    map((response) => this.toBars(response.points))
  );

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

    const parsedDate = new Date(`${dateValue}T00:00:00`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private toBars(points: DashboardChartPoint[]): ChartBarViewModel[] {
    const safePoints = points ?? [];
    const maxTotal = Math.max(...safePoints.map((item) => item.total ?? 0), 1);

    return safePoints.map((item) => {
      const sent = item.sent ?? 0;
      const failed = item.failed ?? 0;
      const total = item.total ?? sent + failed;
      const sentHeightPct = Math.max((sent / maxTotal) * 100, sent > 0 ? 6 : 0);
      const failedHeightPct = Math.max((failed / maxTotal) * 100, failed > 0 ? 6 : 0);

      return {
        dateLabel: item.date,
        sent,
        failed,
        total,
        sentHeightPct,
        failedHeightPct
      };
    });
  }
}
