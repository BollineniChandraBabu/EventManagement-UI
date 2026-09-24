import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, distinctUntilChanged, switchMap } from 'rxjs';
import { CalendarResItem } from '../../core/models/api.models';
import { ApiService } from '../../core/services/api.service';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  events: CalendarResItem[];
}

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
  view: 'month' | 'week' | 'day' = 'month';
  cursor = this.startOfDay(new Date());
  events: CalendarResItem[] = [];
  selectedEvent: CalendarResItem | null = null;
  loadingEvents = true;
  private readonly monthSubject = new BehaviorSubject<number>(this.cursor.getMonth() + 1);

  constructor() {
    this.monthSubject.pipe(
      distinctUntilChanged(),
      switchMap(month => {
        this.loadingEvents = true;
        return this.api.calendar(month);
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: festivals => {
        this.events = festivals.filter(festival => festival.active !== false);
        this.loadingEvents = false;
      },
      error: () => {
        this.events = [];
        this.loadingEvents = false;
      }
    });
  }

  get loading(): boolean {
    return this.loadingEvents;
  }

  get title(): string {
    return this.view === 'day'
      ? this.cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : this.cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  get days(): CalendarDay[] {
    if (this.view === 'month') {
      const year = this.cursor.getFullYear();
      const month = this.cursor.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      const dayCount = new Date(year, month + 1, 0).getDate();
      const cellCount = Math.ceil((firstDayOfMonth.getDay() + dayCount) / 7) * 7;
      const start = new Date(firstDayOfMonth);
      start.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());

      return Array.from({ length: cellCount }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return {
          date,
          inMonth: date.getMonth() === month && date.getFullYear() === year,
          events: this.eventsFor(date)
        };
      });
    }

    const start = this.view === 'week' ? this.startOfWeek(this.cursor) : this.cursor;
    const count = this.view === 'week' ? 7 : 1;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { date, inMonth: true, events: this.eventsFor(date) };
    });
  }

  previous(): void {
    this.setCursor(this.shift(this.cursor, -1));
  }

  next(): void {
    this.setCursor(this.shift(this.cursor, 1));
  }

  today(): void {
    this.setCursor(this.startOfDay(new Date()));
  }

  setView(view: 'month' | 'week' | 'day'): void {
    this.view = view;
  }

  isToday(date: Date): boolean {
    return date.getTime() === this.startOfDay(new Date()).getTime();
  }

  isCelebration(event: CalendarResItem): boolean {
    return ['festival', 'birthday', 'anniversary'].includes(this.eventType(event));
  }

  eventIcon(event: CalendarResItem): string {
    switch (this.eventType(event)) {
      case 'birthday': return 'fa-cake-candles';
      case 'anniversary': return 'fa-party-horn';
      default: return 'fa-spa';
    }
  }

  eventTheme(event: CalendarResItem): string {
    const eventType = this.eventType(event);
    return ['festival', 'birthday', 'anniversary'].includes(eventType) ? eventType : 'default';
  }

  celebrationDescription(event: CalendarResItem): string {
    switch (this.eventType(event)) {
      case 'birthday': return 'Make their day extra sweet with a thoughtful birthday wish.';
      case 'anniversary': return 'Celebrate this special milestone and the memories shared together.';
      default: return 'Celebrate this festival with joy and warm wishes.';
    }
  }

  openCelebration(celebration: CalendarResItem, event: MouseEvent): void {
    event.stopPropagation();
    this.selectedEvent = celebration;
  }

  closeCelebration(): void {
    this.selectedEvent = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeCelebration();
  }

  private eventsFor(date: Date): CalendarResItem[] {
    const events = [ ...this.events ];
    return [...events].filter(event => this.isSameDate(event.eventDate, date));
  }

  private eventType(event: CalendarResItem): string {
    return event.eventType?.trim().toLowerCase() ?? '';
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
    return eventDate.getMonth() === date.getMonth()
      && eventDate.getDate() === date.getDate();
  }

  private parseCalendarDate(dateValue: string): Date {
    const datePart = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (datePart) {
      return new Date(Number(datePart[1]), Number(datePart[2]) - 1, Number(datePart[3]));
    }

    return new Date(dateValue);
  }

  private shift(date: Date, amount: number): Date {
    const next = new Date(date);
    if (this.view === 'month') {
      next.setMonth(next.getMonth() + amount);
    } else {
      next.setDate(next.getDate() + (this.view === 'week' ? amount * 7 : amount));
    }
    return next;
  }

  private startOfWeek(date: Date): Date {
    const value = this.startOfDay(date);
    value.setDate(value.getDate() - value.getDay());
    return value;
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
}
