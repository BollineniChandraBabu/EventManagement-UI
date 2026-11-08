import { FestivalItem } from '../../core/models/api.models';
import { festivalTiming, festivalTimingNext, pickableFestivals } from './festival-mappings.utils';

function festival(id: number, name: string, eventDate: string): FestivalItem {
  return { id, eventName: name, eventDate, active: true };
}

describe('festival mapping timing', () => {
  const today = new Date(2026, 0, 1); // 1 Jan 2026

  it('reports the stored year for a festival still ahead this year', () => {
    const timing = festivalTiming('2026-03-15', today);
    expect(timing.isPast).toBeFalse();
    expect(timing.daysUntil).toBe(73);
  });

  it('marks a festival stored in an earlier year as past for the raw timing', () => {
    expect(festivalTiming('2025-03-15', today).isPast).toBeTrue();
  });

  it('rolls a festival from an earlier year to its next occurrence', () => {
    const timing = festivalTimingNext(festival(1, 'Diwali', '2025-10-20'), today);
    expect(timing.isPast).toBeFalse();
    expect(timing.daysUntil).toBeGreaterThan(0);
  });

  it('uses this year when the festival day is still to come', () => {
    const timing = festivalTimingNext(festival(1, 'Holi', '2020-03-10'), today);
    expect(timing.daysUntil).toBe(68);
  });

  it('sorts pickable festivals by next occurrence', () => {
    const later = festival(1, 'Later', '2020-12-01');
    const sooner = festival(2, 'Sooner', '2020-02-01');
    expect(pickableFestivals([later, sooner], today).map((f) => f.eventName)).toEqual(['Sooner', 'Later']);
  });

  it('drops inactive festivals from the picker', () => {
    const inactive: FestivalItem = { id: 3, eventName: 'Old', eventDate: '2026-05-01', active: false };
    expect(pickableFestivals([inactive], today)).toEqual([]);
  });
});
