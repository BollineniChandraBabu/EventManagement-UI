import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
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
});
