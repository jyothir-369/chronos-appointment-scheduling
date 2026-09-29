import { Controller, Post, Body, ConflictException, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('bookings')
export class BookingsController {
  private prisma = new PrismaClient();

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: { slot_id: string; client_name: string; email: string; phone?: string; notes?: string; event_type_id?: string }) {
    return this.prisma.$transaction(async (tx) => {
      // Verify slot exists and is available; rely on DB constraints, not SELECT-then-INSERT
      const slot = await tx.slot.findUnique({ where: { id: body.slot_id }, include: { provider: true, bookings: true } });
      if (!slot || slot.status !== 'available') {
        throw new ConflictException('Slot not available');
      }
      const client = await tx.client.upsert({
        where: { email: body.email },
        create: { email: body.email, name: body.client_name, phone: body.phone || null },
        update: { name: body.client_name, phone: body.phone || null },
      });
      try {
        const booking = await tx.booking.create({
          data: {
            slotId: body.slot_id,
            providerId: slot.providerId,
            clientId: client.id,
            eventTypeId: body.event_type_id || null,
            status: 'booked',
            notes: body.notes || null,
          },
        });
        await tx.slot.update({ where: { id: body.slot_id }, data: { status: 'booked' } });
        return booking;
      } catch (e: any) {
        // UNIQUE(slot_id) violation = concurrent booking lost the race
        if (e.code === 'P2002') {
          throw new ConflictException('Slot just taken — please pick another.');
        }
        throw e;
      }
    });
  }
}
