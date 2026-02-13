import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ROLE_ADMIN } from '../constants/roles.constants';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.role() === ROLE_ADMIN || router.parseUrl('/dashboard');
};
