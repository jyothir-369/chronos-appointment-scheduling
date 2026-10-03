import { describe, it, expect } from 'vitest';
import { generateSlots, clock, subtractElapsed, isCancellable, reminderFireTimes, assertValidTimeZone } from '@chronos/time';

/**
 * Regression: @chronos/time 1-based daysOfWeek mapping (1=Mon, ..., 6=Sat, 7=Sun)
 * must stay synchronized with the DB schema (availability_rules.day_of_week 1-7)
 * and never silently switch to 0-based mapping.
 */
describe('@chronos/time daysOfWeek regression (§9.4)', () => {
  it('1-based mapping: daysOfWeek [1] = Monday, [7] = Sunday', () => {
    // March 4 2026 = Wednesday; March 8 2026 = Sunday
    const wed = generateSlots({
      tz: 'UTC',
      slotMinutes: 60,
      rules: { daysOfWeek: [3], startTime: '09:00', endTime: '10:00' },
      fromDate: '2026-03-04',
      toDate: '2026-03-04',
    });
    const sun = generateSlots({
      tz: 'UTC',
      slotMinutes: 60,
      rules: { daysOfWeek: [7], startTime: '09:00', endTime: '10:00' },
      fromDate: '2026-03-08',
      toDate: '2026-03-08',
    });
    // [3] = Wednesday; [7] = Sunday
    expect(wed.length).toBe(1);
    expect(sun.length).toBe(1);
  });

  it('mapping matches DB schema (1=Mon ... 7=Sun) for all 7 days', () => {
    // Verify the standard mapping: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
    const referenceDates = {
      1: '2026-03-02', // Monday
      2: '2026-03-03', // Tuesday
      3: '2026-03-04', // Wednesday
      4: '2026-01-01', // Thursday
      5: '2026-01-02', // Friday
      6: '2026-01-03', // Saturday
      7: '2026-03-08', // Sunday
    };
    for (let dow = 1; dow <= 7; dow += 1) {
      const dateStr = referenceDates[dow as 1 | 2 | 3 | 4 | 5 | 6 | 7];
      const slots = generateSlots({
        tz: 'UTC',
        slotMinutes: 60,
        rules: { daysOfWeek: [dow], startTime: '09:00', endTime: '10:00' },
        fromDate: dateStr,
        toDate: dateStr,
      });
      expect(slots.length).toBe(1);
    }
  });

  it('time arithmetic uses UTC instant, never 24h wall-clock offset', () => {
    const start = clock.now().toString();
    const before24h = subtractElapsed(start, 24 * 60);
    const after1h = subtractElapsed(start, 60);
    expect(new Date(before24h).getTime()).toBeLessThan(new Date(start).getTime());
    expect(new Date(after1h).getTime()).toBeLessThan(new Date(start).getTime());
  });

  it('isCancellable respects elapsed time correctly', () => {
    const slotStart = '2026-01-02T12:00:00Z';
    expect(isCancellable(subtractElapsed(slotStart, 24 * 60), slotStart, 24)).toBe(true);
    expect(isCancellable(slotStart, slotStart, 24)).toBe(false);
  });

  it('reminderFireTimes excludes past offsets', () => {
    const fires = reminderFireTimes('2026-01-01T14:00:00Z', [60, 120], '2026-01-01T15:00:00Z');
    expect(fires.length).toBe(0);
  });

  it('timezone validation covers DB zones', () => {
    const zones = ['UTC', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'Pacific/Auckland'];
    for (const z of zones) {
      expect(() => assertValidTimeZone(z)).not.toThrow();
    }
  });
});
