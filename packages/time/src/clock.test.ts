import { describe, it, expect } from 'vitest';
import { SystemClock, Clock } from '../src/clock.js';

describe('Clock (Phase 0)', () => {
  it('returns an instant with epochMs as number', () => {
    const c: Clock = new SystemClock();
    const now = c.now();
    expect(typeof now.epochMs).toBe('number');
    expect(typeof now.toString()).toBe('string');
    expect(now.toString()).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('returns monotonically increasing values', () => {
    const c = new SystemClock();
    const a = c.now().epochMs;
    const b = c.now().epochMs;
    expect(b).toBeGreaterThanOrEqual(a);
  });
});
