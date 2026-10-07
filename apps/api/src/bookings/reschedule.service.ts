import { Pool } from 'pg';
/* Reschedule endpoint */
import { clock, subtractElapsed } from '@chronos/time';
import { ReminderQueueManager } from '../reminders/reminder.queue.js';
import { ActivityService } from '../activity/activity.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

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
  pool: any,
  req: RescheduleRequest,
  nowUtc?: string,
  reminderQueue?: ReminderQueueManager
): Promise<RescheduleResult> {
  const effectiveNow = nowUtc || clock.now().toString();

  // 1. Load existing booking with source-status guard and timezone propagation
  const clientPre = await pool.connect();
  try {
    await clientPre.query('BEGIN');
    const bookingRes = await clientPre.query(
      'SELECT id, slot_id, client_id, status, version, client_timezone FROM bookings WHERE id = $1 FOR UPDATE',
      [req.bookingId]
    );
    if (bookingRes.rowCount === 0) { await clientPre.query('ROLLBACK'); clientPre.release(); return { status: 404, error: 'not_found' }; }
    const b = bookingRes.rows[0];
    if (b.version !== req.version || req.ifMatch !== b.version) { await clientPre.query('ROLLBACK'); clientPre.release(); return { status: 412, error: 'version_mismatch' }; }
    if (b.status !== 'booked') { await clientPre.query('ROLLBACK'); clientPre.release(); return { status: 409, error: 'invalid_transition' }; }
    await clientPre.query('COMMIT');
    await clientPre.release();

    // 2. Cancellation window check (source slot)
    const windowHours = req.cancellationWindowHours ?? 24;
    const slotRes = await pool.query('SELECT slot_start_utc FROM slots WHERE id = $1', [b.slot_id]);
    const slotStart = slotRes.rows[0]?.slot_start_utc || effectiveNow;
    const startMs = new Date(slotStart).getTime();
    const nowMs = new Date(effectiveNow).getTime();
    const windowMs = windowHours * 60 * 60 * 1000;
    if (nowMs > (startMs - windowMs)) {
      return { status: 409, error: 'window_expired' };
    }

    // 3. Atomic transaction: lock source booking, cancel old, book new, preserve client_timezone
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const lockRes = await client.query('SELECT status, version, client_id, slot_id, client_timezone FROM bookings WHERE id = $1 FOR UPDATE', [req.bookingId]);
      if (lockRes.rowCount === 0) { await client.query('ROLLBACK'); return { status: 404, error: 'not_found' }; }
      const bLock = lockRes.rows[0];
      if (bLock.version !== req.version || req.ifMatch !== bLock.version) { await client.query('ROLLBACK'); return { status: 412, error: 'version_mismatch' }; }
      if (bLock.status !== 'booked') { await client.query('ROLLBACK'); return { status: 409, error: 'invalid_transition' }; }

      const newSlotRes = await client.query(
        `UPDATE slots SET status = 'booked' WHERE id = $1 AND status = 'open' AND slot_start_utc > $2 RETURNING id, provider_id, slot_start_utc`,
        [req.newSlotId, effectiveNow]
      );
      if (newSlotRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return { status: 409, error: 'slot_unavailable' };
      }

      await client.query(
        "UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1",
        [req.bookingId]
      );
      await client.query("UPDATE slots SET status = 'open' WHERE id = $1", [bLock.slot_id]);

      const newBookingRes = await client.query(
        `INSERT INTO bookings (slot_id, client_id, client_timezone, status, version) VALUES ($1, $2, $3, 'booked', $4) RETURNING id, version`,
        [req.newSlotId, bLock.client_id, bLock.client_timezone || 'UTC', bLock.version + 1]
      );
      const newBookingId = newBookingRes.rows[0].id;
      const newVersion = newBookingRes.rows[0].version;

      await client.query(
        "UPDATE reminder_jobs SET status = 'cancelled' WHERE booking_id = $1",
        [req.bookingId]
      );
      const offsets = [1440, 60];
      for (const off of offsets) {
        const fire = subtractElapsed(newSlotRes.rows[0].slot_start_utc, off);
        const fireMs = new Date(fire).getTime();
        if (fireMs > nowMs) {
          await client.query(
            `INSERT INTO reminder_jobs (booking_id, offset_minutes, fire_at_utc, status) VALUES ($1, $2, $3, 'scheduled')`,
            [newBookingId, off, fire]
          );
        }
      }

      if (req.idempotencyKey) {
        await client.query(
          `INSERT INTO idempotency_keys (client_id, key, request_hash, response_status, response_body, created_at) VALUES ($1, $2, $3, 201, $4, now())`,
          [bLock.client_id, req.idempotencyKey, JSON.stringify(req), JSON.stringify({ bookingId: newBookingId })]
        );
      }

      await client.query('COMMIT');
      if (reminderQueue) { try { await reminderQueue.cancelForBooking(req.bookingId); } catch {} }
      try {
        const svc = { act: new ActivityService(), not: new NotificationsService() };
        await svc.act.create({ action: 'BOOKING_RESCHEDULED', bookingId: newBookingId, clientId: bLock.client_id, providerId: newSlotRes.rows[0].provider_id, metadata: JSON.stringify({ oldSlotId: bLock.slot_id, newSlotId: req.newSlotId }) });
        await svc.not.create({ type: 'BOOKING_RESCHEDULED', bookingId: newBookingId, clientId: bLock.client_id, providerId: newSlotRes.rows[0].provider_id, title: 'Booking rescheduled', message: 'Your appointment has been moved.' });
      } catch (e: any) { /* event failure non-blocking */ }
      if (reminderQueue) { try { const ns = await pool.query('SELECT slot_start_utc FROM slots WHERE id = $1', [req.newSlotId]); if (ns.rowCount > 0) { const rr = await pool.query('SELECT offset_minutes FROM reminder_jobs WHERE booking_id = $1 AND status = $2', [newBookingId, 'scheduled']); const offsets = rr.rows.map((r: any) => r.offset_minutes); if (offsets.length > 0) await reminderQueue.enqueueForBooking(newBookingId, ns.rows[0].slot_start_utc, offsets, new Date()); } } catch {} }
      return { status: 201, bookingId: newBookingId };
    } catch (e: any) {
      await client.query('ROLLBACK').catch(() => {});
      if (e.code === '23505' || e.code === '23P01') {
        return { status: 409, error: 'slot_unavailable' };
      }
      return { status: 400, error: e.message || 'bad_request' };
    } finally {
      client.release();
    }
  } finally {
    clientPre.release();
  }
}
