import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule],
  templateUrl: './email-preview.component.html',
  styleUrl: './email-preview.component.css'
})
export class EmailPreviewComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly isAdmin = this.auth.role() === 'ADMIN';
  mode: 'desktop' | 'mobile' = 'desktop';
  htmlString = '<h3>Hello {{name}}</h3><p>Your event is on {{eventDate}}</p>';

  sendTest() {
    if (!this.isAdmin) {
      return;
    }

    this.api.sendTestEmail(this.htmlString).subscribe();
  }
}
