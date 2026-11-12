import { DashboardStats } from '../../core/models/api.models';

export interface DeliveryHealth {
  /** Share of today's mail that was delivered (0-100). */
  rate: number;
  tone: 'good' | 'warn' | 'bad';
  label: string;
}

/** Quick-pick ranges offered above the charts. */
export const RANGE_PRESETS = [7, 30, 90] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

/**
 * The delivery success rate for today's mail. A day with no mail at all counts as healthy, so an
 * idle dashboard does not look like it is failing.
 */
export function deliveryHealth(
  stats: Pick<DashboardStats, 'emailsSentToday' | 'failedEmails'> | null | undefined
): DeliveryHealth {
  const sent = Math.max(0, stats?.emailsSentToday ?? 0);
  const failed = Math.max(0, stats?.failedEmails ?? 0);
  const total = sent + failed;
  const rate = total === 0 ? 100 : Math.round((sent / total) * 100);
  const tone: DeliveryHealth['tone'] = rate >= 98 ? 'good' : rate >= 90 ? 'warn' : 'bad';
  return { rate, tone, label: `${rate}% delivered` };
}

/**
 * Which quick-pick matches the current range, or null for a custom range. Only the range
 * matters, so any dates that span the same number of days light up the same preset.
 */
export function activeRangePreset(startDate: string, endDate: string): RangePreset | null {
  const start = Date.parse(`${startDate}T00:00:00`);
  const end = Date.parse(`${endDate}T00:00:00`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }

  const days = Math.round((end - start) / 86_400_000) + 1;
  return (RANGE_PRESETS as readonly number[]).includes(days) ? (days as RangePreset) : null;
}

