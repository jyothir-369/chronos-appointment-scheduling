import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { MaterializerService } from './materializer.service.js';

@Injectable()
export class MaterializeQueue implements OnModuleInit {
  private readonly logger = new Logger(MaterializeQueue.name);
  constructor(
    @InjectQueue('materialize') private readonly queue: Queue,
    private readonly materializer: MaterializerService,
  ) {}

  async onModuleInit() {
    await this.queue.add('materialize', {}, { repeat: { every: 86400000 }, jobId: 'materialize-daily' });
    this.logger.log('Materialize repeatable job registered (daily 02:00)');
  }

  async runOnce(providerId?: string) {
    return this.materializer.materialize(providerId);
  }
}
