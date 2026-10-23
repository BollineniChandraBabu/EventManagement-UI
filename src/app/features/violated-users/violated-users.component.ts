import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import {
  ViolatedUserEmailSummary,
  ViolatedUserInfo,
  ViolatedUserIpSummary,
  ViolatedUserMapPoint,
  ViolatedUsersDashboardResponse
} from '../../core/models/api.models';
import { SensitiveEmailPipe } from '../../core/pipes/sensitive-email.pipe';
import { ApiService } from '../../core/services/api.service';
import { SensitiveDataService } from '../../core/services/sensitive-data.service';
import { toCsv } from '../../core/utils/csv';
import { SensitiveInfoToggleComponent } from '../../shared/sensitive-info-toggle.component';
import {
  ChartBar,
  RangePreset,
  Suspicion,
  coordinatesOf,
  ipLookupFailed,
  locationLabel,
  presetFor,
  rangeFor,
  riskBadges,
  suspicionOf,
  toChartBars,
  toDateInputValue
} from './violated-users.utils';

const SEARCH_DEBOUNCE_MS = 300;
/** Show a value above every bar only while there are few enough to read. */
const MAX_BARS_WITH_LABELS = 14;

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, SensitiveEmailPipe, SensitiveInfoToggleComponent],
  templateUrl: './violated-users.component.html',
  styleUrl: './violated-users.component.css'
})
export class ViolatedUsersComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly sensitive = inject(SensitiveDataService);

  readonly now = new Date();
  readonly maxDate = toDateInputValue(this.now);
  readonly presets: Array<{ id: Exclude<RangePreset, 'custom'>; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: '7 days' },
    { id: '30d', label: '30 days' }
  ];
  readonly pageSizes = [10, 25, 50, 100];

  startDate = rangeFor('7d', this.now).startDate;
  endDate = this.maxDate;
  activePreset: RangePreset = '7d';
  search = '';
  includeIpInfo = true;
  size = 25;
  page = 0;

  loading = false;
  loadFailed = false;
  data: ViolatedUsersDashboardResponse | null = null;
  bars: ChartBar[] = [];

  selectedPoint: (ViolatedUserInfo | ViolatedUserMapPoint) | null = null;
  mapFrameUrl: SafeResourceUrl | null = null;

  private readonly load$ = new Subject<number>();
  private readonly search$ = new Subject<string>();

  constructor() {
    this.load$
      .pipe(
        tap((page) => {
          this.page = page;
          this.loading = true;
          this.loadFailed = false;
        }),
        // switchMap drops the answer of an older request when filters change quickly
        switchMap((page) =>
          this.api
            .getViolatedUsersDashboard(this.startDate, this.endDate, page, this.size, this.includeIpInfo, this.search)
            .pipe(catchError(() => of(null)))
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.loading = false;
        this.loadFailed = response === null;
        if (response) {
          this.data = response;
          this.bars = toChartBars(response.chartPoints ?? []);
        }
      });

    this.search$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.load(0));

    this.load(0);
  }

  // ------------------------------------------------------------------ data accessors

  get users(): ViolatedUserInfo[] {
    return this.data?.users ?? [];
  }
  get totalAttempts(): number {
    return this.data?.totalAttempts ?? 0;
  }
  get totalElements(): number {
    return this.data?.totalElements ?? 0;
  }
  get totalPages(): number {
    return Math.max(1, this.data?.totalPages ?? 1);
  }
  get topIps(): ViolatedUserIpSummary[] {
    return this.data?.topIps ?? [];
  }
  get topEmails(): ViolatedUserEmailSummary[] {
    return this.data?.topEmails ?? [];
  }
  /** Older servers do not send the summary numbers; the rest of the screen still works. */
  get hasSummary(): boolean {
    return this.data?.uniqueIps !== undefined;
  }
  get suspiciousIpCount(): number {
    return this.topIps.filter((ip) => suspicionOf(ip) !== 'low').length;
  }
  get mapPointCount(): number {
    return this.data?.mapPoints?.length ?? 0;
  }
  get showBarLabels(): boolean {
    return this.bars.length <= MAX_BARS_WITH_LABELS;
  }
  get firstRow(): number {
    return this.totalElements ? this.page * this.size + 1 : 0;
  }
  get lastRow(): number {
    return Math.min((this.page + 1) * this.size, this.totalElements);
  }
  get hasFilters(): boolean {
    return this.search.trim().length > 0;
  }
  get maxIpAttempts(): number {
    return Math.max(1, ...this.topIps.map((ip) => ip.attempts));
  }
  get maxEmailAttempts(): number {
    return Math.max(1, ...this.topEmails.map((email) => email.attempts));
  }

  // ------------------------------------------------------------------ filters

  load(page = this.page): void {
    this.load$.next(Math.max(0, page));
  }

  pickPreset(preset: Exclude<RangePreset, 'custom'>): void {
    const range = rangeFor(preset, new Date());
    this.startDate = range.startDate;
    this.endDate = range.endDate;
    this.activePreset = preset;
    this.load(0);
  }

  onDatesChanged(): void {
    if (this.startDate > this.endDate) {
      this.endDate = this.startDate;
    }
    this.activePreset = presetFor({ startDate: this.startDate, endDate: this.endDate }, new Date());
    this.load(0);
  }

  onSearchInput(value: string): void {
    this.search = value;
    this.search$.next(value.trim());
  }

  clearSearch(): void {
    this.search = '';
    this.load(0);
  }

  /** Clicking an IP or email in the summaries narrows the list to it; click again to undo. */
  filterBy(value: string): void {
    this.search = this.search.trim() === value ? '' : value;
    this.load(0);
  }

  isFilteredBy(value: string): boolean {
    return this.search.trim() === value;
  }

  onPageSizeChange(size: number | string): void {
    this.size = Number(size);
    this.load(0);
  }

  // ------------------------------------------------------------------ rows

  locationOf(user: ViolatedUserInfo | ViolatedUserMapPoint): string {
    return locationLabel(user);
  }
  riskOf(user: ViolatedUserInfo): string[] {
    return riskBadges(user);
  }
  lookupFailed(user: ViolatedUserInfo): boolean {
    return ipLookupFailed(user);
  }
  canShowMap(user: ViolatedUserInfo | ViolatedUserMapPoint): boolean {
    return coordinatesOf(user) !== null;
  }
  suspicionOf(ip: ViolatedUserIpSummary): Suspicion {
    return suspicionOf(ip);
  }
  maskPassword(user: ViolatedUserInfo): string {
    return this.sensitive.mask(user.password);
  }
  trackByRow(_: number, user: ViolatedUserInfo): number {
    return user.id;
  }

  externalMapUrl(user: ViolatedUserInfo | ViolatedUserMapPoint): string {
    const point = coordinatesOf(user);
    return point ? `https://www.google.com/maps?q=${point.latitude},${point.longitude}` : '#';
  }

  // ------------------------------------------------------------------ map dialog

  openMap(user: ViolatedUserInfo | ViolatedUserMapPoint): void {
    const point = coordinatesOf(user);
    if (!point) {
      return;
    }
    this.selectedPoint = user;
    this.mapFrameUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.google.com/maps?q=${point.latitude},${point.longitude}&z=9&output=embed`
    );
  }

  @HostListener('document:keydown.escape')
  closeMap(): void {
    this.selectedPoint = null;
    this.mapFrameUrl = null;
  }

  // ------------------------------------------------------------------ export

  /** Exports the rows on screen exactly as shown (emails and passwords stay masked while hidden). */
  exportCsv(): void {
    const header = ['Email', 'Attempted password', 'Attempted at', 'IP address', 'Location', 'ISP', 'Flags'];
    const rows = this.users.map((user) => [
      this.sensitive.maskEmail(user.email),
      this.sensitive.mask(user.password),
      user.loggedInAt,
      user.ipAddress,
      this.locationOf(user),
      user.ipInfo?.isp,
      this.riskOf(user).join('; ')
    ]);
    const blob = new Blob(['\uFEFF', toCsv(header, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed-logins_${this.startDate}_to_${this.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
