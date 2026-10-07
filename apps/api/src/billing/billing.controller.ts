import { Controller, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { ProviderAuthGuard } from '../auth/provider-auth.guard.js';
import { PrismaClient } from '@prisma/client';

@Controller('billing')
export class BillingController {
  private readonly prisma = new PrismaClient();

  @Get()
  @UseGuards(ProviderAuthGuard)
  async getBilling(@Request() req: any) {
    const providerId = req.provider?.id;
    if (!providerId) throw new UnauthorizedException('Provider session required');

    const [bookingsThisMonth, eventTypes, completedBookings] = await Promise.all([
      this.prisma.booking.count({
        where: {
          slot: { providerId },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.eventType.count({ where: { providerId } }),
      this.prisma.booking.findMany({
        where: { slot: { providerId }, status: 'completed' },
        select: { eventTypeId: true },
        take: 50,
      }).catch(() => []),
    ]);

    const clients = await this.prisma.client.findMany({
      where: {
        bookings: {
          some: { slot: { providerId } },
        },
      },
    });

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
      usage: { bookingsThisMonth, eventTypes, clients: clients.length },
      revenue: { estimatedRevenue: revenueEstimate, completedBookings: completedBookings.length, currency: 'USD' },
      invoices: [],
    };
  }
}
