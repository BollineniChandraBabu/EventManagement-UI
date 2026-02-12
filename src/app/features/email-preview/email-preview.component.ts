import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ApiService } from '../../core/services/api.service';

@Component({
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule, MatButtonToggleModule],
  template: `<div class="page"><mat-card>
    <h2>Email Preview</h2>
    <mat-button-toggle-group [(ngModel)]="mode">
      <mat-button-toggle value="desktop">Desktop</mat-button-toggle>
      <mat-button-toggle value="mobile">Mobile</mat-button-toggle>
    </mat-button-toggle-group>
    <iframe class="preview-frame" [class.mobile]="mode==='mobile'" [srcdoc]="htmlString" height="450"></iframe>
    <button mat-raised-button color="primary" (click)="sendTest()">Test email to myself</button>
  </mat-card></div>`
})
export class EmailPreviewComponent {
  private api = inject(ApiService);
  mode: 'desktop' | 'mobile' = 'desktop';
  htmlString = '<h3>Hello {{name}}</h3><p>Your event is on {{eventDate}}</p>';

  sendTest() { this.api.sendTestEmail(this.htmlString).subscribe(); }
}
