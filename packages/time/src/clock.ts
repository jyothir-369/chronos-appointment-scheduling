/**
 * Clock abstraction — Phase 0 foundation (ADR-001 / ADR-006 / ADR-007)
 * Zero I/O. Pure instant arithmetic. Only module allowed to import
 * Temporal / polyfill. All other code uses Clock.now().
 */

// Import module that uses globalThis.Temporal with polyfill fallback
// (ADR-001 decision: native on Node 26, polyfill on Node 24)
let Temporal: typeof globalThis.Temporal | undefined;
try {
  // Prefer native global
  Temporal = (globalThis as any).Temporal;
} catch {
  Temporal = undefined;
}

export interface Instant {
  /** Unix epoch milliseconds */
  epochMs: number;
  /** ISO 8601 UTC string */
  toString(): string;
}

export interface Clock {
  now(): Instant;
}

export class SystemClock implements Clock {
  now(): Instant {
    // Phase 0: forbidden to call Date.now() directly here unless
    // wrapped; this is the single allowed adapter point.
    // Use Temporal.Instant.fromEpochMilliseconds if available,
    // else Date epoch (only permitted in this file per ESLint).
    const ms = typeof (globalThis as any).Temporal?.Instant
      ? (globalThis as any).Temporal.Instant.fromEpochMilliseconds(Date.now()).epochMilliseconds
      : Date.now();
    return { epochMs: ms, toString: () => new Date(ms).toISOString() };
  }
}

/** Single source of truth for the application */
export const clock: Clock = new SystemClock();
