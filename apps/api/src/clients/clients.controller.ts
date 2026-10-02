import { Controller, Get } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('clients')
export class ClientsController {
  private readonly prisma = new PrismaClient();

  @Get()
  async findAll() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}
