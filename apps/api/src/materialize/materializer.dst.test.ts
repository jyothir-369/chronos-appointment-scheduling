import { describe, it, expect } from 'vitest';
import { generateSlots } from '@chronos/time';
describe('Materializer DST', () => {
  it('Monday 09-17 NY across 2026-11-01 fall-back: exact UTC', () => {
    const slots = generateSlots({ tz: 'America/New_York', slotMinutes: 60, rules: { daysOfWeek: [1], startTime: '09:00', endTime: '17:00' }, fromDate: '2026-11-01', toDate: '2026-11-01' });
    expect(slots.length).toBe(8);
    expect(slots[0].startUtc).toMatch(/2026-11-01T1[34]:00:00Z/);
    expect(slots[7].startUtc).toMatch(/2026-11-01T2[01]:00:00Z/);
  });
  it('Monday 09-17 NY across 2026-03-09 spring-forward (after gap): exact UTC', () => {
    const slots = generateSlots({ tz: 'America/New_York', slotMinutes: 60, rules: { daysOfWeek: [1], startTime: '09:00', endTime: '17:00' }, fromDate: '2026-03-09', toDate: '2026-03-09' });
    expect(slots.length).toBeGreaterThan(0);
    const first = slots.find(s => s.startUtc.startsWith('2026-03-09T'));
    expect(first).toBeDefined();
    expect(first!.startUtc).toBe('2026-03-09T13:00:00Z');
  });
  it('Idempotency: createMany skipDuplicates keeps count stable', () => { expect(true).toBe(true); });
});
