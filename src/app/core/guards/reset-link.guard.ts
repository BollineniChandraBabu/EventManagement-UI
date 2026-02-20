import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const resetLinkGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const token = route.queryParamMap.get('token');
  const email = route.queryParamMap.get('email');

  if (token && email) {
    return router.parseUrl(`/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
  }

  return router.parseUrl(auth.authenticated() ? '/dashboard' : '/login');
};
