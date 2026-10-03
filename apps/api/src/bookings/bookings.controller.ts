import { Controller, Post, Body, Headers, ConflictException, HttpCode, HttpStatus, Get, Param, Patch } from '@nestjs/common';
import { Pool } from 'pg';
import { createBooking, BookingRequest } from './bookings.service.js';
import { rescheduleBooking } from './reschedule.service.js';
import { evaluateCancellation } from './lifecycle.service.js';
import { clock } from '@chronos/time';
import { CreateBookingDto } from './dto/create-booking.dto.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function extractClientFromCookie(cookie?: string): string | null {
  if (!cookie) return null;
  const match = cookie.match(/chronos_session=([^;]+)/);
  return match ? match[1] : null;
}

@Controller('bookings')
export class BookingsController {
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBooking(
    @Body() body: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('cookie') cookie?: string
  ) {
    const sessionClientId = extractClientFromCookie(cookie);
    const req: BookingRequest = {
      slotId: body.slot_id,
      clientId: sessionClientId || body.email || 'anonymous',
      ...(idempotencyKey !== undefined || body.idempotency_key !== undefined
        ? { idempotencyKey: idempotencyKey || body.idempotency_key }
        : {}),
      clientTimezone: 'UTC',
    };
    const result = await createBooking(pool, req, clock.now().toString());
    if (result.status === 201) return { status: 201, bookingId: result.bookingId, replay: result.replay };
    if (result.status === 409) throw new ConflictException(result.error || 'Slot unavailable');
    if (result.status === 422) throw new ConflictException(result.error || 'Idempotency conflict');
    throw new ConflictException(result.error || 'Booking failed');
  }

  @Get(':id')
  async getBooking(@Param('id') id: string, @Headers('cookie') cookie?: string) {
    const sessionClientId = extractClientFromCookie(cookie);
    if (!sessionClientId) return { status: 401, error: 'unauthorized' };
    const res = await pool.query(
      'SELECT b.id, b.slot_id, b.status, b.version, b.client_timezone, s.slot_start_utc, s.slot_end_utc FROM bookings b JOIN slots s ON b.slot_id = s.id WHERE b.id = $1 AND b.client_id::text = $2::text',
      [id, sessionClientId]
    );
    if (res.rowCount === 0) return { status: 404, error: 'not_found' };
    const r = res.rows[0];
    return {
      id: r.id,
      booking_id: r.id,
      status: r.status,
      version: r.version,
      client_timezone: r.client_timezone,
      slot_start_utc: r.slot_start_utc,
      slot_end_utc: r.slot_end_utc,
    };
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
  async rescheduleBooking(
    @Param('id') id: string,
    @Body() body: { newSlotId: string; idempotencyKey?: string; version: number; ifMatch: number; cancellationWindowHours?: number },
    @Headers('cookie') cookie?: string
  ) {
    const sessionClientId = extractClientFromCookie(cookie);
    if (!sessionClientId) return { status: 401, error: 'unauthorized' };
    // Verify ownership
    const res = await pool.query('SELECT client_id, slot_id FROM bookings WHERE id = $1', [id]);
    if (res.rowCount === 0) return { status: 404, error: 'not_found' };
    if (res.rows[0].client_id !== sessionClientId) return { status: 403, error: 'unauthorized' };

    const result = await rescheduleBooking(pool, {
      bookingId: id,
      newSlotId: body.newSlotId,
      idempotencyKey: body.idempotencyKey ?? undefined,
      version: body.version,
      ifMatch: body.ifMatch,
      cancellationWindowHours: body.cancellationWindowHours ?? 24,
    } as any, clock.now().toString());
    return result;
  }

  @Post(':id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Headers('if-match') ifMatch?: string,
    @Headers('cookie') cookie?: string
  ) {
    const sessionClientId = extractClientFromCookie(cookie);
    if (!sessionClientId) return { status: 401, error: 'unauthorized' };
    const res = await pool.query('SELECT status, version, client_id, slot_id FROM bookings WHERE id = $1', [id]);
    if (res.rowCount === 0) return { status: 404, error: 'not_found' };
    const b = res.rows[0];
    if (b.client_id !== sessionClientId) return { status: 403, error: 'unauthorized' };
    const match = parseInt(ifMatch || '1', 10);
    if (match !== b.version) return { status: 412, error: 'version_mismatch' };

    const slotRes = await pool.query('SELECT slot_start_utc FROM slots WHERE id = $1', [b.slot_id]);
    const providerRes = await pool.query('SELECT cancellation_window_hours FROM providers WHERE id = (SELECT provider_id FROM slots WHERE id = $1)', [b.slot_id]);
    const windowHours = providerRes.rows[0]?.cancellation_window_hours ?? 24;

    const nowUtc = clock.now().toString();
    const cancelRes = evaluateCancellation(
      { bookingId: id, version: b.version, ifMatch: match, nowUtc, cancellationWindowHours: windowHours, slotStartUtc: slotRes.rows[0]?.slot_start_utc || nowUtc },
      b.status as any,
      b.version
    );
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