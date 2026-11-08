import type {
  AppUser,
  BulkFestivalWishMappingResult,
  CalendarResItem,
  FestivalItem,
  FestivalWishMapping
} from '../../core/models/api.models';
import { daysBetween, nextOccurrenceOf, parseCalendarDate, startOfDay } from '../calendar/calendar.utils';

export type MappingStatus = 'failed' | 'inactive' | 'active';

export interface FestivalTiming {
  daysUntil: number;
  label: string;
  isPast: boolean;
}

export function statusOf(mapping: FestivalWishMapping): MappingStatus {
  if (!mapping.active) return 'inactive';
  return mapping.error ? 'failed' : 'active';
}

function timingLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';
  if (daysUntil > 1) return `In ${daysUntil} days`;
  return daysUntil === -1 ? 'Yesterday' : `${-daysUntil} days ago`;
}

/** Relative to the festival's stored date, used by the mapping list (a specific year's festival). */
export function festivalTiming(festivalDate: string, today: Date): FestivalTiming {
  const date = parseCalendarDate(festivalDate);
  if (Number.isNaN(date.getTime())) {
    return { daysUntil: 0, label: '', isPast: false };
  }
  const daysUntil = daysBetween(startOfDay(today), date);
  return { daysUntil, label: timingLabel(daysUntil), isPast: daysUntil < 0 };
}

/** A festival's next occurrence, on or after today (this year's date, else next year's). */
export function festivalOccurrence(festival: FestivalItem, today: Date): Date {
  const item: CalendarResItem = {
    id: festival.id,
    eventType: 'festival',
    eventName: festival.eventName,
    eventDate: festival.eventDate,
    active: festival.active
  };
  return nextOccurrenceOf(item, today) ?? parseCalendarDate(festival.eventDate);
}

/**
 * Relative to the festival's *next* occurrence. Festivals repeat every year, so a festival stored
 * for an earlier year still shows an upcoming date rather than looking permanently past.
 */
export function festivalTimingNext(festival: FestivalItem, today: Date): FestivalTiming {
  const date = festivalOccurrence(festival, today);
  if (Number.isNaN(date.getTime())) {
    return { daysUntil: 0, label: '', isPast: false };
  }
  const daysUntil = daysBetween(startOfDay(today), date);
  return { daysUntil, label: timingLabel(daysUntil), isPast: daysUntil < 0 };
}

/** Active festivals, soonest next occurrence first. Festivals repeat, so none is ever "past". */
export function pickableFestivals(festivals: FestivalItem[], today: Date): FestivalItem[] {
  return festivals
    .filter((festival) => festival.active !== false)
    .sort(
      (a, b) =>
        festivalOccurrence(a, today).getTime() - festivalOccurrence(b, today).getTime() ||
        a.eventName.localeCompare(b.eventName)
    );
}

export function filterUsers(users: AppUser[], query: string): AppUser[] {
  const text = query.trim().toLowerCase();
  if (!text) return users;
  return users.filter((user) => user.name.toLowerCase().includes(text) || user.email.toLowerCase().includes(text));
}

export function toggleId(selected: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(selected);
  if (!next.delete(id)) {
    next.add(id);
  }
  return next;
}

export function addIds(selected: ReadonlySet<number>, ids: number[]): Set<number> {
  return new Set([...selected, ...ids]);
}

export function removeIds(selected: ReadonlySet<number>, ids: number[]): Set<number> {
  const remove = new Set(ids);
  return new Set([...selected].filter((id) => !remove.has(id)));
}

export function lastSentLabel(lastWishSentOn: string | null | undefined, today: Date): string {
  if (!lastWishSentOn) return 'Never';
  const days = -daysBetween(startOfDay(today), parseCalendarDate(lastWishSentOn));
  if (Number.isNaN(days)) return 'Never';
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function bulkResultMessage(result: BulkFestivalWishMappingResult, festivalName: string): string {
  const parts: string[] = [];
  if (result.created > 0) parts.push(`${result.created} added`);
  if (result.updated > 0) parts.push(`${result.updated} updated`);
  return `${festivalName}: ${parts.join(', ') || 'nothing changed'}.`;
}
