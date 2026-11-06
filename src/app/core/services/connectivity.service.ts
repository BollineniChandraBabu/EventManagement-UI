import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

const HEARTBEAT_MS = 10000;
const PROBE_TIMEOUT_MS = 8000;
// A single failed heartbeat probe can be a transient blip (slow backend, cold start, brief
// handover). Two in a row means the app genuinely cannot reach its data.
const FAILURES_BEFORE_OFFLINE = 2;

/**
 * Tracks whether the browser can reach the backend.
 *
 * Starts from `navigator.onLine`, follows the `online`/`offline` window events, and also probes on a
 * heartbeat. The heartbeat is essential: the browser does not fire `offline` when the link is up but
 * the uplink is dead (captive portal, unplugged WAN, blocked host), and an idle app makes no request
 * that could fail. `navigator.onLine` alone therefore cannot be trusted to detect a lost connection.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly onlineState = signal(this.readInitial());
  private readonly checkingState = signal(false);
  private probing = false;
  private consecutiveFailures = 0;

  /** True while the backend is reachable. */
  readonly online = this.onlineState.asReadonly();
  /** True while connectivity is being confirmed with the server. */
  readonly checking = this.checkingState.asReadonly();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => this.confirmOnline());
    window.addEventListener('offline', () => this.markOffline());
    setInterval(() => this.confirmOnline(), HEARTBEAT_MS);
  }

  /** Marks the app offline; used when the browser itself reports the connection is gone. */
  markOffline(): void {
    this.consecutiveFailures = FAILURES_BEFORE_OFFLINE;
    this.onlineState.set(false);
  }

  /**
   * Called when a request to our API fails with a network error (status 0). That is ambiguous — it
   * can be a dead connection or a CORS rejection — so verify with a probe instead of assuming
   * offline. A probe failure here is conclusive, because a real request has already failed.
   */
  reportRequestFailure(): void {
    this.probe(true);
  }

  /** Verifies connectivity with a cheap request and updates the state. */
  confirmOnline(): void {
    this.probe(false);
  }

  private probe(conclusive: boolean): void {
    if (typeof window === 'undefined' || this.probing) {
      return;
    }

    this.probing = true;
    this.checkingState.set(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

    fetch(this.probeUrl(), { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal })
      .then(() => {
        this.consecutiveFailures = 0;
        this.onlineState.set(true);
      })
      .catch(() => {
        this.consecutiveFailures += 1;
        if (conclusive || this.consecutiveFailures >= FAILURES_BEFORE_OFFLINE) {
          this.onlineState.set(false);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        this.probing = false;
        this.checkingState.set(false);
      });
  }

  private readInitial(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  private probeUrl(): string {
    // Probe the API host, because that is what the app actually needs. A same-origin probe would
    // report "online" while the backend is unreachable, and would always succeed on a local dev
    // server. `no-cors` keeps the request free of a preflight/CORS error, so a CORS rejection is not
    // mistaken for a lost connection, and any HTTP response counts as reachable.
    return `${this.apiOrigin()}/?_=${Date.now()}`;
  }

  private apiOrigin(): string {
    try {
      return new URL(environment.apiUrl).origin;
    } catch {
      return window.location.origin;
    }
  }
}
