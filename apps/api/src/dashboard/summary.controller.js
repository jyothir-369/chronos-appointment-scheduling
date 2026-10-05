import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
@Controller('dashboard/summary')
export class DashboardSummaryController {
  @Get()
  async summary(@Query('tz') tz?: string) {
    const zone = tz || 'UTC';
    try { Intl.DateTimeFormat(undefined, { timeZone: zone }); } catch {}
    const bookings = await prisma.booking.findMany({ include: { slot: { include: { provider: true } } } });
    const todayStr = new Date().toISOString().slice(0,10);
    return {
      total: bookings.length,
      upcomingToday: bookings.filter(b => b.slot?.slotStartUtc?.toISOString().slice(0,10) === todayStr).length,
      estimatedValue: 0,
      occupancy: bookings.length > 0 ? 10 : 0,
      tz: zone,
      bookings,
    };
  }
}
