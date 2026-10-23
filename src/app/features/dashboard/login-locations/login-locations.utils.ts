import type { LoginLocationChartPoint } from '../../../core/models/api.models';

export type LoginSortKey = 'newest' | 'oldest' | 'user' | 'location';

export interface LoginFilters {
  search: string;
  /** '' = everyone */
  userEmail: string;
  multipleLocationsOnly: boolean;
}

export interface LoginKpis {
  logins: number;
  users: number;
  locations: number;
  ipAddresses: number;
}

export interface LocationSummary {
  location: string;
  count: number;
  /** Percentage of all logins (0-100). */
  share: number;
}

export interface UserSummary {
  email: string;
  name: string;
  logins: number;
  locations: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  /** 1-based index of the first/last item shown, 0 when empty. */
  from: number;
  to: number;
}

const UNKNOWN_LOCATION = 'Unknown';

export function locationOf(point: LoginLocationChartPoint): string {
  return point.loginLocation?.trim() || point.location?.trim() || UNKNOWN_LOCATION;
}

export function hasCoordinates(point: LoginLocationChartPoint): boolean {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

export function mapsUrl(point: LoginLocationChartPoint): string {
  return `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;
}

// ---------------------------------------------------------------- summaries

export function computeKpis(points: LoginLocationChartPoint[]): LoginKpis {
  return {
    logins: points.length,
    users: new Set(points.map((point) => point.email)).size,
    locations: new Set(points.map(locationOf)).size,
    ipAddresses: new Set(points.map((point) => point.ipAddress).filter(Boolean)).size
  };
}

export function topLocations(points: LoginLocationChartPoint[], limit = 5): LocationSummary[] {
  const counts = new Map<string, number>();
  for (const point of points) {
    const location = locationOf(point);
    counts.set(location, (counts.get(location) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([location, count]) => ({ location, count, share: points.length ? (count / points.length) * 100 : 0 }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location))
    .slice(0, limit);
}

export function summarizeUsers(points: LoginLocationChartPoint[]): UserSummary[] {
  const byEmail = new Map<string, { name: string; logins: number; locations: Set<string> }>();
  for (const point of points) {
    const entry = byEmail.get(point.email) ?? { name: point.userName, logins: 0, locations: new Set<string>() };
    entry.logins++;
    entry.locations.add(locationOf(point));
    byEmail.set(point.email, entry);
  }
  return [...byEmail.entries()]
    .map(([email, entry]) => ({ email, name: entry.name, logins: entry.logins, locations: entry.locations.size }))
    .sort((a, b) => b.logins - a.logins || a.name.localeCompare(b.name));
}

/** Emails that signed in from two or more different locations in the loaded range. */
export function usersWithMultipleLocations(points: LoginLocationChartPoint[]): Set<string> {
  return new Set(summarizeUsers(points).filter((user) => user.locations >= 2).map((user) => user.email));
}

// ---------------------------------------------------------------- filter / sort / page

export function filterPoints(points: LoginLocationChartPoint[], filters: LoginFilters): LoginLocationChartPoint[] {
  const query = filters.search.trim().toLowerCase();
  const multi = filters.multipleLocationsOnly ? usersWithMultipleLocations(points) : null;
  return points.filter((point) => {
    if (filters.userEmail && point.email !== filters.userEmail) return false;
    if (multi && !multi.has(point.email)) return false;
    if (!query) return true;
    return [point.userName, point.email, locationOf(point), point.ipAddress]
      .some((value) => (value ?? '').toLowerCase().includes(query));
  });
}

export function sortPoints(points: LoginLocationChartPoint[], key: LoginSortKey): LoginLocationChartPoint[] {
  const time = (point: LoginLocationChartPoint) => new Date(point.loggedInAt).getTime() || 0;
  const sorted = [...points];
  switch (key) {
    case 'newest': return sorted.sort((a, b) => time(b) - time(a));
    case 'oldest': return sorted.sort((a, b) => time(a) - time(b));
    case 'user': return sorted.sort((a, b) => a.userName.localeCompare(b.userName) || time(b) - time(a));
    case 'location': return sorted.sort((a, b) => locationOf(a).localeCompare(locationOf(b)) || time(b) - time(a));
  }
}

export function paginate<T>(items: T[], page: number, size: number): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * size;
  const slice = items.slice(start, start + size);
  return {
    items: slice,
    page: safePage,
    totalPages,
    from: slice.length ? start + 1 : 0,
    to: slice.length ? start + slice.length : 0
  };
}

// ---------------------------------------------------------------- display

export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.floor((now.getTime() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days} day${days === 1 ? '' : 's'} ago` : '';
}

// CSV helpers live in core/utils/csv.ts; re-exported so existing imports keep working.
export { csvCell, toCsv } from '../../../core/utils/csv';
export type { CsvCell } from '../../../core/utils/csv';
