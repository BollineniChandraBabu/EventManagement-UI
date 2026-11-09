import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ConnectivityService } from '../services/connectivity.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor concurrent login', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('fw_access_token', 'access');
    localStorage.setItem('fw_refresh_token', 'refresh');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        // The real service probes the API on an interval, which a mocked clock would fire repeatedly.
        { provide: ConnectivityService, useValue: { reportRequestFailure: () => undefined } },
      ],
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('flags a concurrent login on the first 401 instead of trying to refresh', () => {
    auth.getProfile().subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush({ message: 'CONCURRENT_LOGIN: this session ended' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.concurrentLoginNotice()).toContain('this session ended');
    httpMock.expectNone(`${environment.apiUrl}/auth/refresh`);
  });

  it('refreshes an ordinary 401 and retries the request', () => {
    auth.getProfile().subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
    expect(refresh.request.method).toBe('POST');
    refresh.flush({ accessToken: 'fresh', refreshToken: 'refresh', expiresIn: 3600, role: 'ROLE_USER' });

    httpMock.expectOne(`${environment.apiUrl}/users/me`).flush({});
    expect(auth.concurrentLoginNotice()).toBeNull();
  });

  it('flags a concurrent login when the refresh itself is rejected for it', () => {
    auth.getProfile().subscribe({ error: () => undefined });

    httpMock
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/refresh`)
      .flush({ message: 'CONCURRENT_LOGIN: replaced elsewhere' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.concurrentLoginNotice()).toContain('replaced elsewhere');
  });

  it('keeps the concurrent-login notice when the scheduled refresh is rejected', () => {
    jasmine.clock().install();
    try {
      const router = TestBed.inject(Router);
      const navigate = spyOn(router, 'navigate').and.resolveTo(true);

      auth.directLogin({ token: 'abc123' }).subscribe();
      httpMock.expectOne(`${environment.apiUrl}/auth/direct-login`).flush({
        accessToken: 'a',
        refreshToken: 'r',
        expiresIn: 3600,
        role: 'ROLE_USER',
      });

      // The auto-refresh fires shortly before the access token expires.
      jasmine.clock().tick(3600_000 - 30_000);
      httpMock
        .expectOne(`${environment.apiUrl}/auth/refresh`)
        .flush({ message: 'CONCURRENT_LOGIN: replaced elsewhere' }, { status: 401, statusText: 'Unauthorized' });

      expect(auth.concurrentLoginNotice()).toContain('replaced elsewhere');
      expect(navigate).not.toHaveBeenCalled();
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('does not sign out on a late failure once the notice is up', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);

    auth.flagConcurrentLogin('Session replaced.');

    auth.getProfile().subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${environment.apiUrl}/users/me`)
      .flush({ message: 'forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(auth.concurrentLoginNotice()).toBe('Session replaced.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
