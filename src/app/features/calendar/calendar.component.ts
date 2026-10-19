import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of } from 'rxjs';
import { CalendarResItem } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';
import {
  CalendarDay,
  CalendarEntry,
  CalendarView,
  CelebrationKind,
  UpcomingEntry,
  addDays,
  addMonths,
  agendaGroups,
  buildDays,
  countByKind,
  monthsToLoad,
  parseCalendarDate,
  relativeDayLabel,
  startOfDay,
  startOfWeek,
  upcomingEntries,
  visibleDays
} from './calendar.utils';

/** A day plus what fits in its month-grid cell. */
interface DayView extends CalendarDay {
  visible: CalendarEntry[];
  hiddenCount: number;
}

interface KindOption {
  id: CelebrationKind;
  label: string;
  icon: string;
}

const MAX_CHIPS_PER_CELL = 3;
const SWIPE_MIN_DISTANCE_PX = 60;
const ALL_KINDS: CelebrationKind[] = ['festival', 'birthday', 'anniversary', 'other'];

@Component({
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly views: Array<{ id: CalendarView; label: string }> = [
    { id: 'month', label: 'Month' },
    { id: 'week', label: 'Week' },
    { id: 'day', label: 'Day' },
    { id: 'agenda', label: 'Agenda' }
  ];
  readonly kindOptions: KindOption[] = [
    { id: 'festival', label: 'Festivals', icon: 'fa-spa' },
    { id: 'birthday', label: 'Birthdays', icon: 'fa-cake-candles' },
    { id: 'anniversary', label: 'Anniversaries', icon: 'fa-heart' }
  ];
  readonly today = startOfDay(new Date());

  view: CalendarView = 'month';
  cursor = this.today;
  enabledKinds = new Set<CelebrationKind>(ALL_KINDS);

  days: DayView[] = [];
  agenda: DayView[] = [];
  upcoming: UpcomingEntry[] = [];
  counts: Record<CelebrationKind, number> = { festival: 0, birthday: 0, anniversary: 0, other: 0 };

  loading = false;
  loadError = false;
  selectedEntry: { entry: CalendarEntry; date: Date } | null = null;
  selectedDay: DayView | null = null;

  /** Loaded events by month number (1-12). Events repeat yearly, so one entry serves every year. */
  private readonly monthCache = new Map<number, CalendarResItem[]>();
  private readonly monthsInFlight = new Set<number>();
  private touchStart: { x: number; y: number } | null = null;

  constructor() {
    this.refresh();
  }

  // ------------------------------------------------------------------ header

  get title(): string {
    switch (this.view) {
      case 'day':
        return this.cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      case 'week': {
        const start = startOfWeek(this.cursor);
        const end = addDays(start, 6);
        const sameMonth = start.getMonth() === end.getMonth();
        const startText = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const endText = end.toLocaleDateString(undefined, sameMonth ? { day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startText} – ${endText}`;
      }
      default:
        return this.cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
  }

  get cursorIso(): string {
    const month = `${this.cursor.getMonth() + 1}`.padStart(2, '0');
    const day = `${this.cursor.getDate()}`.padStart(2, '0');
    return `${this.cursor.getFullYear()}-${month}-${day}`;
  }

  get isCurrentPeriod(): boolean {
    return visibleDays(this.view, this.cursor).some((day) => day.getTime() === this.today.getTime());
  }

  get totalInRange(): number {
    return this.counts.festival + this.counts.birthday + this.counts.anniversary + this.counts.other;
  }

  // ------------------------------------------------------------------ navigation

  previous(): void {
    this.moveCursor(-1);
  }

  next(): void {
    this.moveCursor(1);
  }

  goToToday(): void {
    this.setCursor(this.today);
  }

  jumpTo(value: string): void {
    const date = value ? parseCalendarDate(value) : null;
    if (date && !Number.isNaN(date.getTime())) {
      this.setCursor(date);
    }
  }

  setView(view: CalendarView): void {
    if (view !== this.view) {
      this.view = view;
      this.refresh();
    }
  }

  reload(): void {
    this.refresh(true);
  }

  onTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this.touchStart = { x: touch.clientX, y: touch.clientY };
  }

  /** Swipe left = next period, swipe right = previous (mainly for phones). */
  onTouchEnd(event: TouchEvent): void {
    if (!this.touchStart) {
      return;
    }
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - this.touchStart.x;
    const deltaY = touch.clientY - this.touchStart.y;
    this.touchStart = null;
    if (Math.abs(deltaX) >= SWIPE_MIN_DISTANCE_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      deltaX < 0 ? this.next() : this.previous();
    }
  }

  // ------------------------------------------------------------------ filters

  isKindEnabled(kind: CelebrationKind): boolean {
    return this.enabledKinds.has(kind);
  }

  toggleKind(kind: CelebrationKind): void {
    const next = new Set(this.enabledKinds);
    if (next.has(kind)) {
      const stillEnabled = this.kindOptions.filter((option) => option.id !== kind && next.has(option.id));
      if (stillEnabled.length === 0) {
        return; // keep at least one type visible
      }
      next.delete(kind);
    } else {
      next.add(kind);
    }
    this.enabledKinds = next;
    this.rebuild();
  }

  // ------------------------------------------------------------------ dialogs

  openEntry(entry: CalendarEntry, date: Date, event?: Event): void {
    event?.stopPropagation();
    this.selectedEntry = { entry, date };
  }

  closeEntry(): void {
    this.selectedEntry = null;
  }

  openDay(day: DayView, event?: Event): void {
    event?.stopPropagation();
    if (day.entries.length > 0) {
      this.selectedDay = day;
    }
  }

  closeDay(): void {
    this.selectedDay = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedEntry) {
      this.closeEntry();
    } else {
      this.closeDay();
    }
  }

  // ------------------------------------------------------------------ template helpers

  relativeLabel(daysUntil: number): string {
    return relativeDayLabel(daysUntil);
  }

  kindLabel(kind: CelebrationKind): string {
    switch (kind) {
      case 'festival': return 'Festival';
      case 'birthday': return 'Birthday';
      case 'anniversary': return 'Anniversary';
      default: return 'Event';
    }
  }

  description(kind: CelebrationKind): string {
    switch (kind) {
      case 'birthday': return 'Make their day extra sweet with a thoughtful birthday wish.';
      case 'anniversary': return 'Celebrate this special milestone and the memories shared together.';
      case 'festival': return 'Celebrate this festival with joy and warm wishes.';
      default: return 'Don’t forget to mark this day.';
    }
  }

  dayLabel(day: DayView): string {
    const count = day.entries.length;
    const date = day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    return count === 0 ? date : `${date}, ${count} ${count === 1 ? 'event' : 'events'}`;
  }

  trackByDay(_: number, day: CalendarDay): string {
    return day.key;
  }

  trackByEntry(_: number, entry: CalendarEntry): string {
    return entry.key;
  }

  trackByUpcoming(_: number, item: UpcomingEntry): string {
    return `${item.entry.key}-${item.date.getTime()}`;
  }

  // ------------------------------------------------------------------ data loading

  private moveCursor(direction: 1 | -1): void {
    switch (this.view) {
      case 'month':
      case 'agenda':
        this.setCursor(addMonths(this.cursor, direction));
        break;
      case 'week':
        this.setCursor(addDays(this.cursor, 7 * direction));
        break;
      case 'day':
        this.setCursor(addDays(this.cursor, direction));
        break;
    }
  }

  private setCursor(date: Date): void {
    this.cursor = startOfDay(date);
    this.refresh();
  }

  /** Shows what is cached right away and fetches only the months that are still missing. */
  private refresh(forceReload = false): void {
    if (forceReload) {
      this.monthCache.clear();
    }
    this.rebuild();

    const missing = monthsToLoad(this.view, this.cursor, this.today).filter(
      (month) => !this.monthCache.has(month) && !this.monthsInFlight.has(month)
    );
    if (missing.length === 0) {
      return;
    }

    missing.forEach((month) => this.monthsInFlight.add(month));
    this.loading = true;
    this.loadError = false;

    forkJoin(
      missing.map((month) =>
        this.api.calendar(month).pipe(
          map((items) => ({ month, items })),
          catchError(() => of({ month, items: null }))
        )
      )
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        for (const { month, items } of results) {
          this.monthsInFlight.delete(month);
          if (items) {
            this.monthCache.set(month, items);
          } else {
            this.loadError = true;
          }
        }
        this.loading = this.monthsInFlight.size > 0;
        this.rebuild();
      });
  }

  private rebuild(): void {
    const items = [...this.monthCache.values()].flat();
    const focusMonth = this.view === 'month' || this.view === 'agenda' ? this.cursor : null;
    const allKindDays = buildDays(visibleDays(this.view, this.cursor), items, new Set(ALL_KINDS), this.today, focusMonth);

    this.counts = countByKind(allKindDays.filter((day) => day.inMonth));
    this.days = allKindDays.map((day) => this.toDayView(day));
    this.agenda = agendaGroups(this.days) as DayView[];
    this.upcoming = upcomingEntries(items, this.today, this.enabledKinds);
  }

  private toDayView(day: CalendarDay): DayView {
    const entries = day.entries.filter((entry) => this.enabledKinds.has(entry.kind));
    const limit = this.view === 'month' ? MAX_CHIPS_PER_CELL : entries.length;
    return { ...day, entries, visible: entries.slice(0, limit), hiddenCount: Math.max(0, entries.length - limit) };
  }
}
