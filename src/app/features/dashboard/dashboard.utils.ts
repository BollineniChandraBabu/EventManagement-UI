import { DashboardStats } from '../../core/models/api.models';

export interface DeliveryHealth {
  /** Share of today's mail that was delivered (0-100). */
  rate: number;
  tone: 'good' | 'warn' | 'bad';
  label: string;
}

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
