import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

@Injectable()
export class NotificationsService {
  async create(params: {
    type: string; providerId?: string; clientId?: string; bookingId?: string; title?: string; message?: string;
  }) {
    return prisma.notification.create({ data: params as any });
  }
  async listForProvider(providerId: string) {
    return prisma.notification.findMany({ where: { providerId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  async listForClient(clientId: string) {
    return prisma.notification.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
  async markAllReadForProvider(providerId: string) {
    return prisma.notification.updateMany({ where: { providerId, read: false }, data: { read: true } });
  }
  async markRead(id: string, clientId: string) {
    const res = await prisma.notification.updateMany({ where: { id, clientId }, data: { read: true } });
    return res;
  }
  async markAllReadForClient(clientId: string) {
    return prisma.notification.updateMany({ where: { clientId, read: false }, data: { read: true } });
  }
}
