import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';

/**
 * Preloads lazy routes only once the browser is idle.
 *
 * PreloadAllModules fetches every chunk during startup, which competes with the
 * initial route's chunk for bandwidth on slow connections and delays first render.
 * Deferring to the browser's idle callback keeps the first paint fast while still
 * warming up the rest of the app afterwards.
 */
@Injectable({ providedIn: 'root' })
export class IdlePreloadingStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] === false) {
      return of(null);
    }

    return new Observable((subscriber) => {
      const run = () => load().subscribe(subscriber);
      const handle = typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(run, { timeout: 3000 })
        : window.setTimeout(run, 2000);
      return () => {
        if (typeof window.cancelIdleCallback === 'function') {
          window.cancelIdleCallback(handle as number);
        } else {
          window.clearTimeout(handle as number);
        }
      };
    });
  }
}
