import { scheduleError, toDateTimeLocal } from './notification-schedule';

describe('notification schedule rules', () => {
  const now = new Date('2030-01-01T12:00:00Z');

  it('accepts a window that is entirely in the future', () => {
    expect(
      scheduleError(
        { scheduledFrom: '2030-01-01T13:00:00Z', scheduledTo: '2030-01-01T14:00:00Z' },
        now
      )
    ).toBeNull();
  });

  it('accepts an empty schedule (publish immediately)', () => {
    expect(scheduleError({ scheduledFrom: null, scheduledTo: null }, now)).toBeNull();
  });

  it('rejects a start time that has already passed', () => {
    expect(
      scheduleError({ scheduledFrom: '2030-01-01T11:00:00Z', scheduledTo: null }, now)
    ).toContain('start time must be in the future');
  });

  it('rejects an end time that has already passed', () => {
    expect(
      scheduleError({ scheduledFrom: null, scheduledTo: '2030-01-01T11:00:00Z' }, now)
    ).toContain('end time must be in the future');
  });

  it('rejects an end that is before the start', () => {
    expect(
      scheduleError(
        { scheduledFrom: '2030-01-01T14:00:00Z', scheduledTo: '2030-01-01T13:00:00Z' },
        now
      )
    ).toContain('after the start time');
  });

  it('treats a start exactly at now as past', () => {
    expect(
      scheduleError({ scheduledFrom: '2030-01-01T12:00:00Z', scheduledTo: null }, now)
    ).not.toBeNull();
  });

  it('formats an instant for a datetime-local picker', () => {
    expect(toDateTimeLocal('2030-01-01T12:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('returns null for a missing or invalid value', () => {
    expect(toDateTimeLocal(null)).toBeNull();
    expect(toDateTimeLocal('not-a-date')).toBeNull();
  });
});
