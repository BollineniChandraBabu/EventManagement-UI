import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, AsyncPipe],
  template: `<div class="page">
    <h2>Dashboard</h2>
    <div class="kpi-grid" *ngIf="data$ | async as data">
      <mat-card>Total users: {{ data.totalUsers }}</mat-card>
      <mat-card>Upcoming events: {{ data.upcomingEvents }}</mat-card>
      <mat-card>Emails sent today: {{ data.emailsSentToday }}</mat-card>
      <mat-card>Failed emails: {{ data.failedEmails }}</mat-card>
    </div>
  </div>`
})
export class DashboardComponent {
  data$ = inject(ApiService).getDashboard();
}
