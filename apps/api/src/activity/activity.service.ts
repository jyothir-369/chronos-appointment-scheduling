import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

@Injectable()
export class ActivityService {
  async create(params: {
    action: string;
    bookingId?: string;
    providerId?: string;
    clientId?: string;
    metadata?: string;
  }) {
    return prisma.activity.create({ data: params as any });
  }
  async listByProvider(providerId: string) {
    return prisma.activity.findMany({ where: { providerId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  async listByClient(clientId: string) {
    if (!clientId || typeof clientId !== 'string') return [];
    try {
      return await prisma.activity.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 50 });
    } catch {
      return [];
    }
  }
}
