import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';
import { DirectLoginComponent } from './direct-login.component';

describe('DirectLoginComponent', () => {
  let httpMock: HttpTestingController;

  const tick = () => new Promise((resolve) => setTimeout(resolve));

  const setup = async (params: Record<string, string>): Promise<DirectLoginComponent> => {
    TestBed.configureTestingModule({
      imports: [DirectLoginComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(params) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(LocationService), 'getUserLocation').and.resolveTo(null);

    const component = TestBed.createComponent(DirectLoginComponent).componentInstance;
    component.ngOnInit();
    await tick();
    return component;
  };

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('exchanges the token for a session and routes to the circle', async () => {
    const component = await setup({ token: 'tok-1', email: 'asha@example.com' });
    const navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    const req = httpMock.expectOne(`${environment.apiUrl}/auth/direct-login`);
    expect(req.request.body.token).toBe('tok-1');
    expect(req.request.body.email).toBe('asha@example.com');
    req.flush({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 3600,
      role: 'ROLE_USER',
    });

    expect(component.working()).toBeFalse();
    expect(TestBed.inject(AuthService).authenticated()).toBeTrue();
    expect(navigate).toHaveBeenCalledWith('/circles');
  });

  it('shows an error and never calls the API when the token is missing', async () => {
    const component = await setup({ email: 'asha@example.com' });

    httpMock.expectNone(`${environment.apiUrl}/auth/direct-login`);
    expect(component.working()).toBeFalse();
    expect(component.message()).toContain('missing its token');
  });

  it('surfaces a friendly message when the token is rejected', async () => {
    const component = await setup({ token: 'expired' });

    httpMock
      .expectOne(`${environment.apiUrl}/auth/direct-login`)
      .flush({ message: 'Invalid token' }, { status: 400, statusText: 'Bad Request' });

    expect(component.working()).toBeFalse();
    expect(component.message().length).toBeGreaterThan(0);
  });
});
