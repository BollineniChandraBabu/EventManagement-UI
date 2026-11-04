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
  return backendMessage(error) ?? fallback;
}

/** True when the request was rejected because of the rate limiter. */
export function isRateLimited(error: unknown): boolean {
  return (error as HttpErrorResponse | null)?.status === 429;
}
