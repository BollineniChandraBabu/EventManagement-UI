import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, distinctUntilChanged, switchMap } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { EventItem, FestivalItem } from '../../core/models/api.models';

interface CalendarItem {
  date: string;
  title: string;
  detail: string;
  type: 'event' | 'festival';
}

interface CalendarDay { date: Date; inMonth: boolean; events: CalendarItem[]; }
@Component({ standalone: true, imports: [CommonModule], templateUrl: './calendar.component.html', styleUrl: './calendar.component.css' })
export class CalendarComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  view: 'month' | 'week' | 'day' = 'month';
  cursor = this.startOfDay(new Date());
  events: EventItem[] = [];
  festivals: FestivalItem[] = [];
  loadingEvents = true;
  loadingFestivals = true;
  private readonly monthSubject = new BehaviorSubject<number>(this.cursor.getMonth() + 1);

  constructor() {
    this.api.events(0, 250, '', 'eventDate', 'asc').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => { this.events = response.content ?? []; this.loadingEvents = false; },
      error: () => this.loadingEvents = false
    });

    this.monthSubject.pipe(
      distinctUntilChanged(),
      switchMap(month => {
        this.loadingFestivals = true;
        return this.api.festivals(month, 0, 200, '', 'eventDate', 'asc');
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: festivals => { this.festivals = festivals.filter(festival => festival.active !== false); this.loadingFestivals = false; },
      error: () => { this.festivals = []; this.loadingFestivals = false; }
    });
  }

  get loading(): boolean { return this.loadingEvents || this.loadingFestivals; }
  get title(): string { return this.view === 'day' ? this.cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : this.cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
  get days(): CalendarDay[] { const start = this.view === 'month' ? new Date(this.cursor.getFullYear(), this.cursor.getMonth(), 1) : this.startOfWeek(this.cursor); const count = this.view === 'month' ? 42 : this.view === 'week' ? 7 : 1; if (this.view === 'month') start.setDate(start.getDate() - start.getDay()); return Array.from({ length: count }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return { date, inMonth: date.getMonth() === this.cursor.getMonth(), events: this.eventsFor(date) }; }); }
  previous(): void { this.setCursor(this.shift(this.cursor, -1)); }
  next(): void { this.setCursor(this.shift(this.cursor, 1)); }
  today(): void { this.setCursor(this.startOfDay(new Date())); }
  setView(view: 'month' | 'week' | 'day'): void { this.view = view; }
  isToday(date: Date): boolean { return date.getTime() === this.startOfDay(new Date()).getTime(); }
  private eventsFor(date: Date): CalendarItem[] {
    const scheduledEvents = this.events.map(event => ({ date: event.eventDate, title: event.eventType || 'Event', detail: event.userName || 'Celebration', type: 'event' as const }));
    const festivals = this.festivals.map(festival => ({ date: festival.eventDate, title: festival.eventName || 'Festival', detail: 'Festival', type: 'festival' as const }));

    return [...scheduledEvents, ...festivals].filter(event => this.isSameDate(event.date, date));
  }

  private setCursor(date: Date): void {
    const previousMonth = this.cursor.getMonth();
    const previousYear = this.cursor.getFullYear();
    this.cursor = date;
    if (date.getMonth() !== previousMonth || date.getFullYear() !== previousYear) {
      this.monthSubject.next(date.getMonth() + 1);
    }
  }

  private isSameDate(dateValue: string, date: Date): boolean {
    const eventDate = this.parseCalendarDate(dateValue);
    return eventDate.getFullYear() === date.getFullYear() && eventDate.getMonth() === date.getMonth() && eventDate.getDate() === date.getDate();
  }

  private parseCalendarDate(dateValue: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      const [year, month, day] = dateValue.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(dateValue);
  }
  private shift(date: Date, amount: number): Date { const next = new Date(date); next.setDate(next.getDate() + (this.view === 'month' ? amount * 30 : this.view === 'week' ? amount * 7 : amount)); return next; }
  private startOfWeek(date: Date): Date { const value = this.startOfDay(date); value.setDate(value.getDate() - value.getDay()); return value; }
  private startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
}
