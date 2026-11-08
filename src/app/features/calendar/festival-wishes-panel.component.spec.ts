import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { FestivalWishMapping } from '../../core/models/api.models';
import { ROLE_ADMIN } from '../../core/constants/roles.constants';
import { FestivalWishesPanelComponent } from './festival-wishes-panel.component';

describe('FestivalWishesPanelComponent', () => {
  let httpMock: HttpTestingController;

  const mapping = (overrides: Partial<FestivalWishMapping>): FestivalWishMapping => ({
    id: 1,
    specialEventId: 7,
    festivalName: 'Diwali',
    userId: 2,
    userName: 'Asha',
    active: true,
    eventDate: '2026-11-08',
    ...overrides,
  });

  const create = (role = ROLE_ADMIN): FestivalWishesPanelComponent => {
    localStorage.setItem('fw_role', role);
    localStorage.setItem('fw_access_token', 'token');
    TestBed.configureTestingModule({
      imports: [FestivalWishesPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const component = TestBed.createComponent(FestivalWishesPanelComponent).componentInstance;
    component.festivalId = 7;
    component.festivalName = 'Diwali';
    return component;
  };

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('loads every mapping for the festival as an admin', () => {
    const component = create();
    component.ngOnChanges({ festivalId: {} as never });

    const list = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings`);
    expect(list.request.params.getAll('specialEventIds')).toEqual(['7']);
    list.flush({ content: [mapping({}), mapping({ id: 2, userId: 3, userName: 'Bala' })], page: 0, size: 1000, totalElements: 2, totalPages: 1, hasNext: false, hasPrevious: false });
    httpMock.expectOne(`${environment.apiUrl}/users?page=0&size=1000&searchKey=&sortBy=name&sortDir=asc`).flush({ content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false });

    expect(component.mappings.length).toBe(2);
    expect(component.activeCount).toBe(2);
  });

  it('keeps only this festival and reads the signed-in user wish for a non-admin', () => {
    const component = create('ROLE_USER');
    component.ngOnChanges({ festivalId: {} as never });

    const req = httpMock.expectOne((r) => r.url === `${environment.apiUrl}/festival-wish-mappings/me`);
    req.flush({
      content: [mapping({ id: 9 }), mapping({ id: 10, specialEventId: 8, festivalName: 'Holi' })],
      page: 0, size: 500, totalElements: 2, totalPages: 1, hasNext: false, hasPrevious: false,
    });

    expect(component.mappings.map((m) => m.id)).toEqual([9]);
    expect(component.myMapping?.id).toBe(9);
  });

  it('reloads when the festival changes', () => {
    const component = create();
    component.ngOnChanges({ festivalId: {} as never });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings`).flush({ content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/users`).flush({ content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false });

    component.festivalId = 8;
    component.ngOnChanges({ festivalId: {} as never });

    const next = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings`);
    expect(next.request.params.getAll('specialEventIds')).toEqual(['8']);
    next.flush({ content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false });
  });

  it('selects several people and posts them as one bulk request', () => {
    const component = create();
    component.ngOnChanges({ festivalId: {} as never });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings`).flush({ content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/users`).flush({
      content: [
        { id: 2, name: 'Asha', email: 'asha@example.com', role: 'ROLE_USER', relationShip: 'FRIEND' },
        { id: 3, name: 'Bala', email: 'bala@example.com', role: 'ROLE_USER', relationShip: 'FRIEND' },
      ],
      page: 0, size: 1000, totalElements: 2, totalPages: 1, hasNext: false, hasPrevious: false,
    });

    component.toggleNewUser(2);
    component.toggleNewUser(3);
    expect(component.newUserIds.size).toBe(2);

    component.addSelected();
    const bulk = httpMock.expectOne(`${environment.apiUrl}/festival-wish-mappings/bulk`);
    expect(bulk.request.body.specialEventId).toBe(7);
    expect(bulk.request.body.userIds.sort()).toEqual([2, 3]);
    bulk.flush({ created: 2, updated: 0, failed: 0 });

    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings`).flush({ content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false });
  });

  it('saves an edited wish with its note and link', () => {
    const component = create();
    component.ngOnChanges({ festivalId: {} as never });
    const list = mapping({ customMessage: 'old', wishesUrl: 'https://old.example.com' });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings`).flush({ content: [list], page: 0, size: 1000, totalElements: 1, totalPages: 1, hasNext: false, hasPrevious: false });
    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/users`).flush({ content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, hasNext: false, hasPrevious: false });

    component.startEdit(list);
    expect(component.editNote).toBe('old');
    component.editNote = 'Happy Diwali!';
    component.editWishesUrl = 'https://wishes.example.com';
    component.saveEdit(list);

    const save = httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings/with-image`);
    expect(save.request.body.get('customMessage')).toBe('Happy Diwali!');
    expect(save.request.body.get('wishesUrl')).toBe('https://wishes.example.com');
    save.flush(list);

    httpMock.expectOne((req) => req.url === `${environment.apiUrl}/festival-wish-mappings`).flush({ content: [list], page: 0, size: 1000, totalElements: 1, totalPages: 1, hasNext: false, hasPrevious: false });
  });
});
