import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('event-types')
export class EventTypesController {
  private readonly prisma = new PrismaClient();

  @Get()
  async findAll() {
    return this.prisma.eventType.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
