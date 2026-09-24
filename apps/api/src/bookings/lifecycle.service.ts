/**
 * Phase 5 — Lifecycle & Cancellation
 * State machine + cancellation window + provider actions + auto-complete.
 * DB authority; injected clock for boundary tests.
 */

export type BookingStatus = 'booked' | 'completed' | 'cancelled' | 'no_show';

export const VALID_TRANSITIONS: Record<string, BookingStatus[]> = {
  booked: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function isValidTransition(from: BookingStatus, to: BookingStatus): boolean {
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

export interface CancelRequest {
  bookingId: string;
  version: number;
  ifMatch: number; // must equal booking.version
  nowUtc: string;
  cancellationWindowHours: number;
  slotStartUtc: string;
}

export interface CancelResult {
  allowed: boolean;
  error?: 'version_mismatch' | 'window_expired' | 'invalid_transition';
  slotReopened?: boolean;
}

export function evaluateCancellation(
  req: CancelRequest,
  currentStatus: BookingStatus,
  currentVersion: number
): CancelResult {
  // Illegal transition?
  if (!isValidTransition(currentStatus, 'cancelled')) {
    return { allowed: false, error: 'invalid_transition' };
  }
  // Version conflict?
  if (req.ifMatch !== currentVersion) {
    return { allowed: false, error: 'version_mismatch' };
  }
  // Cancellation window (elapsed time, not clock time)
  const startMs = new Date(req.slotStartUtc).getTime();
  const nowMs = new Date(req.nowUtc).getTime();
  const windowMs = req.cancellationWindowHours * 60 * 60 * 1000;
  const deadlineMs = startMs - windowMs;
  if (nowMs > deadlineMs) {
    return { allowed: false, error: 'window_expired' };
  }
  // Exactly at boundary is allowed; 1ms after is denied (checked by >)
  return { allowed: true, slotReopened: true };
}

export interface AutoCompleteResult {
  completed: boolean;
  bookingId?: string;
}

export function shouldAutoComplete(slotEndUtc: string, nowUtc: string, graceMinutes: number = 15): boolean {
  const endMs = new Date(slotEndUtc).getTime();
  const nowMs = new Date(nowUtc).getTime();
  const graceMs = graceMinutes * 60 * 1000;
  return nowMs >= (endMs + graceMs);
}
