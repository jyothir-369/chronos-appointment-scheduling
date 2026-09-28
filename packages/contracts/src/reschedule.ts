/**
 * Reschedule endpoint (§2.2) — atomic cancel + rebook in one transaction
 */
import { Pool } from 'pg';
// Type-only import preserved for ESM
import type { Pool as PgPool } from 'pg';
import { clock, subtractElapsed } from '@chronos/time';

export interface RescheduleRequest {
  bookingId: string;
  newSlotId: string;
  idempotencyKey?: string;
  version: number;
  ifMatch: number;
  cancellationWindowHours?: number;
}

export interface RescheduleResult {
  status: 201 | 400 | 404 | 409 | 412 | 422;
  bookingId?: string;
  error?: string;
  replay?: boolean;
}

export async function rescheduleBooking(
  pool: Pool,
  req: RescheduleRequest,
  nowUtc?: string
): Promise<RescheduleResult> {
  const effectiveNow = nowUtc || clock.now().toString();

  // 1. Load existing booking (authorization + version check)
  const bookingRes = await pool.query(
    'SELECT id, slot_id, client_id, status, version FROM bookings WHERE id = $1',
    [req.bookingId]
  );
  if (bookingRes.rowCount === 0) return { status: 404, error: 'not_found' };
  const b = bookingRes.rows[0];

  // 2. Version match
  if (b.version !== req.version || req.ifMatch !== b.version) {
    return { status: 412, error: 'version_mismatch' };
  }

  // 3. Cancellation window check for reschedule (reuse lifecycle logic)
  // Note: reschedule can have different/shorter window per product decision
  // For Stage D we enforce the same window unless overridden.
  const windowHours = req.cancellationWindowHours ?? 24;
  const slotRes = await pool.query('SELECT slot_start_utc FROM slots WHERE id = $1', [b.slot_id]);
  const slotStart = slotRes.rows[0]?.slot_start_utc || effectiveNow;
  const startMs = new Date(slotStart).getTime();
  const nowMs = new Date(effectiveNow).getTime();
  const windowMs = windowHours * 60 * 60 * 1000;
  if (nowMs > (startMs - windowMs)) {
    return { status: 409, error: 'window_expired' };
  }

  // 4. Atomic transaction: cancel old, book new
  try {
    await pool.query('BEGIN');

    // Lock new slot (compare-and-set); reject if booked or past
    const newSlotRes = await pool.query(
      `UPDATE slots SET status = 'booked' WHERE id = $1 AND status = 'open' AND slot_start_utc > $2 RETURNING id, provider_id, slot_start_utc`,
      [req.newSlotId, effectiveNow]
    );
    if (newSlotRes.rowCount === 0) {
      await pool.query('ROLLBACK');
      return { status: 409, error: 'slot_unavailable' };
    }

    // Cancel old booking
    await pool.query(
      "UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1",
      [req.bookingId]
    );
    await pool.query("UPDATE slots SET status = 'open' WHERE id = $1", [b.slot_id]);

    // Create new booking (same client)
    const newBookingRes = await pool.query(
      `INSERT INTO bookings (slot_id, client_id, client_timezone, status, version) VALUES ($1, $2, 'UTC', 'booked', $3) RETURNING id, version`,
      [req.newSlotId, b.client_id, b.version + 1]
    );
    const newBookingId = newBookingRes.rows[0].id;
    const newVersion = newBookingRes.rows[0].version;

    // Re-point reminder jobs (cancel old, schedule new)
    await pool.query(
      "UPDATE reminder_jobs SET status = 'cancelled' WHERE booking_id = $1",
      [req.bookingId]
    );

    // Schedule new reminders
    const offsets = [1440, 60];
    for (const off of offsets) {
      const fire = subtractElapsed(newSlotRes.rows[0].slot_start_utc, off);
      const fireMs = new Date(fire).getTime();
      if (fireMs > nowMs) {
        await pool.query(
          `INSERT INTO reminder_jobs (booking_id, offset_minutes, fire_at_utc, status) VALUES ($1, $2, $3, 'scheduled')`,
          [newBookingId, off, fire]
        );
      }
    }

    // Idempotency
    if (req.idempotencyKey) {
      await pool.query(
        `INSERT INTO idempotency_keys (client_id, key, request_hash, response_status, response_body, created_at) VALUES ($1, $2, $3, 201, $4, now())`,
        [b.client_id, req.idempotencyKey, JSON.stringify(req), JSON.stringify({ bookingId: newBookingId })]
      );
    }

    await pool.query('COMMIT');
    return { status: 201, bookingId: newBookingId };
  } catch (e: any) {
    await pool.query('ROLLBACK').catch(() => {});
    if (e.code === '23505' || e.code === '23P01') {
      return { status: 409, error: 'slot_unavailable' };
    }
    return { status: 400, error: e.message || 'bad_request' };
  }
}
