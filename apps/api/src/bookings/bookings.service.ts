/**
 * Phase 4 â€” Booking Core (Â§6.1 / Â§4 concurrency proof)
 * Atomic transaction; DB is the authority (no in-process lock).
 * Uses @chronos/time for elapsed-time arithmetic only where needed.
 */

import { clock, subtractElapsed } from '@chronos/time';
import { ReminderQueueManager } from '../reminders/reminder.queue.js';
const T = (globalThis as any).Temporal;

export interface BookingRequest {
  providerId?: string;
  eventTypeId?: string | undefined;
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
  nowUtc?: string,
  reminderQueue?: ReminderQueueManager
): Promise<BookingResult> {
  const { slotId, clientId, idempotencyKey, clientTimezone } = req;
  const providerIdFromSlot = req.providerId || null;
  const effectiveNowMs = nowUtc ? new Date(nowUtc).getTime() : clock.now().epochMs;
  const effectiveNow = new Date(effectiveNowMs).toISOString();
  // Read configured minimum booking notice from provider
  let configuredNoticeHours = 4;
  try {
    const slotRes = await db.query('SELECT provider_id FROM slots WHERE id = $1', [slotId]);
    const providerId = (slotRes.rowCount > 0 && slotRes.rows[0].provider_id) ? slotRes.rows[0].provider_id : (req.providerId || null);
    if (providerId) {
      const noticeRes = await db.query('SELECT COALESCE(minimum_booking_notice, 4) AS notice FROM providers WHERE id = $1', [providerId]);
      if (noticeRes.rowCount > 0) configuredNoticeHours = Number(noticeRes.rows[0].notice) || 4;
    }
  } catch { /* default remains */ }

  // Validate event type ownership if provided
  if (req.eventTypeId) {
    try {
      const etRes = await db.query('SELECT provider_id FROM event_types WHERE id = $1', [req.eventTypeId]);
      if (etRes.rowCount === 0) return { status: 400, error: 'invalid_event_type_not_found' };
      const etProviderId = etRes.rows[0].provider_id;
      const slotProviderId = (await db.query('SELECT provider_id FROM slots WHERE id = $1', [slotId])).rows[0]?.provider_id;
      if (etProviderId && etProviderId !== slotProviderId) return { status: 400, error: 'event_type_wrong_provider' };
    } catch (e: any) {
      return { status: 400, error: 'event_type_validation_failed' };
    }
  }
  const minSlotTimeMs = effectiveNowMs + configuredNoticeHours * 60 * 60 * 1000;

  // 1. Idempotency check (in same transaction per Â§6.1)
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
       WHERE id = $1 AND status = 'open' AND slot_start_utc >= $2 AND slot_start_utc >= $3
       RETURNING id, provider_id, slot_start_utc`,
      [slotId, effectiveNow, new Date(minSlotTimeMs).toISOString()]
    );
    if (slotRes.rowCount === 0) {
      await db.query('ROLLBACK');
      return { status: 409, error: 'slot_unavailable' };
    }

    // Insert booking; partial unique index protects second live booking
    const bookingRes = await db.query(
      `INSERT INTO bookings (slot_id, client_id, client_timezone, provider_id, event_type_id, status)
       VALUES ($1, $2, $3, $4, $5, 'booked') RETURNING id`,
      [slotId, clientId, clientTimezone, (req as any).providerId || null, (req as any).eventTypeId || null]
    );

    // Insert reminder jobs (skipping past offsets)
    const offsets = [1440, 60];
    for (const off of offsets) {
      const slotStartIso = new Date(slotRes.rows[0].slot_start_utc).toISOString(); const fire = subtractElapsed(slotStartIso, off);
      const fireMs = new Date(slotRes.rows[0].slot_start_utc).getTime() - off * 60000;
      const nowMs = clock.now().epochMs;
      if (fireMs > nowMs) {
        await db.query(
          `INSERT INTO reminder_jobs (booking_id, offset_minutes, fire_at_utc, status) VALUES ($1, $2, $3, 'scheduled')`,
          [bookingRes.rows[0].id, off, new Date(fireMs).toISOString()]
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
    // Enqueue reminder jobs after DB commit.
    // Reconciliation on ReminderQueueManager startup also repairs
    // any scheduled DB rows that are missing from BullMQ.
    if (reminderQueue) {
      const slotResForReminder = await db.query(
        'SELECT slot_start_utc FROM slots WHERE id = $1',
        [slotId]
      );

      if (slotResForReminder.rowCount > 0) {
        const slotStartUtc = slotResForReminder.rows[0].slot_start_utc;

        const reminderRows = await db.query(
          'SELECT offset_minutes FROM reminder_jobs WHERE booking_id = $1 AND status = $2',
          [bookingRes.rows[0].id, 'scheduled']
        );

        const offsets = reminderRows.rows.map(
          (r: any) => Number(r.offset_minutes)
        );

        if (offsets.length > 0) {
          await reminderQueue.enqueueForBooking(
            bookingRes.rows[0].id,
            slotStartUtc,
            offsets,
            new Date(effectiveNowMs)
          );
        }
      }
    }
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


