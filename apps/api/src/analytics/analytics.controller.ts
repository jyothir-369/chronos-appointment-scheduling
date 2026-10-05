import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  private readonly prisma = new PrismaClient();

  @Get()
  async getAnalytics(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    try {
      const where: any = {};
      if (start || end) {
        where.createdAt = {};
        if (start) where.createdAt.gte = new Date(start);
        if (end) where.createdAt.lte = new Date(end);
      }

      const [total, completed, cancelled, noShow, bookings] = await Promise.all([
        this.prisma.booking.count({ where }),
        this.prisma.booking.count({ where: { ...where, status: 'completed' } }),
        this.prisma.booking.count({ where: { ...where, status: 'cancelled' } }),
        this.prisma.booking.count({ where: { ...where, status: 'no_show' } }),
        this.prisma.booking.findMany({
          where,
          include: { slot: true, client: true },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
      ]);

      const totalFinished = completed + cancelled + noShow;
      const completionRate = totalFinished > 0 ? Math.round((completed / totalFinished) * 100) : 0;
      const cancellationRate = totalFinished > 0 ? Math.round((cancelled / totalFinished) * 100) : 0;

      const slots = bookings.map((b: any) => b.slot).filter(Boolean);
      const openSlots = slots.filter((s: any) => s.status === 'open').length;
      const bookedSlots = slots.filter((s: any) => s.status === 'booked').length;
      const utilization = (openSlots + bookedSlots) > 0 ? Math.round((bookedSlots / (openSlots + bookedSlots)) * 100) : 0;

      return {
        range: { start: start || null, end: end || null },
        totals: { total, completed, cancelled, noShow, booked: total - cancelled - noShow },
        rates: { completionRate, cancellationRate, utilization },
        bookings: bookings.map((b: any) => ({
          id: b.id,
          status: b.status,
          createdAt: b.createdAt,
          slotStartUtc: b.slot?.slotStartUtc || null,
          slotEndUtc: b.slot?.slotEndUtc || null,
          clientName: b.client ? (b.client.name || b.client.email) : null,
        })),
      };
    } catch (e: any) {
      // Zero-state safe response on any runtime error
      return {
        range: { start: start || null, end: end || null },
        totals: { total: 0, completed: 0, cancelled: 0, noShow: 0, booked: 0 },
        rates: { completionRate: 0, cancellationRate: 0, utilization: 0 },
        bookings: [],
        error: 'Analytics unavailable (zero-state)' // internal only; frontend should handle
      };
    }
  }
}
