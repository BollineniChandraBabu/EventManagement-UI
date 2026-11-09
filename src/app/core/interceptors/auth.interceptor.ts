import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ConnectivityService } from '../services/connectivity.service';
import { concurrentLoginMessage, isConcurrentLoginError } from '../utils/api-error';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const connectivity = inject(ConnectivityService);
  const token = auth.getAccessToken();
  const skipAuthHeader = req.url.startsWith('https://ipinfo.io/');
  const clone = !skipAuthHeader && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(clone).pipe(
    catchError((error: HttpErrorResponse) => {
      // Once the session is known to be superseded, every in-flight request is unauthenticated and
      // is expected to fail. Acting on those failures (refresh, sign-out) would clear the notice and
      // bounce the user to the login screen before it can be read, so leave the auth state alone.
      if (auth.concurrentLoginNotice() !== null) {
        return throwError(() => error);
      }

      // Status 0 means the request never reached the server. That is ambiguous — a dead connection
      // or a CORS rejection — so ask ConnectivityService to verify rather than assuming offline. Do
      // not consult `navigator.onLine`: it stays `true` when the link is up but the uplink is dead,
      // which is exactly the case this needs to catch. The URL check keeps a blocked third-party host
      // (e.g. a geo lookup stopped by an ad-blocker) from triggering a check at all.
      if (error.status === 0 && isBackendRequest(req.url)) {
        connectivity.reportRequestFailure();
      }

      if (error.status === 403) {
        auth.logout();
        return throwError(() => error);
      }

      if (error.status === 401) {
        // A concurrent-login rejection is not a stale access token: the session itself is gone, so a
        // refresh would only fail again. Surface it and stop here so the user can sign in afresh.
        if (isConcurrentLoginError(error)) {
          auth.flagConcurrentLogin(concurrentLoginMessage(error));
          return throwError(() => error);
        }

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
          catchError((refreshError) => {
            // The refresh was itself rejected for concurrent login, so show the notice rather than
            // bouncing to the login screen with no explanation.
            if (isConcurrentLoginError(refreshError)) {
              auth.flagConcurrentLogin(concurrentLoginMessage(refreshError));
            } else {
              auth.logout();
            }
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

/** True when the request targets our own API, so a network failure there means the app is offline. */
function isBackendRequest(url: string): boolean {
  try {
    return new URL(url).origin === new URL(environment.apiUrl).origin;
  } catch {
    return false;
  }
}
