import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService direct login', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('posts the one-time token to /auth/direct-login', () => {
    service.directLogin({ token: 'abc123', email: 'asha@example.com' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/direct-login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: 'abc123', email: 'asha@example.com' });
    req.flush({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      role: 'ROLE_USER',
    });
  });

  it('stores the session so the guard lets the user through', () => {
    service.directLogin({ token: 'abc123' }).subscribe();

    httpMock.expectOne(`${environment.apiUrl}/auth/direct-login`).flush({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
      role: 'ROLE_USER',
    });

    expect(service.authenticated()).toBeTrue();
    expect(service.getAccessToken()).toBe('access-token');
  });

  it('does not navigate away from auth pages when redirecting after login', () => {
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);

    void service.navigateAfterLogin('/circles');

    expect(navigate).toHaveBeenCalledWith('/circles');
  });

  it('clears the stored session when a concurrent login is flagged', () => {
    localStorage.setItem('fw_access_token', 'stale-token');
    localStorage.setItem('fw_refresh_token', 'stale-refresh');

    service.flagConcurrentLogin('Session replaced.');

    expect(service.getAccessToken()).toBeNull();
    expect(service.authenticated()).toBeFalse();
    expect(service.concurrentLoginNotice()).toBe('Session replaced.');
  });

  it('clears the concurrent-login notice on a new sign-in', () => {
    service.flagConcurrentLogin('Session replaced.');

    service.directLogin({ token: 'abc123' }).subscribe();
    httpMock.expectOne(`${environment.apiUrl}/auth/direct-login`).flush({
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
      expiresIn: 3600,
      role: 'ROLE_USER',
    });

    expect(service.concurrentLoginNotice()).toBeNull();
    expect(service.authenticated()).toBeTrue();
  });
});
