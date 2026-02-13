import { Component, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [CommonModule, AsyncPipe, MatCardModule, MatButtonModule, MatTableModule],
  templateUrl: './email-status.component.html',
  styleUrl: './email-status.component.css'
})
export class EmailStatusComponent {
  private api = inject(ApiService);
  cols = ['to', 'subject', 'status', 'actions'];
  items$ = this.api.emailStatuses();
  retry(id: number) { this.api.retryEmail(id).subscribe(() => this.items$ = this.api.emailStatuses()); }
}
