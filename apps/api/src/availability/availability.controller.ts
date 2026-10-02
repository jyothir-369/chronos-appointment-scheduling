import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('providers')
export class AvailabilityController {
  private prisma = new PrismaClient();
  @Get(':id/availability')
  async getAvailability(@Param('id') id: string, @Query('tz') tz?: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Provider not found');
    const displayTz = tz || provider.timezone || 'UTC';
    const rules = await this.prisma.availabilityRule.findMany({ where: { providerId: id, active: true } });
    const slots = await this.prisma.slot.findMany({ where: { providerId: id, status: 'open' }, orderBy: { slotStartUtc: 'asc' } });
    return { provider, rules, slots: slots.map(s => ({ ...s, display_tz: displayTz })) };
  }
}
