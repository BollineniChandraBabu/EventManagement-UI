import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { EventItem } from '../../core/models/api.models';

interface CalendarDay { date: Date; inMonth: boolean; events: EventItem[]; }
@Component({ standalone: true, imports: [CommonModule], templateUrl: './calendar.component.html', styleUrl: './calendar.component.css' })
export class CalendarComponent {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  view: 'month' | 'week' | 'day' = 'month';
  cursor = this.startOfDay(new Date());
  events: EventItem[] = [];
  loading = true;
  constructor() { this.api.events(0, 250, '', 'eventDate', 'asc').pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { this.events = r.content ?? []; this.loading = false; }, error: () => this.loading = false }); }
  get title(): string { return this.view === 'day' ? this.cursor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : this.cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); }
  get days(): CalendarDay[] { const start = this.view === 'month' ? new Date(this.cursor.getFullYear(), this.cursor.getMonth(), 1) : this.startOfWeek(this.cursor); const count = this.view === 'month' ? 42 : this.view === 'week' ? 7 : 1; if (this.view === 'month') start.setDate(start.getDate() - start.getDay()); return Array.from({ length: count }, (_, i) => { const date = new Date(start); date.setDate(start.getDate() + i); return { date, inMonth: date.getMonth() === this.cursor.getMonth(), events: this.eventsFor(date) }; }); }
  previous(): void { this.cursor = this.shift(this.cursor, -1); }
  next(): void { this.cursor = this.shift(this.cursor, 1); }
  today(): void { this.cursor = this.startOfDay(new Date()); }
  setView(view: 'month' | 'week' | 'day'): void { this.view = view; }
  isToday(date: Date): boolean { return date.getTime() === this.startOfDay(new Date()).getTime(); }
  private eventsFor(date: Date): EventItem[] { return this.events.filter(event => { const eventDate = new Date(event.eventDate); return eventDate.getFullYear() === date.getFullYear() && eventDate.getMonth() === date.getMonth() && eventDate.getDate() === date.getDate(); }); }
  private shift(date: Date, amount: number): Date { const next = new Date(date); next.setDate(next.getDate() + (this.view === 'month' ? amount * 30 : this.view === 'week' ? amount * 7 : amount)); return next; }
  private startOfWeek(date: Date): Date { const value = this.startOfDay(date); value.setDate(value.getDate() - value.getDay()); return value; }
  private startOfDay(date: Date): Date { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
}
