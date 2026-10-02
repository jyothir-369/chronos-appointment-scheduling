import { Controller, Post, Body, Headers, ConflictException, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { Pool } from 'pg';
import { createBooking, BookingRequest } from './bookings.service.js';
import { clock } from '@chronos/time';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chronos:${DATABASE_PASSWORD:-CHANGE_ME}@localhost:5433/chronos' });

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
    @Body() body: { slot_id: string; client_name?: string; email?: string; notes?: string; event_type_id?: string; idempotency_key?: string },
    @Headers('idempotency-key') idempotencyKey?: string,
    @Headers('cookie') cookie?: string
  ) {
    const sessionClientId = extractClientFromCookie(cookie);
    const req: BookingRequest = {
      slotId: body.slot_id,
      clientId: sessionClientId || body.email || 'anonymous',
      ...(idempotencyKey !== undefined || body.idempotency_key !== undefined ? { idempotencyKey: idempotencyKey || body.idempotency_key } : {}),
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
    // Basic ownership check placeholder
    return { id, status: 'fetched' };
  }
}
