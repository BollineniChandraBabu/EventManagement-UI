import { activeRangePreset, deliveryHealth } from './dashboard.utils';

describe('deliveryHealth', () => {
  it('reports a perfect rate when no mail was attempted', () => {
    expect(deliveryHealth({ emailsSentToday: 0, failedEmails: 0 })).toEqual({
      rate: 100,
      tone: 'good',
      label: '100% delivered'
    });
  });

  it('treats a null payload as an idle, healthy day', () => {
    expect(deliveryHealth(null).rate).toBe(100);
  });

  it('rounds the delivered share of the attempted mail', () => {
    expect(deliveryHealth({ emailsSentToday: 95, failedEmails: 5 }).rate).toBe(95);
  });

  it('flags a warn rate below the good threshold', () => {
    expect(deliveryHealth({ emailsSentToday: 92, failedEmails: 8 }).tone).toBe('warn');
  });

  it('flags a bad rate when most mail failed', () => {
    const health = deliveryHealth({ emailsSentToday: 20, failedEmails: 80 });
    expect(health.tone).toBe('bad');
    expect(health.label).toBe('20% delivered');
  });
});

describe('activeRangePreset', () => {
  it('matches an inclusive 7-day range', () => {
    expect(activeRangePreset('2026-11-06', '2026-11-12')).toBe(7);
  });

  it('matches 30- and 90-day ranges', () => {
    expect(activeRangePreset('2026-10-14', '2026-11-12')).toBe(30);
    expect(activeRangePreset('2026-08-15', '2026-11-12')).toBe(90);
  });

  it('treats a single day as a custom range', () => {
    expect(activeRangePreset('2026-11-12', '2026-11-12')).toBeNull();
  });

  it('returns null for a range with no matching preset', () => {
    expect(activeRangePreset('2026-11-01', '2026-11-12')).toBeNull();
  });

  it('returns null when the end is before the start', () => {
    expect(activeRangePreset('2026-11-12', '2026-11-06')).toBeNull();
  });

  it('returns null for an unparseable date', () => {
    expect(activeRangePreset('not-a-date', '2026-11-12')).toBeNull();
  });
});
