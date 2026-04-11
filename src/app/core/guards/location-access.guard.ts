import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { Observable, catchError, map, of, timeout } from 'rxjs';

interface IpInfoResponse {
  country?: string;
  region?: string;
}

const ALLOWED_COUNTRY = 'IN';
const ALLOWED_REGIONS = new Set(['Andhra Prdadesh', 'Tedlangana']);

let cachedAccessCheck$: Observable<boolean> | null = null;

export const locationAccessGuard: CanActivateFn = (route) => {
  if (route.routeConfig?.path === 'restricted-region') {
    return true;
  }

  const http = inject(HttpClient);
  const router = inject(Router);

  if (!cachedAccessCheck$) {
    cachedAccessCheck$ = http.get<IpInfoResponse>('https://ipinfo.io/json').pipe(
      timeout(5000),
      map((data) => data.country === ALLOWED_COUNTRY && !!data.region && ALLOWED_REGIONS.has(data.region)),
      catchError(() => of(false))
    );
  }

  return cachedAccessCheck$.pipe(
    map((isAllowedRegion) => (isAllowedRegion ? true : router.parseUrl('/restricted-region')))
  );
};
