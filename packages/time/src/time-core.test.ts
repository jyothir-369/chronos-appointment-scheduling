import { describe, it, expect } from 'vitest';
import {
  assertValidTimeZone,
  resolveWallClock,
  subtractElapsed,
  isCancellable,
  reminderFireTimes,
  generateSlots,
} from './time-core.js';

describe('Phase 1 Time Core', () => {
  describe('assertValidTimeZone', () => {
    it('accepts common zones', () => {
      expect(() => assertValidTimeZone('America/New_York')).not.toThrow();
      expect(() => assertValidTimeZone('Europe/London')).not.toThrow();
      expect(() => assertValidTimeZone('Asia/Kolkata')).not.toThrow();
      expect(() => assertValidTimeZone('UTC')).not.toThrow();
    });
    it('rejects invalid', () => {
      expect(() => assertValidTimeZone('')).toThrow();
      expect(() => assertValidTimeZone('NotAZone')).toThrow();
      expect(() => assertValidTimeZone('Mars/Phobos')).toThrow();
    });
  });

  describe('resolveWallClock', () => {
    it('resolves normal time', () => {
      const r = resolveWallClock('2026-06-01T10:00:00', 'America/New_York', 'compatible');
      expect(r.instant).toMatch(/T/); // ISO instant
    });
    it('requires policy', () => {
      expect(() => resolveWallClock('2026-01-01T12:00:00', 'UTC', '' as any)).toThrow();
    });
  });

  describe('subtractElapsed', () => {
    it('subtracts minutes', () => {
      const before = '2026-01-01T12:00:00Z';
      const after = subtractElapsed(before, 30);
      expect(after).toBe('2026-01-01T11:30:00Z');
    });
  });

  describe('isCancellable', () => {
    it('allows when well before', () => {
      expect(isCancellable('2026-01-01T00:00:00Z', '2026-01-02T12:00:00Z', 24)).toBe(true);
    });
  });

  describe('reminderFireTimes', () => {
    it('returns future fires', () => {
      const fires = reminderFireTimes('2026-01-01T12:00:00Z', [60], '2026-01-01T00:00:00Z');
      expect(fires.length).toBe(1);
    });
  });

  describe('generateSlots', () => {
    it('produces slots', () => {
      const slots = generateSlots({ tz: 'UTC', slotMinutes: 30, fromDate: '2026-01-01', toDate: '2026-01-02', rules: { startTime: '09:00', endTime: '10:00' } });
      expect(slots.length).toBeGreaterThanOrEqual(1);
      expect(slots[0].startUtc).toContain('T');
    });
  });
});
