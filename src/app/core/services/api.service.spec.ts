import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { ApiService } from './api.service';

describe('ApiService directory search', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('searches the public directory, not the admin-only users endpoint', () => {
    let result: unknown;
    service.directoryUsers(0, 20, 'as', 'name', 'asc').subscribe((value) => (result = value));

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/users/directory`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('searchKey')).toBe('as');
    expect(req.request.params.get('sortBy')).toBe('name');
    expect(req.request.params.get('sortDir')).toBe('asc');

    req.flush({
      data: {
        content: [
          {
            id: 4,
            name: 'Asha',
            email: 'asha@example.com',
            relationShip: 'FRIEND',
            online: true,
            lastSeenAt: null,
            profilePictureUrl: null,
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    });

    expect((result as { content: unknown[] }).content.length).toBe(1);
  });

  it('normalises a bare array response into a page', () => {
    let result: { content: unknown[]; totalElements: number } | undefined;
    service.directoryUsers().subscribe((value) => (result = value));

    httpMock
      .expectOne((r) => r.url === `${environment.apiUrl}/users/directory`)
      .flush({ data: [{ id: 1, name: 'A', email: 'a@example.com' }] });

    expect(result?.content.length).toBe(1);
    expect(result?.totalElements).toBe(1);
  });

  it('filters circle-request emails through the generic endpoint with emailTypes', () => {
    service.emailStatuses(0, 10, '', 'CIRCLE_REQUEST').subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/emails/status`
    );
    expect(req.request.params.getAll('emailTypes')).toEqual(['CIRCLE_REQUEST']);
    expect(req.request.params.has('emailType')).toBeFalse();
    req.flush({ data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false } });
  });
});
