/**
 * Structured observability — Phase 8 (§395)
 * Logs with booking_id, slot_id, idempotency key; PII minimization.
 */
export interface LogContext {
  bookingId?: string;
  slotId?: string;
  idempotencyKey?: string;
  providerId?: string;
  [key: string]: unknown;
}

export function logStructured(level: 'info'|'warn'|'error', message: string, ctx?: LogContext) {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...ctx,
  };
  // PII minimization (§399): never include email, name, or raw message IDs beyond first 8 chars
  if (payload.email || payload.name || payload.clientName || payload.providerName) {
    delete payload.email;
    delete payload.name;
    delete payload.clientName;
    delete payload.providerName;
  }
  if (payload.bookingId && typeof payload.bookingId === 'string' && payload.bookingId.length > 32) {
    payload.bookingId = payload.bookingId.slice(0, 8) + '...';
  }
  // Only include booking_id, slot_id, idempotency key when present
  console.log(JSON.stringify(payload));
}
