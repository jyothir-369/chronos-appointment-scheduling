import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class AvailabilityService {
  private prisma = new PrismaClient();
  async findByProvider(providerId: string) {
    return this.prisma.availabilityRule.findMany({ where: { providerId, active: true } });
  }
}
