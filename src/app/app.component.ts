import { Component, DestroyRef, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { ImpersonationService } from './core/services/impersonation.service';
import { ToastContainerComponent } from './shared/toast-container.component';
import { LoadingOverlayComponent } from './shared/loading-overlay.component';
import { ToastService } from './core/services/toast.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
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
    this.auth.switchBackToAdmin().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.impersonation.stopImpersonation();
        this.closeMobileMenu();
      },
      error: () => {
        this.toast.error('Unable to switch back to admin right now.');
      }
    });
  }
}
