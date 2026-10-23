import { isLeapYear, parseCalendarDate, startOfDay } from '../calendar/calendar.utils';

export interface NextOccurrence {
  date: Date;
  daysUntil: number;
}

/**
 * When the event email will next be sent. Recurring events repeat on the same month and day every
 * year (Feb 29 falls on Feb 28 in non-leap years); one-time events happen only on their date.
 * Returns null when the date is missing or invalid, or a one-time event is already in the past.
 */
export function nextOccurrence(eventDate: string, recurring: boolean, today: Date): NextOccurrence | null {
  if (!eventDate) {
    return null;
  }
  const start = parseCalendarDate(eventDate);
  if (Number.isNaN(start.getTime())) {
    return null;
  }
  const from = startOfDay(today);

  if (!recurring) {
    return start >= from ? { date: start, daysUntil: daysBetween(from, start) } : null;
  }
  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    const day = start.getMonth() === 1 && start.getDate() === 29 && !isLeapYear(year) ? 28 : start.getDate();
    const candidate = new Date(year, start.getMonth(), day);
    if (candidate >= from) {
      return { date: candidate, daysUntil: daysBetween(from, candidate) };
    }
  }
  return null;
}

export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  // Date.UTC avoids an off-by-one when a daylight-saving change falls between the two dates.
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / msPerDay);
}

export function daysUntilText(daysUntil: number): string {
  if (daysUntil <= 0) return 'today';
  if (daysUntil === 1) return 'tomorrow';
  return `in ${daysUntil} days`;
}

/** Font Awesome icon for an event type code, so each type is recognisable at a glance. */
export function eventTypeIcon(code: string | undefined): string {
  switch ((code ?? '').toUpperCase()) {
    case 'BIRTHDAY': return 'fa-cake-candles';
    case 'ANNIVERSARY': return 'fa-heart';
    case 'ENGAGEMENT': return 'fa-ring';
    case 'FESTIVAL': return 'fa-spa';
    default: return 'fa-calendar-day';
  }
}
