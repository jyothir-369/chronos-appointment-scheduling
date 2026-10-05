import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('billing')
export class BillingController {
  private readonly prisma = new PrismaClient();

  @Get()
  async getBilling() {
    const [bookingsThisMonth, eventTypes, clients] = await Promise.all([
      this.prisma.booking.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.eventType.count(),
      this.prisma.client.count(),
    ]);

    const completedBookings = await this.prisma.booking.findMany({
      where: { status: 'completed' },
      select: { eventTypeId: true },
      take: 50,
    }).catch(() => []);

    const eventTypeIds = completedBookings
      .map((b) => b.eventTypeId)
      .filter((id): id is string => Boolean(id));

    const eventTypesById = eventTypeIds.length > 0
      ? new Map(
          (await this.prisma.eventType.findMany({
            where: { id: { in: eventTypeIds } },
            select: { id: true, price: true },
          })).map((eventType) => [eventType.id, eventType])
        )
      : new Map();

    const revenueEstimate = completedBookings.reduce((sum, b) => {
      const price = b.eventTypeId ? eventTypesById.get(b.eventTypeId)?.price ?? 0 : 0;
      return sum + (typeof price === 'number' ? price : 0);
    }, 0);

    return {
      plan: { name: 'Professional', status: 'active', billingCycle: 'monthly' },
      usage: { bookingsThisMonth, eventTypes, clients },
      revenue: { estimatedRevenue: revenueEstimate, completedBookings: completedBookings.length, currency: 'USD' },
      invoices: [],
    };
  }
}
