import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, map, Observable, shareReplay } from 'rxjs';
import { LocationService } from '../services/location.service';

const ALLOWED_COUNTRY = 'India';
const ALLOWED_REGIONS = new Set(['Andhra Pradesh', 'Telangana']);

let cachedAccessCheck$: Observable<boolean> | null = null;

function isAllowedLocation(country?: string, region?: string): boolean {
  return country === ALLOWED_COUNTRY && !!region && ALLOWED_REGIONS.has(region);
}

export const locationAccessGuard: CanActivateFn = (route) => {
  const locationService = inject(LocationService);
  const router = inject(Router);

  if (!cachedAccessCheck$) {
    cachedAccessCheck$ = from(locationService.getUserLocation()).pipe(
      map((location) => isAllowedLocation(location?.country, location?.region)),
      shareReplay(1)
    );
  }

  return cachedAccessCheck$.pipe(
    map((isAllowedRegion) => {
      if (route.routeConfig?.path === 'restricted-region') {
        return isAllowedRegion ? router.parseUrl('/') : true;
      }

      return isAllowedRegion ? true : router.parseUrl('/restricted-region');
    })
  );
};
