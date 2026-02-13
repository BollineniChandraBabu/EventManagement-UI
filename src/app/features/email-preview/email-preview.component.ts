import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule],
  templateUrl: './email-preview.component.html',
  styleUrl: './email-preview.component.css'
})
export class EmailPreviewComponent {
  private api = inject(ApiService);
  mode: 'desktop' | 'mobile' = 'desktop';
  htmlString = '<h3>Hello {{name}}</h3><p>Your event is on {{eventDate}}</p>';

  sendTest() { this.api.sendTestEmail(this.htmlString).subscribe(); }
}
