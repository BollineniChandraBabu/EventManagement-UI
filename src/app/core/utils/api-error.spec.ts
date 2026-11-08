import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, concurrentLoginMessage, isConcurrentLoginError } from './api-error';

function error(status: number, message?: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: message ? { message } : null });
}

describe('concurrent-login error helpers', () => {
  it('detects a 401 carrying the concurrent-login marker', () => {
    expect(isConcurrentLoginError(error(401, 'CONCURRENT_LOGIN: session replaced'))).toBeTrue();
  });

  it('does not treat an ordinary 401 as a concurrent login', () => {
    expect(isConcurrentLoginError(error(401, 'Invalid refresh token'))).toBeFalse();
    expect(isConcurrentLoginError(error(401))).toBeFalse();
  });

  it('ignores other statuses', () => {
    expect(isConcurrentLoginError(error(400, 'CONCURRENT_LOGIN: nope'))).toBeFalse();
  });

  it('strips the marker from the user-facing message', () => {
    expect(concurrentLoginMessage(error(401, 'CONCURRENT_LOGIN: your session ended'))).toBe(
      'your session ended'
    );
  });

  it('falls back to a default message when the body is empty', () => {
    expect(concurrentLoginMessage(error(401))).toContain('signed in on another device');
  });

  it('shows the concurrent-login message through the shared error helper', () => {
    expect(apiErrorMessage(error(401, 'CONCURRENT_LOGIN: session ended'), 'fallback')).toBe(
      'session ended'
    );
  });
});
