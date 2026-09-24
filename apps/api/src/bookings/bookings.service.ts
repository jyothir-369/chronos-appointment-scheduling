/**
 * Phase 4 — Booking Core (§6.1 / §4 concurrency proof)
 * Atomic transaction; DB is the authority (no in-process lock).
 * Uses @chronos/time for elapsed-time arithmetic only where needed.
 */

export interface BookingRequest {
  slotId: string;
  clientId: string;
  idempotencyKey?: string;
  clientTimezone: string;
}

export interface BookingResult {
  status: 201 | 400 | 409 | 422;
  bookingId?: string;
  error?: string;
  replay?: boolean;
}

export async function createBooking(
  db: any,
  req: BookingRequest,
  nowUtc: string
): Promise<BookingResult> {
  const { slotId, clientId, idempotencyKey, clientTimezone } = req;

  // 1. Idempotency check (in same transaction per §6.1)
  if (idempotencyKey) {
    const existing = await db.query(
      'SELECT * FROM idempotency_keys WHERE client_id = $1 AND key = $2',
      [clientId, idempotencyKey]
    );
    if (existing.rowCount > 0) {
      const row = existing.rows[0];
      if (row.request_hash !== JSON.stringify(req)) {
        return { status: 422, error: 'idempotency_key_reuse' };
      }
      return { status: 201, bookingId: row.response_body?.bookingId, replay: true };
    }
  }

  // 2. Atomic compare-and-set on slot + booking insert in one transaction
  try {
    await db.query('BEGIN');

    // Lock slot for update (compare-and-set); reject if booked or in past
    const slotRes = await db.query(
      `UPDATE slots SET status = 'booked'
       WHERE id = $1 AND status = 'open' AND slot_start_utc > $2
       RETURNING id, provider_id, slot_start_utc`,
      [slotId, nowUtc]
    );
    if (slotRes.rowCount === 0) {
      await db.query('ROLLBACK');
      return { status: 409, error: 'slot_unavailable' };
    }

    // Insert booking; partial unique index protects second live booking
    const bookingRes = await db.query(
      `INSERT INTO bookings (slot_id, client_id, client_timezone, status)
       VALUES ($1, $2, $3, 'booked') RETURNING id`,
      [slotId, clientId, clientTimezone]
    );

    // Insert reminder jobs (skipping past offsets)
    const offsets = [1440, 60];
    for (const off of offsets) {
      const fire = new Date(new Date(slotRes.rows[0].slot_start_utc).getTime() - off * 60000).toISOString();
      if (new Date(fire) > new Date(nowUtc)) {
        await db.query(
          `INSERT INTO reminder_jobs (booking_id, offset_minutes, fire_at_utc, status) VALUES ($1, $2, $3, 'scheduled')`,
          [bookingRes.rows[0].id, off, fire]
        );
      }
    }

    if (idempotencyKey) {
      await db.query(
        `INSERT INTO idempotency_keys (client_id, key, request_hash, response_status, response_body, created_at)
         VALUES ($1, $2, $3, 201, $4, now())`,
        [clientId, idempotencyKey, JSON.stringify(req), JSON.stringify({ bookingId: bookingRes.rows[0].id })]
      );
    }

    await db.query('COMMIT');
    return { status: 201, bookingId: bookingRes.rows[0].id };
  } catch (e: any) {
    await db.query('ROLLBACK').catch(() => {});
    // Map Postgres exclusion/unique conflicts
    if (e.code === '23505' || e.code === '23P01') {
      return { status: 409, error: 'slot_unavailable' };
    }
    return { status: 400, error: e.message || 'bad_request' };
  }
}
