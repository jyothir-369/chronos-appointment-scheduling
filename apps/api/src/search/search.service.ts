import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly prisma = new PrismaClient();

  async searchProviderData(providerId: string, q: string) {
    const term = q.trim().toLowerCase();
    const clients = await this.prisma.client.findMany({
      where: { providerId: providerId } as any,
    }).then((list) => list.filter((c: any) =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.email && c.email.toLowerCase().includes(term)) ||
      (c.company && c.company.toLowerCase().includes(term))
    ).slice(0, 10));

    const eventTypes = await this.prisma.eventType.findMany({
      where: { providerId: providerId } as any,
    }).then((list) => list.filter((e: any) =>
      (e.title && e.title.toLowerCase().includes(term)) ||
      (e.slug && e.slug.toLowerCase().includes(term))
    ).slice(0, 10));

    return {
      clients: clients.map((c: any) => ({ id: c.id, name: c.name, email: c.email, company: c.company })),
      eventTypes: eventTypes.map((e: any) => ({ id: e.id, name: e.title || e.slug, slug: e.slug })),
      total: clients.length + eventTypes.length,
      query: q,
    };
  }
}
