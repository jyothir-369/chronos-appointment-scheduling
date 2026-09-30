import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('providers')
export class AvailabilityController {
  private prisma = new PrismaClient();
  @Get(':id/availability')
  async getAvailability(@Param('id') id: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Provider not found');
    const rules = await this.prisma.availabilityRule.findMany({ where: { providerId: id, active: true } });
    const slots = await this.prisma.slot.findMany({ where: { providerId: id } });
    return { provider, rules, slots };
  }
}
