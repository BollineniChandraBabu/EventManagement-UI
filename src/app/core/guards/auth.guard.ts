import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.authenticated()) {
    return true;
  }

  // A one-time sign-in link (for example in a circle-request email) can point at a protected
  // route. Hand its token to the direct-login page, which exchanges it for a session.
  const { queryParams } = router.parseUrl(state.url);
  if (queryParams['token']) {
    return router.createUrlTree(['/direct-login'], { queryParams });
  }

  return router.createUrlTree(['/login'], {
    queryParams: { redirectUrl: state.url }
  });
};
