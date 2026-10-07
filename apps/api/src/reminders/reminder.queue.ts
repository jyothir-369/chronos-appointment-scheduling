import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import pg from 'pg';
import { REMINDER_DB } from './reminder.db.js';

@Injectable()
export class ReminderQueueManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderQueueManager.name);

  constructor(
    @InjectQueue('reminders') private readonly queue: Queue,
    @Inject(REMINDER_DB) private readonly db: InstanceType<typeof pg.Pool>,
  ) {}

  async onModuleInit() {
    this.logger.log('Reminder queue manager initialized');
    await this.reconcileScheduledReminders();
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  async enqueueForBooking(
    bookingId: string,
    slotStartUtc: string | Date,
    offsets: number[],
    now: Date,
  ): Promise<void> {
    const jobIds: string[] = [];

    this.logger.log(
      `enqueueForBooking start booking=${bookingId} offsets=${offsets.join(',')}`,
    );

    for (const offset of offsets) {
      const fireTime = new Date(
        new Date(slotStartUtc).getTime() - offset * 60 * 1000,
      );

      if (fireTime <= now) {
        this.logger.warn(
          `Skipping reminder booking=${bookingId} offset=${offset} fireTime=${fireTime.toISOString()} past`,
        );

        await this.db.query(
          `UPDATE reminder_jobs
           SET status = 'skipped'
           WHERE booking_id = $1
             AND offset_minutes = $2
             AND status = 'scheduled'`,
          [bookingId, offset],
        );

        continue;
      }

      const delayMs = fireTime.getTime() - now.getTime();
      const jobId = `reminder:${bookingId}:${offset}`;

      const reminderRows = await this.db.query(
        `SELECT id
         FROM reminder_jobs
         WHERE booking_id = $1
           AND offset_minutes = $2
           AND status = 'scheduled'
         LIMIT 1`,
        [bookingId, offset],
      );

      if (reminderRows.rowCount === 0) {
        this.logger.warn(
          `No scheduled reminder row found booking=${bookingId} offset=${offset}`,
        );
        continue;
      }

      const reminderId = reminderRows.rows[0].id;

      this.logger.log(
        `Adding BullMQ jobId=${jobId} reminderId=${reminderId} delayMs=${delayMs}`,
      );

      await this.queue.add(
        'reminder',
        { reminderId },
        {
          jobId,
          delay: delayMs,
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 60000,
          },
          removeOnComplete: { age: 3600 },
          removeOnFail: { age: 3600 },
        },
      );

      jobIds.push(jobId);

      this.logger.log(
        `Enqueued reminder jobId=${jobId} reminderId=${reminderId}`,
      );
    }

    if (jobIds.length > 0) {
      this.logger.log(
        `Enqueued ${jobIds.length} reminder jobs for booking=${bookingId}: ${jobIds.join(',')}`,
      );
    }
  }

  async reconcileScheduledReminders(): Promise<void> {
    this.logger.log('Starting scheduled reminder reconciliation');

    const rows = await this.db.query(`
      SELECT
        r.id AS reminder_id,
        r.booking_id,
        r.offset_minutes,
        s.slot_start_utc
      FROM reminder_jobs r
      JOIN bookings b ON b.id = r.booking_id
      JOIN slots s ON s.id = b.slot_id
      WHERE r.status = 'scheduled'
        AND b.status = 'booked'
      ORDER BY s.slot_start_utc, r.offset_minutes DESC
    `);

    const now = new Date();

    for (const row of rows.rows) {
      try {
        await this.enqueueForBooking(
          row.booking_id,
          row.slot_start_utc,
          [Number(row.offset_minutes)],
          now,
        );
      } catch (err: any) {
        this.logger.error(
          `Reminder reconciliation failed booking=${row.booking_id} reminder=${row.reminder_id}: ${err?.message || String(err)}`,
          err?.stack,
        );
      }
    }

    this.logger.log(
      `Scheduled reminder reconciliation complete rows=${rows.rowCount}`,
    );
  }

  async cancelForBooking(bookingId: string): Promise<void> {
    this.logger.log(`cancelForBooking booking=${bookingId}`);

    const reminderRows = await this.db.query(
      `SELECT id, offset_minutes
       FROM reminder_jobs
       WHERE booking_id = $1
         AND status IN ('scheduled', 'sending')`,
      [bookingId],
    );

    for (const row of reminderRows.rows) {
      const jobId = `reminder:${bookingId}:${row.offset_minutes}`;

      try {
        const job = await this.queue.getJob(jobId);

        if (job) {
          await job.remove();
          this.logger.log(`Removed BullMQ job ${jobId}`);
        }
      } catch (err: any) {
        this.logger.warn(
          `Error removing BullMQ job ${jobId}: ${err?.message || String(err)}`,
        );
      }
    }

    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'cancelled'
       WHERE booking_id = $1
         AND status IN ('scheduled', 'sending')`,
      [bookingId],
    );

    this.logger.log(`cancelForBooking complete booking=${bookingId}`);
  }

  async cancelReminderJob(
    reminderId: string,
    bookingId: string,
    offset: number,
  ): Promise<void> {
    const jobId = `reminder:${bookingId}:${offset}`;

    try {
      const job = await this.queue.getJob(jobId);

      if (job) {
        await job.remove();
        this.logger.log(`Removed BullMQ job ${jobId}`);
      }
    } catch (err: any) {
      this.logger.warn(
        `Error removing BullMQ job ${jobId}: ${err?.message || String(err)}`,
      );
    }

    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'cancelled'
       WHERE id = $1
         AND status IN ('scheduled', 'sending')`,
      [reminderId],
    );
  }

  async getStats() {
    return {
      waiting: await this.queue.getWaitingCount(),
      delayed: await this.queue.getDelayedCount(),
      active: await this.queue.getActiveCount(),
      completed: await this.queue.getCompletedCount(),
      failed: await this.queue.getFailedCount(),
    };
  }
}

export const REMINDER_QUEUE = 'reminders';



