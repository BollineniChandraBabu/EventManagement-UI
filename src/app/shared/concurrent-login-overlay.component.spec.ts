import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ConcurrentLoginOverlayComponent } from './concurrent-login-overlay.component';

describe('ConcurrentLoginOverlayComponent', () => {
  let fixture: ComponentFixture<ConcurrentLoginOverlayComponent>;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [ConcurrentLoginOverlayComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ConcurrentLoginOverlayComponent);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stays hidden until a concurrent login is reported', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.concurrent-backdrop')).toBeNull();
  });

  it('shows the backend message once flagged', () => {
    auth.flagConcurrentLogin('This session was signed out.');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Signed in on another device');
    expect(text).toContain('This session was signed out.');
  });

  it('signs the user out to the login page when they act', () => {
    localStorage.setItem('fw_access_token', 'stale-token');
    auth.flagConcurrentLogin('This session was signed out.');
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.concurrent-action').click();
    fixture.detectChanges();

    expect(auth.getAccessToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.concurrent-backdrop')).toBeNull();
  });
});
