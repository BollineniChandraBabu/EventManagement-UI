import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { CircleService } from './circle.service';

describe('CircleService', () => {
  let service: CircleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CircleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('derives accepted user ids from the circle list', () => {
    let ids: Set<number> | undefined;
    service.acceptedUserIds().subscribe((result) => (ids = result));

    const req = httpMock.expectOne(`${environment.apiUrl}/circles`);
    expect(req.request.method).toBe('GET');
    req.flush({
      data: {
        circles: [
          { circleId: 10, userId: 2 },
          { circleId: 11, userId: 3 },
        ],
      },
    });

    expect(ids).toEqual(new Set([2, 3]));
  });

  it('returns an empty set when there are no circles', () => {
    let ids: Set<number> | undefined;
    service.acceptedUserIds().subscribe((result) => (ids = result));

    httpMock.expectOne(`${environment.apiUrl}/circles`).flush({ data: { circles: [] } });

    expect(ids).toEqual(new Set());
  });

  it('sends a circle request with the target user id', () => {
    let body: { userId: number } | undefined;
    service.sendRequest(7).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/circles/requests`);
    expect(req.request.method).toBe('POST');
    body = req.request.body;
    req.flush({ data: { circleId: 1, status: 'PENDING' } });
    expect(body).toEqual({ userId: 7 });
  });

  it('removes a circle via DELETE with the circle id in the body', () => {
    service.remove(5).subscribe();
    const req = httpMock.expectOne(`${environment.apiUrl}/circles`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({ circleId: 5 });
    req.flush(null);
  });

  it('reads circle status with a user', () => {
    let status: string | null | undefined;
    service.statusWith(7).subscribe((s) => (status = s.status));
    const req = httpMock.expectOne(`${environment.apiUrl}/circles/status/7`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: { status: 'ACCEPTED' } });
    expect(status).toBe('ACCEPTED');
  });
});
