import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <span>Family Wishes UI</span>
      <span style="flex:1 1 auto"></span>
      <ng-container *ngIf="auth.authenticated()">
        <a mat-button routerLink="/dashboard">Dashboard</a>
        <a mat-button routerLink="/events">Events</a>
        <a mat-button routerLink="/ai-wishes">AI Wishes</a>
        <a mat-button routerLink="/email-preview">Email Preview</a>
        <a mat-button routerLink="/email-status">Email Status</a>
        <a *ngIf="auth.role()==='ADMIN'" mat-button routerLink="/users">Users</a>
        <a *ngIf="auth.role()==='ADMIN'" mat-button routerLink="/templates">Templates</a>
        <a mat-button routerLink="/change-password">Change Password</a>
        <button mat-raised-button (click)="auth.logout()">Logout</button>
      </ng-container>
    </mat-toolbar>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  readonly auth = inject(AuthService);
}
