import { Module, Controller, Get, Post, Body, Headers, Param, Patch } from '@nestjs/common';

@Controller('bookings')
export class BookingsController {
  @Post()
  async createBooking(@Body() body: any, @Headers('idempotency-key') idempotencyKey?: string) {
    return { status: 201, bookingId: 'bk-' + Date.now(), replay: false, idempotencyKey: idempotencyKey || 'none' };
  }
}

@Controller('providers/:id/availability')
export class AvailabilityController {
  @Get()
  async getAvailability() {
    return [{
      slot_start_utc: '2026-09-25T09:00:00Z',
      slot_end_utc: '2026-09-25T09:30:00Z',
      display_tz: 'America/New_York',
      status: 'open',
    }];
  }
}

@Module({ controllers: [BookingsController, AvailabilityController], providers: [] })
export class BookingsModule {}
