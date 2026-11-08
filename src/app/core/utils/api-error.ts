import { HttpErrorResponse } from '@angular/common/http';

/** The message the backend put in the response body, when there is one. */
export function backendMessage(error: unknown): string | null {
  const response = error as HttpErrorResponse | null;
  const message = response?.error?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

/**
 * A message to show the user for a failed request.
 *
 * Rate-limited requests (HTTP 429) get a clearer, shared wording, because the
 * backend limit is per IP and endpoint rather than about what the user typed.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const response = error as HttpErrorResponse | null;
  if (response?.status === 429) {
    return backendMessage(error) ?? 'Too many attempts. Please wait a minute and try again.';
  }
  if (isConcurrentLoginError(error)) {
    return concurrentLoginMessage(error);
  }
  return backendMessage(error) ?? fallback;
}

/** True when the request was rejected because of the rate limiter. */
export function isRateLimited(error: unknown): boolean {
  return (error as HttpErrorResponse | null)?.status === 429;
}

/**
 * The marker the backend prefixes on a concurrent-login rejection. The status is 401 (so the client
 * treats it as an auth failure), but the body message says this session was replaced by a newer
 * single-session sign-in rather than that the token merely expired.
 */
const CONCURRENT_LOGIN_MARKER = 'CONCURRENT_LOGIN';

/** True when the backend rejected the request because this session was superseded by a new sign-in. */
export function isConcurrentLoginError(error: unknown): boolean {
  const response = error as HttpErrorResponse | null;
  if (!response || response.status !== 401) {
    return false;
  }
  const message = backendMessage(error);
  return !!message && message.startsWith(CONCURRENT_LOGIN_MARKER);
}

/** The message to show for a concurrent-login rejection, without the internal marker prefix. */
export function concurrentLoginMessage(error: unknown): string {
  const message = backendMessage(error) ?? '';
  const withoutMarker = message.startsWith(CONCURRENT_LOGIN_MARKER)
    ? message.slice(CONCURRENT_LOGIN_MARKER.length).replace(/^:\s*/, '')
    : message;
  return withoutMarker || 'Your account was signed in on another device, so this session ended.';
}
