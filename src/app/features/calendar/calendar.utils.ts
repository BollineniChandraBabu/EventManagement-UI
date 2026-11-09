import type { CalendarResItem } from '../../core/models/api.models';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';
export type CelebrationKind = 'festival' | 'birthday' | 'anniversary' | 'other';

export interface CalendarEntry {
  /** Unique across kinds (ids of festivals, events and users can collide). */
  key: string;
  kind: CelebrationKind;
  title: string;
  subtitle: string;
  icon: string;
  milestone: string | null;
  source: CalendarResItem;
}

export interface CalendarDay {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
}

export interface UpcomingEntry {
  entry: CalendarEntry;
  date: Date;
  daysUntil: number;
}

const KIND_ORDER: Record<CelebrationKind, number> = { festival: 0, anniversary: 1, birthday: 2, other: 3 };
const KIND_ICONS: Record<CelebrationKind, string> = {
  festival: 'fa-spa',
  birthday: 'fa-cake-candles',
  anniversary: 'fa-heart',
  other: 'fa-calendar-day'
};
/** Birth years further back than this are treated as placeholder data, not a real age. */
const MAX_PLAUSIBLE_AGE = 120;

export function kindOf(item: CalendarResItem): CelebrationKind {
  switch (item.eventType?.trim().toLowerCase()) {
    case 'festival': return 'festival';
    case 'birthday': return 'birthday';
    case 'anniversary': return 'anniversary';
    default: return 'other';
  }
}

export function iconFor(kind: CelebrationKind): string {
  return KIND_ICONS[kind];
}

// ---------------------------------------------------------------- dates

/** Parses "yyyy-mm-dd" (optionally followed by a time) as a LOCAL date, avoiding UTC day shifts. */
export function parseCalendarDate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay()); // weeks start on Sunday
}

/** Moves by whole months and clamps the day, so Jan 31 + 1 month is Feb 28/29 (not Mar 3). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Whole days from `from` to `to`. Date.UTC avoids an off-by-one across daylight-saving changes. */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / msPerDay);
}

