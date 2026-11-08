import { CalendarResItem } from '../../core/models/api.models';
import {
  buildDays,
  entriesFor,
  nextOccurrenceOf,
  occursOn,
  parseCalendarDate,
  upcomingEntries
} from './calendar.utils';

function item(overrides: Partial<CalendarResItem>): CalendarResItem {
  return {
    id: 1,
    eventType: 'Festival',
    eventName: 'Diwali',
    eventDate: '2025-10-20',
    active: true,
    ...overrides
  };
}

const ALL = new Set(['festival', 'birthday', 'anniversary', 'other'] as const);

describe('calendar year handling', () => {
  it('shows a festival on its month and day in a later year', () => {
    const diwali = item({ eventDate: '2025-10-20' });
    expect(occursOn(diwali, new Date(2026, 9, 20))).toBeTrue();
    expect(occursOn(diwali, new Date(2030, 9, 20))).toBeTrue();
    expect(occursOn(diwali, new Date(2026, 9, 21))).toBeFalse();
  });

  it('keeps a non-recurring anniversary on its exact date only', () => {
    const oneTime = item({ id: 2, eventType: 'Anniversary', eventName: 'Housewarming', eventDate: '2026-11-02', recurring: false });
    expect(occursOn(oneTime, new Date(2026, 10, 2))).toBeTrue();
    expect(occursOn(oneTime, new Date(2027, 10, 2))).toBeFalse();
  });

  it('rolls a recurring event forward to the next year when this year has passed', () => {
    const birthday = item({ id: 3, eventType: 'Birthday', eventName: 'Asha', eventDate: '1990-01-05' });
    expect(nextOccurrenceOf(birthday, new Date(2026, 5, 1))).toEqual(new Date(2027, 0, 5));
    expect(nextOccurrenceOf(birthday, new Date(2026, 0, 1))).toEqual(new Date(2026, 0, 5));
  });

  it('has no next occurrence for a one-time anniversary already in the past', () => {
    const past = item({ id: 4, eventType: 'Anniversary', eventName: 'Old', eventDate: '2020-03-01', recurring: false });
    expect(nextOccurrenceOf(past, new Date(2026, 0, 1))).toBeNull();
  });

  it('finds a festival in a later year when building the grid', () => {
    const diwali = item({ eventDate: '2025-10-20' });
    const days = buildDays([new Date(2026, 9, 20)], [diwali], ALL, new Date(2026, 0, 1), new Date(2026, 9, 1));
    expect(days[0].entries.length).toBe(1);
    expect(days[0].entries[0].title).toBe('Diwali');
  });

  it('lists upcoming festivals from their next occurrence regardless of the stored year', () => {
    const today = new Date(2026, 9, 1);
    const diwali = item({ eventDate: '2025-10-20' });
    const upcoming = upcomingEntries([diwali], today, ALL, 60, 4);
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].date).toEqual(new Date(2026, 9, 20));
    expect(upcoming[0].daysUntil).toBe(19);
  });

  it('still filters by enabled kinds when listing upcoming', () => {
    const diwali = item({ eventDate: '2025-10-20' });
    expect(upcomingEntries([diwali], new Date(2026, 9, 1), new Set(['birthday'] as const), 60, 4)).toEqual([]);
  });

  it('orders entries so festivals come before birthdays', () => {
    const festival = item({ id: 10, eventDate: '2026-11-08' });
    const birthday = item({ id: 11, eventType: 'Birthday', eventName: 'Asha', eventDate: '1990-11-08' });
    const entries = entriesFor([birthday, festival], new Date(2026, 10, 8), ALL);
    expect(entries.map((entry) => entry.kind)).toEqual(['festival', 'birthday']);
  });

  it('parses dates locally so the day does not shift', () => {
    expect(parseCalendarDate('2026-11-08').getDate()).toBe(8);
  });
});
