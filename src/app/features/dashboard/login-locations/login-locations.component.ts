import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, Input, OnChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { LoginLocationChartPoint } from '../../../core/models/api.models';
import { SensitiveEmailPipe } from '../../../core/pipes/sensitive-email.pipe';
import { ApiService } from '../../../core/services/api.service';
import { SensitiveDataService } from '../../../core/services/sensitive-data.service';
import { SensitiveInfoToggleComponent } from '../../../shared/sensitive-info-toggle.component';
import {
  LocationSummary,
  LoginFilters,
  LoginKpis,
  LoginSortKey,
  Page,
  UserSummary,
  computeKpis,
  filterPoints,
  hasCoordinates,
  locationOf,
  mapsUrl,
  paginate,
  sortPoints,
  summarizeUsers,
  timeAgo,
  toCsv,
  topLocations,
  usersWithMultipleLocations
} from './login-locations.utils';

/**
 * Admin view of where people sign in from: summary numbers, top locations, searchable and
 * paginated history (table on desktop, cards on phones), a map per login and CSV export.
 */
@Component({
  selector: 'app-login-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe, SensitiveInfoToggleComponent],
  templateUrl: './login-locations.component.html',
  styleUrl: './login-locations.component.css'
})
export class LoginLocationsComponent implements OnChanges {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly sensitive = inject(SensitiveDataService);

  @Input({ required: true }) startDate!: string;
  @Input({ required: true }) endDate!: string;

  readonly pageSizes = [10, 25, 50];
  readonly sortOptions: Array<{ id: LoginSortKey; label: string }> = [
    { id: 'newest', label: 'Newest first' },
    { id: 'oldest', label: 'Oldest first' },
    { id: 'user', label: 'User A–Z' },
    { id: 'location', label: 'Location A–Z' }
  ];

  loading = false;
  loadFailed = false;
  truncated = false;

  kpis: LoginKpis = { logins: 0, users: 0, locations: 0, ipAddresses: 0 };
  topLocationList: LocationSummary[] = [];
  users: UserSummary[] = [];
  multiLocationUserCount = 0;

  filters: LoginFilters = { search: '', userEmail: '', multipleLocationsOnly: false };
  sortKey: LoginSortKey = 'newest';
  pageSize = this.pageSizes[0];
  pageIndex = 0;

  filtered: LoginLocationChartPoint[] = [];
  currentPage: Page<LoginLocationChartPoint> = paginate([], 0, this.pageSize);

  selectedPoint: LoginLocationChartPoint | null = null;
  mapFrameUrl: SafeResourceUrl | null = null;

  /** Everything returned for the date range, before filters (the template uses it for empty states). */
  points: LoginLocationChartPoint[] = [];
  private readonly reload$ = new Subject<void>();

  constructor() {
    this.reload$
      .pipe(
        tap(() => {
          this.loading = true;
          this.loadFailed = false;
        }),
        // switchMap drops the answer of an older request when the date range changes quickly
        switchMap(() =>
          this.api.getLoginLocationChart(this.startDate, this.endDate).pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.loading = false;
        this.loadFailed = response === null;
        this.truncated = response?.truncated === true;
        this.points = response?.points ?? [];
        this.onDataChanged();
      });
  }

  ngOnChanges(): void {
    this.reload();
  }

  reload(): void {
    this.reload$.next();
  }

  // ------------------------------------------------------------------ filters, sorting, paging

  get hasActiveFilters(): boolean {
    return Boolean(this.filters.search.trim() || this.filters.userEmail || this.filters.multipleLocationsOnly);
  }

  onSearch(value: string): void {
    this.filters = { ...this.filters, search: value };
    this.applyFilters();
  }

  onUserChange(email: string): void {
    this.filters = { ...this.filters, userEmail: email };
    this.applyFilters();
  }

  toggleMultipleLocations(): void {
    this.filters = { ...this.filters, multipleLocationsOnly: !this.filters.multipleLocationsOnly };
    this.applyFilters();
  }

  /** Clicking a top location filters the history to it; clicking it again clears the filter. */
  filterByLocation(location: string): void {
    this.onSearch(this.filters.search === location ? '' : location);
  }

  clearFilters(): void {
    this.filters = { search: '', userEmail: '', multipleLocationsOnly: false };
    this.applyFilters();
  }

  onSortChange(key: LoginSortKey): void {
    this.sortKey = key;
    this.applyFilters();
  }

  onPageSizeChange(size: number | string): void {
    this.pageSize = Number(size);
    this.goToPage(0);
  }

  goToPage(index: number): void {
    this.pageIndex = index;
    this.currentPage = paginate(this.filtered, this.pageIndex, this.pageSize);
    this.pageIndex = this.currentPage.page;
  }

  // ------------------------------------------------------------------ map

  openMap(point: LoginLocationChartPoint): void {
    if (!hasCoordinates(point)) {
      return;
    }
    this.selectedPoint = point;
    this.mapFrameUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${point.latitude},${point.longitude}&z=11&output=embed`
    );
  }

  @HostListener('document:keydown.escape')
  closeMap(): void {
    this.selectedPoint = null;
    this.mapFrameUrl = null;
  }

  // ------------------------------------------------------------------ export

  exportCsv(): void {
    const header = ['User', 'Email', 'Logged in at', 'Location', 'IP address', 'Latitude', 'Longitude'];
    const rows = this.filtered.map((point) => [
      point.userName,
      this.sensitive.maskEmail(point.email), // exports exactly what is visible on screen
      point.loggedInAt,
      this.location(point),
      point.ipAddress,
      point.latitude,
      point.longitude
    ]);
    // BOM so Excel reads the file as UTF-8
    const blob = new Blob(['\uFEFF', toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `login-locations_${this.startDate}_to_${this.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------------ template helpers

  location(point: LoginLocationChartPoint): string {
    return locationOf(point);
  }

  canShowMap(point: LoginLocationChartPoint): boolean {
    return hasCoordinates(point);
  }

  externalMapUrl(point: LoginLocationChartPoint): string {
    return mapsUrl(point);
  }

  relativeTime(point: LoginLocationChartPoint): string {
    return timeAgo(point.loggedInAt);
  }

  trackByPoint(_: number, point: LoginLocationChartPoint): string {
    return `${point.email}|${point.loggedInAt}|${point.ipAddress}`;
  }

  // ------------------------------------------------------------------ internals

  private onDataChanged(): void {
    this.kpis = computeKpis(this.points);
    this.topLocationList = topLocations(this.points, 5);
    this.users = summarizeUsers(this.points);
    this.multiLocationUserCount = usersWithMultipleLocations(this.points).size;
    if (this.filters.userEmail && !this.users.some((user) => user.email === this.filters.userEmail)) {
      this.filters = { ...this.filters, userEmail: '' }; // that user has no logins in the new range
    }
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filtered = sortPoints(filterPoints(this.points, this.filters), this.sortKey);
    this.goToPage(0);
  }
}
