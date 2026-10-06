import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('reports')
export class ReportsController {
  private readonly prisma = new PrismaClient();

  @Get()
  async getReports(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const where: any = {};
    if (start || end) {
      where.createdAt = {};
      if (start) where.createdAt.gte = new Date(start + (start.length === 10 ? "T00:00:00Z" : ""));
      if (end) where.createdAt.lte = new Date(end + (end.length === 10 ? "T23:59:59Z" : ""));
    }

    try {
      const bookings = await this.prisma.booking.findMany({
        where,
        include: { client: true, slot: true, eventType: true },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      const completed = bookings.filter((b: any) => b.status === 'completed' || b.status === 'booked');
      const totalRevenue = completed.reduce((s: number, b: any) => {
        // Derive from EventType price when available; no bookings.revenue column exists
        const price = (b.eventTypeId && b.eventType && typeof b.eventType.price === 'number') ? b.eventType.price : 0;
        return s + price;
      }, 0);
      const completedCount = completed.length;
      const cancelledCount = bookings.filter((b: any) => b.status === 'cancelled').length;
      const rescheduleRate = "N/A (no reschedule persistence in schema)";
      const cancellationRate = bookings.length ? `${Math.round((cancelledCount / bookings.length) * 100)}%` : "0%";

      const breakdown = bookings.map((b: any) => ({
        id: b.id,
        status: b.status,
        clientName: b.client ? (b.client.name || b.client.email || "Unknown") : "Unknown",
        eventType: (b.eventTypeId ? (b.eventType ? b.eventType.name || "—" : "—") : "—"),
        date: b.slot && b.slot.slotStartUtc ? new Date(b.slot.slotStartUtc).toISOString().split('T')[0] : (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : "—"),
        revenue: (b.eventTypeId && b.eventType && typeof b.eventType.price === 'number') ? b.eventType.price : 0,
      }));

      return {
        success: true,
        totalRevenue,
        completedCount,
        rescheduleRate,
        cancellationRate,
        breakdown,
        count: bookings.length,
        range: { start: start || null, end: end || null },
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || "Internal error",
        totalRevenue: 0,
        completedCount: 0,
        rescheduleRate: "0%",
        cancellationRate: "0%",
        breakdown: [],
        count: 0,
        range: { start: start || null, end: end || null },
      };
    }
  }
}