export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${n}th`;
  }
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

// ---------------------------------------------------------------- visible range

export function monthGridDays(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const dayCount = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((first.getDay() + dayCount) / 7) * 7;
  const start = addDays(first, -first.getDay());
  return Array.from({ length: cells }, (_, index) => addDays(start, index));
}

export function visibleDays(view: CalendarView, cursor: Date): Date[] {
  switch (view) {
    case 'month': return monthGridDays(cursor);
    case 'week': return Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index));
    case 'day': return [startOfDay(cursor)];
    case 'agenda': {
      const dayCount = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      return Array.from({ length: dayCount }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index + 1));
    }
  }
}

/**
 * Month/year pairs that must be loaded: everything visible (a month grid shows days of the
 * neighbouring months too) plus this month and next month for the "coming up" strip. The year is
 * carried through so the calendar can ask the API for the exact year being viewed (festivals are
 * stored per year).
 */
export function monthYearsToLoad(
  view: CalendarView,
  cursor: Date,
  today: Date
): Array<{ month: number; year: number }> {
  const result: Array<{ month: number; year: number }> = [];
  const seen = new Set<string>();
  const add = (date: Date): void => {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ month: date.getMonth() + 1, year: date.getFullYear() });
    }
  };
  visibleDays(view, cursor).forEach(add);
  [today, addMonths(today, 1)].forEach(add);
  return result;
}

// ---------------------------------------------------------------- events on a day

/**
 * Birthdays and festivals repeat every year on the same month and day; festivals are stored for a
 * single year (the year they were synced), but a festival like Diwali is shown on its month/day in
 * every year, so navigating to a later year still finds it. Anniversaries repeat unless the event is
 * marked as not recurring. Feb 29 events appear on Feb 28 in non-leap years.
 */
export function occursOn(item: CalendarResItem, date: Date): boolean {
  if (!item.eventDate) {
    return false;
  }
  const eventDate = parseCalendarDate(item.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    return false;
  }
  const kind = kindOf(item);
  const exactDateOnly = kind === 'anniversary' && item.recurring === false;
  if (exactDateOnly) {
    return isSameDay(eventDate, date);
  }
  const day = eventDate.getMonth() === 1 && eventDate.getDate() === 29 && !isLeapYear(date.getFullYear())
    ? 28
    : eventDate.getDate();
  return date.getMonth() === eventDate.getMonth() && date.getDate() === day;
}

/**
 * The next date on which the item falls, on or after `today`. Recurring items (birthdays, festivals,
 * anniversaries) roll forward to the current or next year; a one-time anniversary in the past has no
 * next occurrence. Returns null when the date is missing or invalid.
 */
export function nextOccurrenceOf(item: CalendarResItem, today: Date): Date | null {
  if (!item.eventDate) {
    return null;
  }
  const eventDate = parseCalendarDate(item.eventDate);
  if (Number.isNaN(eventDate.getTime())) {
    return null;
  }
  const from = startOfDay(today);
  if (kindOf(item) === 'anniversary' && item.recurring === false) {
    return eventDate >= from ? eventDate : null;
  }
  for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
    const day =
      eventDate.getMonth() === 1 && eventDate.getDate() === 29 && !isLeapYear(year)
        ? 28
        : eventDate.getDate();
    const candidate = new Date(year, eventDate.getMonth(), day);
    if (candidate >= from) {
      return candidate;
    }
  }
  return null;
}

export function milestoneFor(item: CalendarResItem, date: Date): string | null {
  const kind = kindOf(item);
  if (kind !== 'birthday' && kind !== 'anniversary') {
    return null;
  }
  const years = date.getFullYear() - parseCalendarDate(item.eventDate).getFullYear();
  if (years <= 0 || years > MAX_PLAUSIBLE_AGE) {
    return null;
  }
  return kind === 'birthday' ? `${ordinal(years)} birthday` : `${ordinal(years)} anniversary`;
}

export function toEntry(item: CalendarResItem, date: Date): CalendarEntry {
  const kind = kindOf(item);
  const milestone = milestoneFor(item, date);
  let subtitle: string;
  switch (kind) {
    case 'festival':
      subtitle = 'Festival';
      break;
    case 'birthday':
      subtitle = milestone ?? 'Birthday';
      break;
    case 'anniversary':
      subtitle = [item.ownerName, milestone].filter(Boolean).join(' · ') || 'Anniversary';
      break;
    default:
      subtitle = item.eventType ?? '';
  }
  return {
    key: `${kind}-${item.id}`,
    kind,
    title: item.eventName,
    subtitle,
    icon: iconFor(kind),
    milestone,
    source: item
  };
}

export function entriesFor(items: CalendarResItem[], date: Date, enabledKinds: ReadonlySet<CelebrationKind>): CalendarEntry[] {
  return items
    .filter((item) => item.active !== false && enabledKinds.has(kindOf(item)) && occursOn(item, date))
    .map((item) => toEntry(item, date))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.title.localeCompare(b.title));
}

export function buildDays(
  dates: Date[],
  items: CalendarResItem[],
  enabledKinds: ReadonlySet<CelebrationKind>,
  today: Date,
  focusMonth: Date | null
): CalendarDay[] {
  return dates.map((date) => ({
    date,
    key: toIsoDate(date),
    inMonth: focusMonth ? date.getMonth() === focusMonth.getMonth() && date.getFullYear() === focusMonth.getFullYear() : true,
    isToday: isSameDay(date, today),
    entries: entriesFor(items, date, enabledKinds)
  }));
}

export function countByKind(days: CalendarDay[]): Record<CelebrationKind, number> {
  const counts: Record<CelebrationKind, number> = { festival: 0, birthday: 0, anniversary: 0, other: 0 };
  for (const day of days) {
    for (const entry of day.entries) {
      counts[entry.kind]++;
    }
  }
  return counts;
}

// ---------------------------------------------------------------- coming up

/**
 * The next few celebrations, soonest first. Each item is placed on its next occurrence (recurring
 * items roll into the next year when needed), so this works no matter which year is being viewed.
 */
export function upcomingEntries(
  items: CalendarResItem[],
  today: Date,
  enabledKinds: ReadonlySet<CelebrationKind>,
  horizonDays = 30,
  limit = 4
): UpcomingEntry[] {
  const from = startOfDay(today);
  const horizon = addDays(from, horizonDays);
  const result: UpcomingEntry[] = [];
  for (const item of items) {
    if (item.active === false || !enabledKinds.has(kindOf(item))) {
      continue;
    }
    const date = nextOccurrenceOf(item, from);
    if (!date || date > horizon) {
      continue;
    }
    result.push({ entry: toEntry(item, date), date, daysUntil: daysBetween(from, date) });
  }
  return result
    .sort((a, b) => a.date.getTime() - b.date.getTime() || KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit);
}

export function relativeDayLabel(daysUntil: number): string {
  if (daysUntil <= 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  return `In ${daysUntil} days`;
}

/** Groups non-empty days for the agenda list. */
export function agendaGroups(days: CalendarDay[]): CalendarDay[] {
  return days.filter((day) => day.entries.length > 0);
}
