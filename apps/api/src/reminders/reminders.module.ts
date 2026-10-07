import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReminderQueueManager } from './reminder.queue.js';
import { ReminderWorker } from './reminder.worker.js';
import { reminderDbProvider } from './reminder.db.js';
import { EmailGateway } from '../email/email.gateway.js';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6380,
        password: 'localdev',
      },
    }),
    BullModule.registerQueue({ name: 'reminders' }),
  ],
  providers: [
    reminderDbProvider,
    ReminderQueueManager,
    ReminderWorker,
    EmailGateway,
  ],
  exports: [ReminderQueueManager],
})
export class RemindersModule {}