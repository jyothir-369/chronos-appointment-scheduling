import { Controller, Get, Query, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ProviderAuthGuard } from '../auth/provider-auth.guard.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
@Controller('dashboard/summary')
export class DashboardSummaryController {
  @Get()
  @UseGuards(ProviderAuthGuard)
  async summary(@Request() req: any, @Query('tz') tz?: string) {
    const zone = tz || 'UTC';
    try { Intl.DateTimeFormat(undefined, { timeZone: zone }); } catch {}
    const providerId = req.provider?.id;
    if (!providerId) throw new UnauthorizedException('Provider session required');
    const bookings = await prisma.booking.findMany({
      where: { slot: { providerId } },
      include: { slot: { include: { provider: true } } },
    });
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
