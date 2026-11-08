import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';

/**
 * Consumes a one-time sign-in link, such as the one in a circle-request email. The backend puts a
 * short-lived token in the link's query string; posting it here swaps it for a normal session and
 * sends the user straight to their circle, so they can accept without typing a password.
 */
@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './direct-login.component.html',
  styleUrl: './direct-login.component.css'
})
export class DirectLoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly locationService = inject(LocationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly working = signal(true);
  readonly message = signal('Signing you in…');
  private redirectUrl: string | null = null;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    const email = this.route.snapshot.queryParamMap.get('email') ?? '';
    this.redirectUrl = this.route.snapshot.queryParamMap.get('redirectUrl');

    if (!token) {
      this.fail('This sign-in link is missing its token. Open the link from your email again.');
      return;
    }

    void this.consume(token, email || undefined);
  }

  private async consume(token: string, email?: string): Promise<void> {
    const location = await this.locationService.getUserLocation().catch(() => null);

    this.auth
      .directLogin({
        token,
        email,
        loginLocation: location
          ? [location.city, location.region, location.country].filter(Boolean).join(', ') || undefined
          : undefined,
        ipAddress: location?.ipAddress,
        latitude: location?.latitude,
        longitude: location?.longitude
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.working.set(false);
          this.toast.success('Signed in. Taking you to your circle…');
          void this.auth.navigateAfterLogin(this.redirectUrl ?? '/circles');
        },
        error: (error: HttpErrorResponse) => {
          this.fail(
            apiErrorMessage(
              error,
              'This sign-in link is invalid or has expired. Please sign in normally.'
            )
          );
        }
      });
  }

  private fail(message: string): void {
    this.working.set(false);
    this.message.set(message);
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
