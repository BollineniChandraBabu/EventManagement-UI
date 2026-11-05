import { Injectable, signal } from '@angular/core';

/**
 * Tracks whether the browser can reach the network.
 *
 * Starts from `navigator.onLine` and follows the `online`/`offline` window events. When the
 * browser reports it is back online we still confirm with a lightweight request, because
 * `navigator.onLine` can be `true` on a captive portal or a dead uplink.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineState = signal(this.readInitial());
  private readonly checkingState = signal(false);

  /** True while the browser believes it has connectivity. */
  readonly online = this.onlineState.asReadonly();
  /** True while an online recovery is being confirmed with the server. */
  readonly checking = this.checkingState.asReadonly();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => this.confirmOnline());
    window.addEventListener('offline', () => this.onlineState.set(false));
  }

  /** Marks the app offline (also used when a request fails with a network error). */
  markOffline(): void {
    this.onlineState.set(false);
  }

  /** Verifies connectivity with a cheap request and updates the state. */
  confirmOnline(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.checkingState.set(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const probe = `${this.cacheBustingUrl()}`;

    fetch(probe, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
      .then(() => this.onlineState.set(true))
      .catch(() => this.onlineState.set(false))
      .finally(() => {
        clearTimeout(timeout);
        this.checkingState.set(false);
      });
  }

  private readInitial(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private cacheBustingUrl(): string {
    // Same-origin probe avoids CORS and does not depend on the API host.
    return `${window.location.origin}/favicon.ico?_=${Date.now()}`;
  }
}
