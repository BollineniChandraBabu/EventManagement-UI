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
  toIsoDate,
  upcomingEntries,
  visibleDays
} from './calendar.utils';
import { FestivalWishesPanelComponent } from './festival-wishes-panel.component';

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
  imports: [CommonModule, FestivalWishesPanelComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  private static readonly VIEW_STORAGE_KEY = 'fw_calendar_view';
  private static readonly KINDS_STORAGE_KEY = 'fw_calendar_kinds';

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
  copiedEntryKey: string | null = null;

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
    this.restorePreferences();
    this.refresh();
  }

  // ------------------------------------------------------------------ preferences

  private restorePreferences(): void {
    try {
      const storedView = localStorage.getItem(CalendarComponent.VIEW_STORAGE_KEY);
      if (storedView === 'month' || storedView === 'week' || storedView === 'day' || storedView === 'agenda') {
        this.view = storedView;
      }
      const storedKinds = localStorage.getItem(CalendarComponent.KINDS_STORAGE_KEY);
      if (storedKinds) {
        const parsed = storedKinds.split(',').filter((kind): kind is CelebrationKind => (ALL_KINDS as string[]).includes(kind));
        if (parsed.length) {
          this.enabledKinds = new Set(parsed);
        }
      }
    } catch {
      // A blocked or unavailable localStorage just means the defaults are used.
    }
  }

  private persistPreferences(): void {
    try {
      localStorage.setItem(CalendarComponent.VIEW_STORAGE_KEY, this.view);
      localStorage.setItem(CalendarComponent.KINDS_STORAGE_KEY, [...this.enabledKinds].join(','));
    } catch {
      // Ignore storage failures; the calendar still works for this session.
    }
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
      this.persistPreferences();
      this.refresh();
    }
  }

  /** Steps the cursor by a whole year (month and agenda keep the month/day; week keeps the week). */
  jumpYear(delta: 1 | -1): void {
    this.setCursor(addMonths(this.cursor, 12 * delta));
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
    this.persistPreferences();
    this.rebuild();
  }

  // ------------------------------------------------------------------ dialogs

  openEntry(entry: CalendarEntry, date: Date, event?: Event): void {
    event?.stopPropagation();
    this.selectedEntry = { entry, date };
  }

  closeEntry(): void {
    this.selectedEntry = null;
    this.copiedEntryKey = null;
  }

  /** Festival rows carry the special-event id in the calendar response, used to look up wishes. */
  festivalIdOf(entry: CalendarEntry): number {
    return entry.source.id;
  }

  // ------------------------------------------------------------------ export / share

  private static readonly ICS_DAYS = 1;

  /** A downloadable .ics file for the selected day's events (opens in any calendar app). */
  downloadIcs(date: Date): void {
    const entries = this.entriesOn(date);
    if (!entries.length) {
      return;
    }
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Family Wishes//Calendar//EN',
      'CALSCALE:GREGORIAN'
    ];
    for (const entry of entries) {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${entry.key}-${toIsoDate(date)}@family-wishes`,
        `DTSTAMP:${this.icsStamp(new Date())}`,
        `DTSTART;VALUE=DATE:${toIsoDate(date)}`,
        `DTEND;VALUE=DATE:${toIsoDate(addDays(date, CalendarComponent.ICS_DAYS))}`,
        `SUMMARY:${this.icsEscape(entry.title)}`,
        `DESCRIPTION:${this.icsEscape(this.description(entry.kind))}`,
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');

    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.icsFileName(date)}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /** Opens Google Calendar's "add event" page for the selected day's first event. */
  googleCalendarUrl(date: Date, entry: CalendarEntry): string {
    const start = toIsoDate(date);
    const end = toIsoDate(addDays(date, CalendarComponent.ICS_DAYS));
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: entry.title,
      dates: `${start.replace(/-/g, '')}/${end.replace(/-/g, '')}`,
      details: this.description(entry.kind)
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /** Copies a short text summary of the day to the clipboard. */
  copyDaySummary(date: Date): void {
    const entries = this.entriesOn(date);
    if (!entries.length) {
      return;
    }
    const dateText = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const text = [dateText, ...entries.map((entry) => `• ${entry.title}${entry.subtitle ? ` (${entry.subtitle})` : ''}`)].join('\n');
    navigator.clipboard?.writeText(text).then(
      () => (this.copiedEntryKey = toIsoDate(date)),
      () => (this.copiedEntryKey = null)
    );
  }

  private entriesOn(date: Date): CalendarEntry[] {
    const day = this.days.find((candidate) => candidate.key === toIsoDate(date));
    if (day) {
      return day.entries;
    }
    const selected = this.selectedEntry;
    return selected && selected.date.getTime() === date.getTime() ? [selected.entry] : [];
  }

  private icsStamp(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  private icsFileName(date: Date): string {
    return `family-wishes-${toIsoDate(date)}`;
  }

  private icsEscape(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
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
