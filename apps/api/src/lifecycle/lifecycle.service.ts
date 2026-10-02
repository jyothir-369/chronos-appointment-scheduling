import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  PrismaClient,
  SlotStatus,
} from '@prisma/client';

@Injectable()
export class LifecycleService {
  private readonly prisma = new PrismaClient();

  async transition(
    id: string,
    toStatus: BookingStatus,
    expectedVersion?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (
        expectedVersion !== undefined &&
        booking.version !== expectedVersion
      ) {
        throw new Error('Version conflict');
      }

      const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
        [BookingStatus.booked]: [
          BookingStatus.completed,
          BookingStatus.cancelled,
          BookingStatus.no_show,
        ],
        [BookingStatus.completed]: [],
        [BookingStatus.cancelled]: [],
        [BookingStatus.no_show]: [],
      };

      const allowed = allowedTransitions[booking.status] ?? [];

      if (!allowed.includes(toStatus)) {
        throw new Error(
          `Invalid transition: ${booking.status} -> ${toStatus}`,
        );
      }

      const updated = await tx.booking.update({
        where: {
          id,
        },
        data: {
          status: toStatus,
          version: booking.version + 1,
        },
      });

      if (toStatus === BookingStatus.cancelled) {
        await tx.slot.update({
          where: {
            id: booking.slotId,
          },
          data: {
            status: SlotStatus.open,
          },
        });
      }

      return updated;
    });
  }

  async cancel(
    id: string,
    providerWindowHours: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: {
          id,
        },
        include: {
          slot: true,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.status !== BookingStatus.booked) {
        throw new Error('Booking not available for cancellation');
      }

      const windowMs =
        providerWindowHours * 60 * 60 * 1000;

      const now = Date.now();
      const slotStart = booking.slot.slotStartUtc.getTime();

      const remainingMs = slotStart - now;

      if (remainingMs < windowMs) {
        throw new Error('Cancellation window violation');
      }

      const updated = await tx.booking.update({
        where: {
          id,
        },
        data: {
          status: BookingStatus.cancelled,
          version: booking.version + 1,
        },
      });

      await tx.slot.update({
        where: {
          id: booking.slotId,
        },
        data: {
          status: SlotStatus.open,
        },
      });

      return updated;
    });
  }
}
