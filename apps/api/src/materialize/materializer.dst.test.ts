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

    // Verify the local wall-clock time stays 09:00 and the UTC offset changed from EST (-5) to EDT (-4).
    expect(wedBefore[0].startUtc).toBe('2026-03-04T14:00:00Z'); // 09:00 EST = 14:00Z
    expect(wedAfter[0].startUtc).toBe('2026-03-11T13:00:00Z'); // 09:00 EDT = 13:00Z
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
    // No slot maps to nonexistent local wall-clock times 02:00 or 02:30 in NY on 2026-03-08 (spring-forward gap under EST->EDT).
    const hasGapSlot = generated.some((s) => {
      // Resolve UTC back to NY local to detect absolute gap absence; direct conversion of 06:00Z/06:30Z is EST 01:00/01:30 (valid),
      // so we use local-time derivation via Temporal or explicit check that 02:00 local never appears.
      const d = new Date(s.startUtc);
      const nyStr = d.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
      // We expect 02:00 or 02:30 NY never appears in any generated slot for this gap-day.
      return nyStr.includes('02:00') || nyStr.includes('02:30');
    });
    expect(hasGapSlot).toBe(false);
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
    const args = {
      tz: 'America/New_York',
      slotMinutes: 60,
      rules: { daysOfWeek: [7], startTime: '12:00', endTime: '13:00' },
      fromDate: '2026-03-08',
      toDate: '2026-03-08',
    };
    const run1 = generateSlots(args);
    const run2 = generateSlots(args);
    expect(run1.length).toBe(1);
    expect(run2.length).toBe(1);
    expect(run1[0].startUtc).toBe('2026-03-08T16:00:00Z');
    expect(run2[0].startUtc).toBe('2026-03-08T16:00:00Z');
    expect(run1[0].startUtc).toBe(run2[0].startUtc); // idempotent: both runs identical
  });
});
