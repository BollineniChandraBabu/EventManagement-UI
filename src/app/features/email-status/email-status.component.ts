import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, AsyncPipe, MatCardModule, MatButtonModule, MatTableModule],
  template: `<div class="page"><mat-card>
    <h2>Email Status</h2>
    <table mat-table [dataSource]="(items$ | async) ?? []">
      <ng-container matColumnDef="to"><th mat-header-cell *matHeaderCellDef>To</th><td mat-cell *matCellDef="let e">{{e.to}}</td></ng-container>
      <ng-container matColumnDef="subject"><th mat-header-cell *matHeaderCellDef>Subject</th><td mat-cell *matCellDef="let e">{{e.subject}}</td></ng-container>
      <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let e">{{e.status}}</td></ng-container>
      <ng-container matColumnDef="actions"><th mat-header-cell *matHeaderCellDef>Actions</th><td mat-cell *matCellDef="let e"><button mat-button *ngIf="e.status==='FAILED'" (click)="retry(e.id)">Retry</button></td></ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols;"></tr>
    </table>
  </mat-card></div>`
})
export class EmailStatusComponent {
  private api = inject(ApiService);
  cols = ['to', 'subject', 'status', 'actions'];
  items$ = this.api.emailStatuses();
  retry(id: number) { this.api.retryEmail(id).subscribe(() => this.items$ = this.api.emailStatuses()); }
}
