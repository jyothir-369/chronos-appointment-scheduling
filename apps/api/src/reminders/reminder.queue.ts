/**
 * Phase 6 — Reminder Queue Manager
 * Creates deterministic BullMQ delayed jobs after DB commit.
 * Job ID format: reminder:{bookingId}:{offset} (idempotent upsert)
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReminderQueueManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderQueueManager.name);

  constructor(
    @InjectQueue('reminders') private readonly queue: Queue,
    @InjectDataSource() private readonly db: DataSource
  ) {}

  async onModuleInit() {
    this.logger.log('Reminder queue manager initialized');
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  /**
   * Enqueue all reminder jobs for a booking.
   * Called after the booking DB transaction commits.
   * */
  async enqueueForBooking(bookingId: string, slotStartUtc: string, offsets: number[], now: Date): Promise<void> {
    const jobIds: string[] = [];

    for (const offset of offsets) {
      const fireTime = new Date(new Date(slotStartUtc).getTime() - offset * 60 * 1000);

      // Skip if this reminder is already in the past
      if (fireTime <= now) {
        this.logger.warn(`Skipping reminder for booking ${bookingId}, offset ${offset}min — already in past`);
        // Mark in DB as skipped
        await this.db.query(
          `UPDATE reminder_jobs SET status = 'skipped', updated_at = now()
           WHERE booking_id = $1 AND offset_minutes = $2 AND status = 'scheduled'`,
          [bookingId, offset]
        );
        continue;
      }

      const delayMs = fireTime.getTime() - now.getTime();
      const jobId = `reminder:${bookingId}:${offset}`;

      try {
        await this.queue.add(
          'reminder',
          { reminderId: '' }, // Will be populated; the worker fetches by job
          {
            jobId,
            delay: delayMs,
            attempts: 5,
            backoff: { type: 'exponential', delay: 60000 },
            removeOnComplete: { age: 3600 },
            removeOnFail: { age: 3600 },
          }
        );
        jobIds.push(jobId);
        this.logger.log(`Enqueued reminder job ${jobId} for fire at ${fireTime.toISOString()}`);
      } catch (err: any) {
        // Job already exists (idempotent) — not an error for us
        if (err.message?.includes('already exists')) {
          this.logger.log(`Reminder job ${jobId} already exists (idempotent upsert)`);
          jobIds.push(jobId);
        } else {
          this.logger.error(`Failed to enqueue reminder ${jobId}: ${err.message}`);
          throw new Error(`Failed to enqueue reminder: ${err.message}`);
        }
      }
    }

    if (jobIds.length > 0) {
      this.logger.log(`Enqueued ${jobIds.length} reminder jobs for booking ${bookingId}`);
    }
  }

  /**
   * Remove all scheduled reminder jobs for a booking (called on cancellation).
   * Best-effort; worker re-checks DB state anyway.
   */
  async cancelForBooking(bookingId: string): Promise<void> {
    try {
      // Get all jobs for this booking from BullMQ
      const jobs = await this.queue.getJobs('delayed', 0, -1);
      const relatedJobs = jobs.filter((job) => {
        const data = job.data as { bookingId?: string };
        return data.bookingId === bookingId;
      });

      for (const job of relatedJobs) {
        await job.remove();
        this.logger.log(`Removed BullMQ job for booking ${bookingId}: ${job.id}`);
      }

      // Also remove by jobId pattern (deterministic)
      // BullMQ doesn't support pattern-based removal, so we iterate
      // The DB status update is the authoritative cancel
      this.logger.log(`Cancel requested for booking ${bookingId} — DB marks reminder_jobs as cancelled`);
    } catch (err: any) {
      this.logger.warn(`Error during cancel enqueue cleanup: ${err.message} — worker will re-check DB`);
    }
  }

  /**
   * Cancel a specific reminder by ID.
   */
  async cancelReminderJob(reminderId: string, bookingId: string, offset: number): Promise<void> {
    const jobId = `reminder:${bookingId}:${offset}`;
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Removed BullMQ job: ${jobId}`);
      }
    } catch (err: any) {
      this.logger.warn(`Error removing BullMQ job ${jobId}: ${err.message} — worker will re-check DB`);
    }

    // Authoritative cancel in DB
    await this.db.query(
      `UPDATE reminder_jobs SET status = 'cancelled', updated_at = now()
       WHERE id = $1 AND status IN ('scheduled', 'sending')`,
      [reminderId]
    );
  }

  /**
   * Get queue stats for monitoring.
   */
  async getStats(): Promise<{
    waiting: number;
    delayed: number;
    active: number;
    completed: number;
    failed: number;
  }> {
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