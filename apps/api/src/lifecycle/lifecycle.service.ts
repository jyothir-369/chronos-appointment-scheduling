import { Injectable } from '@nestjs/common';
import { PrismaClient, BookingStatus } from '@prisma/client';

@Injectable()
export class LifecycleService {
  private prisma = new PrismaClient();

  async transition(id: string, toStatus: BookingStatus, expectedVersion?: number) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id } });
      if (!booking) throw new Error('Booking not found');
      const allowed: Record<string, string[]> = {
        booked: ['completed', 'cancelled', 'no_show'],
      };
      if (expectedVersion !== undefined && booking.version !== expectedVersion) {
        throw new Error('Version conflict');
      }
      const from = booking.status;
      if (!allowed[from]?.includes(toStatus)) throw new Error(`Invalid transition: ${from} -> ${toStatus}`);
      const updated = await tx.booking.update({
        where: { id },
        data: { status: toStatus, version: booking.version + 1 },
      });
      if (toStatus === 'cancelled') {
        await tx.slot.update({ where: { id: booking.slotId }, data: { status: 'available' } });
      }
      return updated;
    });
  }

  async cancel(id: string, providerWindowHours: number) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({ where: { id }, include: { slot: true } });
      if (!booking || booking.status !== 'booked') throw new Error('Booking not available for cancellation');
      const windowMs = providerWindowHours * 60 * 60 * 1000;
      const now = new Date();
      const start = new Date(booking.slot.slotStartUtc);
      const diffMs = start.getTime() - now.getTime();
      if (diffMs < windowMs) throw new Error('Cancellation window violation');
      const updated = await tx.booking.update({ where: { id }, data: { status: 'cancelled', version: booking.version + 1 } });
      await tx.slot.update({ where: { id: booking.slotId }, data: { status: 'available' } });
      return updated;
    });
  }
}
