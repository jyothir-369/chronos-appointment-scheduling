import { Controller, Get, Query, Param } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

@Controller('appointments')
export class AppointmentsController {
  @Get()
  async list(@Query() q?: any) {
    const where: any = {};
    if (q?.status) where.status = q.status;
    const bookings = await prisma.booking.findMany({ where, include: { slot: true, client: true, provider: true }, orderBy: { createdAt: 'desc' }, take: 50, skip: q?.page ? (parseInt(q.page)-1)*50 : 0 });
    return bookings.map((b: any) => ({ id: b.id, status: b.status, version: b.version, slotStartUtc: b.slot?.slotStartUtc, clientName: b.client?.name || b.client?.email }));
  }
  @Get(':id')
  async get(@Param('id') id: string) {
    const b = await prisma.booking.findUnique({ where: { id }, include: { slot: true, client: true } });
    if (!b) return { status: 404 }; return b;
  }
}
