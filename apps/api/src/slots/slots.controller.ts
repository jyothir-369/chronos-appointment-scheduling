import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('slots')
export class SlotsController {
  private readonly prisma = new PrismaClient();

  @Get()
  async findAll() {
    return this.prisma.slot.findMany({
      orderBy: { slotStartUtc: 'asc' },
    });
  }
}
