import type {
  AppUser,
  BulkFestivalWishMappingResult,
  FestivalItem,
  FestivalWishMapping
} from '../../core/models/api.models';
import { parseCalendarDate, startOfDay } from '../calendar/calendar.utils';
import { daysBetween } from '../events/event.utils';

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

export function festivalTiming(festivalDate: string, today: Date): FestivalTiming {
  const date = parseCalendarDate(festivalDate);
  if (Number.isNaN(date.getTime())) {
    return { daysUntil: 0, label: '', isPast: false };
  }
  const daysUntil = daysBetween(startOfDay(today), date);
  if (daysUntil === 0) return { daysUntil, label: 'Today', isPast: false };
  if (daysUntil === 1) return { daysUntil, label: 'Tomorrow', isPast: false };
  if (daysUntil > 1) return { daysUntil, label: `In ${daysUntil} days`, isPast: false };
  return { daysUntil, label: daysUntil === -1 ? 'Yesterday' : `${-daysUntil} days ago`, isPast: true };
}

/** Festivals to pick from, soonest first. Past ones only when asked for. */
export function pickableFestivals(festivals: FestivalItem[], today: Date, includePast: boolean): FestivalItem[] {
  return festivals
    .filter((festival) => festival.active !== false)
    .filter((festival) => includePast || !festivalTiming(festival.eventDate, today).isPast)
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.eventName.localeCompare(b.eventName));
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
