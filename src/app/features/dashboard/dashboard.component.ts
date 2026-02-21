import { AsyncPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
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

  readonly maildata$ = this.api.getDashboard();
  readonly igdata$ = this.api.getIGDashboard();
  readonly otpMailStats$ = this.api.getOtpMailDashboard();
  readonly forgotPasswordMailStats$ = this.api.getForgotPasswordMailDashboard();

  readonly mailChart$ = this.api.getMailChart(0).pipe(
    map((response) => this.toBars(response.points))
  );

  readonly instaChart$ = this.api.getInstaChart(0).pipe(
    map((response) => this.toBars(response.points))
  );


  mailFlowCards(stats: MailFlowStats | null | undefined): Array<{ label: string; value: number }> {
    const safeStats = stats ?? { emailsSentToday: 0, failedEmails: 0 };

    return [
      { label: 'Emails sent today', value: safeStats.emailsSentToday ?? 0 },
      { label: 'Failed emails', value: safeStats.failedEmails ?? 0 }
    ];
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
