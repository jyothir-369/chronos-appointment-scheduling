import { describe, it, expect } from 'vitest';
import { generateSlots } from '@chronos/time';

describe('Materializer — DST correctness (§9.5 FR9)', () => {
  it('spring-forward: 09:00 local moves by 1h UTC, not 24h', () => {
    // Wednesday = daysOfWeek [3] (Mon=1, Tue=2, Wed=3, ..., Sun=7) in time-core
    const wedBefore = generateSlots({
      tz: 'America/New_York',
      slotMinutes: 60,
      rules: { daysOfWeek: [3], startTime: '09:00', endTime: '10:00' },
      fromDate: '2026-03-04',
      toDate: '2026-03-04',
    });
    const wedAfter = generateSlots({
      tz: 'America/New_York',
      slotMinutes: 60,
      rules: { daysOfWeek: [3], startTime: '09:00', endTime: '10:00' },
      fromDate: '2026-03-11',
      toDate: '2026-03-11',
    });
    expect(wedBefore.length).toBe(1);
    expect(wedAfter.length).toBe(1);

    // Before spring-forward (EST, UTC-5): 09:00 -> 14:00 UTC
    expect(wedBefore[0].startUtc).toBe('2026-03-04T14:00:00Z');
    // After spring-forward (EDT, UTC-4): 09:00 -> 13:00 UTC
    expect(wedAfter[0].startUtc).toBe('2026-03-11T13:00:00Z');

    // The UTC instant moves by exactly 1 hour (offset change), not 24h.
    const msDiff = new Date(wedAfter[0].startUtc).getTime() - new Date(wedBefore[0].startUtc).getTime();
    expect(Math.abs(msDiff)).toBe(60 * 60 * 1000);
  });

  it('gap hour (02:00-03:00 on 2026-03-08) is absent — no 24h-UTC duplication', () => {
    // March 8 2026 is Sunday (daysOfWeek [7])
    const generated = generateSlots({
      tz: 'America/New_York',
      slotMinutes: 30,
      rules: { daysOfWeek: [7], startTime: '00:00', endTime: '23:30' },
      fromDate: '2026-03-08',
      toDate: '2026-03-08',
    });
    // 46 half-hour slots (48 normally minus 1h gap = 46)
    expect(generated.length).toBe(46);
    // No slot in the gap (06:00Z - 07:00Z = 02:00-03:00 EDT)
    const inGap = generated.filter((s) => {
      const h = new Date(s.startUtc).getUTCHours();
      return h >= 6 && h < 7;
    });
    expect(inGap.length).toBe(0);
  });

  it('fall-back overlap uses compatible policy for 01:00 on 2026-11-01', () => {
    // Nov 1 2026 is Sunday (daysOfWeek [7])
    const generated = generateSlots({
      tz: 'America/New_York',
      slotMinutes: 60,
      rules: { daysOfWeek: [7], startTime: '01:00', endTime: '02:00' },
      fromDate: '2026-11-01',
      toDate: '2026-11-01',
    });
    // `compatible` resolves the overlap: first occurrence wins (EDT, UTC-4)
    expect(generated.length).toBe(1);
    expect(generated[0].startUtc).toBe('2026-11-01T05:00:00Z'); // 01:00 EDT = 05:00 UTC
  });

  it('DST edge stable across repeated runs (idempotent upsert)', () => {
    const run1 = generateSlots({
      tz: 'America/New_York',
      slotMinutes: 60,
      rules: { daysOfWeek: [3], startTime: '12:00', endTime: '13:00' },
      fromDate: '2026-03-08',
      toDate: '2026-03-08',
    });
    expect(run1.length).toBe(1);
    // 12:00 local after the 3am gap -> 16:00 UTC (EDT, UTC-4)
    expect(run1[0].startUtc).toBe('2026-03-08T16:00:00Z');
  });
});
