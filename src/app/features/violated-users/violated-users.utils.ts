import type {
  ViolatedUserChartPoint,
  ViolatedUserInfo,
  ViolatedUserIpSummary,
  ViolatedUserMapPoint
} from '../../core/models/api.models';

export type RangePreset = 'today' | '7d' | '30d' | 'custom';
export type Suspicion = 'high' | 'medium' | 'low';

/** An IP that tried this many different emails is probably guessing. */
const HIGH_DISTINCT_EMAILS = 5;
const MEDIUM_DISTINCT_EMAILS = 3;
/** A day with at least one attempt always gets a bar you can see. */
const MIN_VISIBLE_BAR_PERCENT = 4;

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ChartBar {
  date: string;
  total: number;
  percent: number;
}

export function toDateInputValue(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Date range (inclusive, ending today) for a quick-pick button. */
export function rangeFor(preset: Exclude<RangePreset, 'custom'>, now: Date): DateRange {
  const daysBack = preset === 'today' ? 0 : preset === '7d' ? 6 : 29;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
  return { startDate: toDateInputValue(start), endDate: toDateInputValue(now) };
}

/** Which quick-pick matches the dates, or 'custom'. */
export function presetFor(range: DateRange, now: Date): RangePreset {
  for (const preset of ['today', '7d', '30d'] as const) {
    const candidate = rangeFor(preset, now);
    if (candidate.startDate === range.startDate && candidate.endDate === range.endDate) {
      return preset;
    }
  }
  return 'custom';
}

export function suspicionOf(ip: ViolatedUserIpSummary): Suspicion {
  if (ip.distinctEmails >= HIGH_DISTINCT_EMAILS) return 'high';
  if (ip.distinctEmails >= MEDIUM_DISTINCT_EMAILS) return 'medium';
  return 'low';
}

/** Scales every bar to the busiest day, so a quiet week is not drawn as a flat line. */
export function toChartBars(points: ViolatedUserChartPoint[]): ChartBar[] {
  const max = Math.max(0, ...points.map((point) => point.total));
  return points.map((point) => ({
    date: point.date,
    total: point.total,
    percent: point.total <= 0 || max === 0 ? 0 : Math.max(MIN_VISIBLE_BAR_PERCENT, Math.round((point.total / max) * 100))
  }));
}

export function coordinatesOf(user: ViolatedUserInfo | ViolatedUserMapPoint): { latitude: number; longitude: number } | null {
  const latitude = user.latitude ?? user.ipInfo?.latitude;
  const longitude = user.longitude ?? user.ipInfo?.longitude;
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude: latitude as number, longitude: longitude as number }
    : null;
}

export function locationLabel(user: ViolatedUserInfo | ViolatedUserMapPoint): string {
  const info = user.ipInfo;
  return [info?.city, info?.regionName, info?.country].filter(Boolean).join(', ') || user.loginLocation || 'Unknown';
}

export function riskBadges(user: ViolatedUserInfo): string[] {
  const info = user.ipInfo;
  if (!info) return [];
  return [info.proxy ? 'Proxy / VPN' : '', info.hosting ? 'Data centre' : '', info.mobile ? 'Mobile' : ''].filter(Boolean);
}

/** The IP lookup service answered "fail" (rate limit, private address, ...). */
export function ipLookupFailed(user: ViolatedUserInfo): boolean {
  return !!user.ipInfo && user.ipInfo.status !== 'success';
}
