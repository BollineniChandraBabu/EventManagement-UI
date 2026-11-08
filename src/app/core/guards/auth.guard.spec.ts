import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;

  const run = (url: string): boolean | UrlTree =>
    TestBed.runInInjectionContext(() => authGuard(route, { url } as RouterStateSnapshot)) as
      | boolean
      | UrlTree;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sends an anonymous visitor to the login page with a redirect back', () => {
    const result = run('/dashboard') as UrlTree;
    expect(result.toString()).toBe('/login?redirectUrl=%2Fdashboard');
  });

  it('routes a one-time token to the direct-login page instead of login', () => {
    const result = run('/circles?token=abc&email=asha%40example.com') as UrlTree;
    expect(result.toString()).toBe('/direct-login?token=abc&email=asha@example.com');
  });

  it('lets a signed-in user through', () => {
    localStorage.setItem('fw_access_token', 'token');
    TestBed.inject(AuthService);
    expect(run('/dashboard')).toBeTrue();
  });
});
