import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ImpersonationService } from './core/services/impersonation.service';
import { ToastContainerComponent } from './shared/toast-container.component';
import { LoadingOverlayComponent } from './shared/loading-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent, LoadingOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly impersonation = inject(ImpersonationService);
  readonly currentYear = new Date().getFullYear();

  isMobileMenuOpen = false;
  isSidebarCollapsed = false;

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  exitImpersonation(): void {
    this.impersonation.stopImpersonation();
    this.closeMobileMenu();
  }
}
