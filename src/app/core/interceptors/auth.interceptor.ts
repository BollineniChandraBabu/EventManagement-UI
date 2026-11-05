import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ConnectivityService } from '../services/connectivity.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const connectivity = inject(ConnectivityService);
  const token = auth.getAccessToken();
  const skipAuthHeader = req.url.startsWith('https://ipinfo.io/');
  const clone = !skipAuthHeader && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(clone).pipe(
    catchError((error: HttpErrorResponse) => {
      // Status 0 means the request never reached the server. Only treat it as a connectivity loss
      // when the browser also reports offline, so a blocked third-party host (e.g. a geo lookup
      // stopped by an ad-blocker) does not trigger the offline screen.
      if (error.status === 0 && typeof navigator !== 'undefined' && !navigator.onLine) {
        connectivity.markOffline();
      }

      if (error.status === 403) {
        auth.logout();
        return throwError(() => error);
      }

      if (error.status === 401) {
        return auth.refreshToken().pipe(
          switchMap((res) =>
            next(
              skipAuthHeader
                ? req
                : req.clone({
                    setHeaders: { Authorization: `Bearer ${res.accessToken}` },
                  })
            )
          ),
          catchError(() => {
            auth.logout();
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
