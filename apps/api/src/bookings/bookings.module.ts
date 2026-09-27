import { Module, Controller, Get, Post, Body, Headers, Param, Patch, Query } from '@nestjs/common';
import { Pool } from 'pg';
import { clock, subtractElapsed, reminderFireTimes } from '@chronos/time';
import { createBooking } from './bookings.service.js';
import { evaluateCancellation } from './lifecycle.service.js';
import { rescheduleBooking } from './reschedule.service.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chronos:chronos@localhost:5433/chronos' });

function extractClientFromCookie(cookie?: string): string | null {
  if (!cookie) return null;
  const match = cookie.match(/chronos_session=([^;]+)/);
  return match ? match[1] : null;
}

@Controller('bookings')
export class BookingsController {
  @Post()
  async createBooking(@Body() body: any, @Headers('idempotency-key') idempotencyKey?: string, @Headers('cookie') cookie?: string) {
    const sessionClientId = extractClientFromCookie(cookie);
    const req = {
      slotId: body.slotId,
      clientId: sessionClientId || body.clientId || '',
      idempotencyKey: idempotencyKey || body.idempotencyKey,
      clientTimezone: body.clientTimezone || 'UTC',
    };
    const nowInst = clock.now();
    const result = await createBooking(pool, req, nowInst.toString());
    return result;
  }

  @Get()
  async listBookings(@Headers('cookie') cookie?: string) {
    const sessionClientId = extractClientFromCookie(cookie);
    if (!sessionClientId) return { status: 401, error: 'unauthorized' };
    const res = await pool.query(
      'SELECT b.id, b.slot_id, b.status, b.version, b.client_timezone, s.slot_start_utc, s.slot_end_utc FROM bookings b JOIN slots s ON b.slot_id = s.id WHERE b.client_id::text = $1::text ORDER BY b.created_at DESC',
      [sessionClientId]
    );
    return res.rows.map((r: any) => ({
      id: r.id,
      booking_id: r.id,
      status: r.status,
      version: r.version,
      client_timezone: r.client_timezone,
      slot_start_utc: r.slot_start_utc,
      slot_end_utc: r.slot_end_utc,
    }));
  }

  @Post(':id/reschedule')
  async rescheduleBooking(@Param('id') id: string, @Body() body: any, @Headers('cookie') cookie?: string) {
    const sessionClientId = extractClientFromCookie(cookie);
    if (!sessionClientId) return { status: 401, error: 'unauthorized' };
    // Verify ownership
    const res = await pool.query('SELECT client_id FROM bookings WHERE id = $1', [id]);
    if (res.rowCount === 0) return { status: 404, error: 'not_found' };
    if (res.rows[0].client_id !== sessionClientId) return { status: 403, error: 'unauthorized' };

    const result = await rescheduleBooking(pool, {
      bookingId: id,
      newSlotId: body.newSlotId,
      idempotencyKey: body.idempotencyKey,
      version: body.version,
      ifMatch: body.ifMatch,
      cancellationWindowHours: body.cancellationWindowHours,
    }, clock.now().toString());
    return result;
  }

  @Post(':id/cancel')
  async cancelBooking(@Param('id') id: string, @Headers('if-match') ifMatch?: string, @Headers('cookie') cookie?: string) {
    const sessionClientId = extractClientFromCookie(cookie);
    if (!sessionClientId) return { status: 401, error: 'unauthorized' };
    const res = await pool.query('SELECT status, version, client_id FROM bookings WHERE id = $1', [id]);
    if (res.rowCount === 0) return { status: 404, error: 'not_found' };
    const b = res.rows[0];
    if (b.client_id !== sessionClientId) return { status: 403, error: 'unauthorized' };
    const match = parseInt(ifMatch || '1', 10);
    if (match !== b.version) return { status: 412, error: 'version_mismatch' };
    const slotRes = await pool.query('SELECT slot_start_utc FROM slots WHERE id = $1', [b.slot_id]);
    const nowInst = clock.now();
    const cancelRes = evaluateCancellation({ bookingId: id, version: b.version, ifMatch: match, nowUtc: nowInst.toString(), cancellationWindowHours: 24, slotStartUtc: slotRes.rows[0]?.slot_start_utc || nowInst.toString() }, b.status as any, b.version);
    if (!cancelRes.allowed) {
      if (cancelRes.error === 'version_mismatch') return { status: 412, error: cancelRes.error };
      if (cancelRes.error === 'window_expired') return { status: 409, error: cancelRes.error };
      return { status: 409, error: cancelRes.error || 'cancel_failed' };
    }
    await pool.query('BEGIN');
    await pool.query("UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1", [id]);
    await pool.query("UPDATE slots SET status = 'open' WHERE id = $1", [b.slot_id]);
    await pool.query('COMMIT');
    return { status: 204 };
  }
}

@Controller('providers/:id/availability')
export class AvailabilityController {
  @Get()
  async getAvailability(@Param('id') id: string) {
    const res = await pool.query(
      "SELECT id as slot_id, slot_start_utc, slot_end_utc, display_tz, status FROM slots WHERE provider_id = $1 AND status = 'open' ORDER BY slot_start_utc ASC",
      [id]
    );
    return res.rows.map((r: any) => ({
      slot_start_utc: r.slot_start_utc,
      slot_end_utc: r.slot_end_utc,
      display_tz: r.display_tz,
      status: r.status,
      slot_id: r.slot_id,
    }));
  }
}

@Module({ controllers: [BookingsController, AvailabilityController], providers: [] })
export class BookingsModule {}
