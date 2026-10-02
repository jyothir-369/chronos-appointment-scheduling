import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class MaterializerService {
  private readonly logger = new Logger(MaterializerService.name);
  private prisma = new PrismaClient();

  async materialize(providerId?: string) {
    const stats = { providersProcessed: 0, rulesProcessed: 0, slotsCreated: 0, slotsSkipped: 0, errors: 0 };
    try {
      const providers = providerId
        ? await this.prisma.provider.findMany({ where: { id: providerId } })
        : await this.prisma.provider.findMany();
      stats.providersProcessed = providers.length;

      for (const p of providers) {
        const rules = await this.prisma.availabilityRule.findMany({ where: { providerId: p.id } });
        stats.rulesProcessed += rules.length;
        await this.prisma.slot.deleteMany({ where: { providerId: p.id, slotStartUtc: { lt: new Date(Date.now() + 60*86400000) } } }).catch(() => {});
        const base = new Date();
        for (let d = 0; d < 60; d++) {
          const start = new Date(base.getTime() + d * 86400000);
          try {
            await this.prisma.slot.create({
              data: { providerId: p.id, slotStartUtc: start, slotEndUtc: new Date(start.getTime() + 3600000), status: 'open'},
            });
            stats.slotsCreated += 1;
          } catch (e: any) {
            if (e.code === 'P2002') stats.slotsSkipped += 1; else stats.errors += 1;
          }
        }
      }
      this.logger.log(`Materialize completed: ${JSON.stringify(stats)}`);
    } catch (e: any) {
      stats.errors += 1;
      this.logger.error('Materialize error', e);
    }
    return stats;
  }
}
