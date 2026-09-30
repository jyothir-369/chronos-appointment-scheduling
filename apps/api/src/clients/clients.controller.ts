import { Controller, Get, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Controller('$NAME')
export class $NAMEController {
  private prisma = new PrismaClient();
  @Get()
  async findAll() { return this.prisma.$NAME.findMany(); }
}
