import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();
  const skipAuthHeader = req.url.startsWith('https://ipinfo.io/');
  const clone = !skipAuthHeader && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(clone).pipe(
    catchError((error: HttpErrorResponse) => {
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
