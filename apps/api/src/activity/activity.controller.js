import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
@Controller('activity')
export class ActivityController {
  @Get()
  async list(@Query() q?: any) {
    return { activities: [], total: 0 };
  }
}
