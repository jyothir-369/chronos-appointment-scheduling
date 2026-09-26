/**
 * Phase 6 — Reminder Worker
 * Idempotent, claims via DB, sends with provider idempotency key,
 * handles transient vs permanent errors, implements backoff.
 *
 * BullMQ job payload = { reminderId } only — never trusts payload for content.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ReminderJobStatus, ReminderJob } from './reminder.types';
import { ReminderError, NetworkError, ProviderError } from './reminder.types';

const RETRY_BACKOFF = {
  type: 'exponential',
  delay: 60000, // 1 min base
} as const;

const MAX_ATTEMPTS = 5;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000 - 1; // Just under provider 24h retention
const LOCK_DURATION_MS = 2 * 60 * 1000; // 2 min lock

@Injectable()
export class ReminderWorker {
  private readonly logger = new Logger(ReminderWorker.name);

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly providerClient: ClientProxy
  ) {}

  /**
   * Claim the next due reminder job.
   * Atomically moves it to 'sending' state with lock.
   */
  async claimDue(): Promise<ReminderJob | null> {
    const now = new Date().toISOString();
    const lockUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();

    const result = await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'sending',
           attempts = attempts + 1,
           locked_until = $1,
           updated_at = now()
       WHERE id IN (
         SELECT id FROM reminder_jobs
         WHERE status IN ('scheduled', 'sending')
           AND (status = 'scheduled' OR locked_until < now())
         ORDER BY fire_at_utc ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [lockUntil]
    );

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    this.logger.log(`Claimed reminder ${row.id} (attempt ${row.attempts})`);
    return this.toReminderJob(row);
  }

  /**
   * Process a claimed reminder: load booking, render, send, mark sent.
   */
  async process(reminderId: string): Promise<void> {
    const reminder = await this.getReminder(reminderId);
    if (!reminder) throw new ReminderError(`Reminder ${reminderId} not found`, 'NOT_FOUND', 404);

    if (reminder.status !== 'sending') {
      throw new ReminderError(`Reminder ${reminderId} not in sending state`, 'VALIDATION', 409);
    }

    // Load booking + client info
    const booking = await this.getBooking(reminder.bookingId);
    if (!booking) {
      await this.markFailed(reminder.id, 'Booking not found');
      throw new ReminderError(`Booking ${reminder.bookingId} not found`, 'NOT_FOUND', 404);
    }

    // Only 'booked' reminders should fire
    if (booking.status !== 'booked') {
      await this.markCancelled(reminder.id, 'Booking is no longer booked');
      this.logger.warn(`Skipping reminder for cancelled booking ${booking.id}`);
      return;
    }

    // Compute retry window
    const fireTime = new Date(reminder.fireAtUtc).getTime();
    const now = Date.now();
    if (now - fireTime > RETRY_WINDOW_MS) {
      await this.markFailed(reminder.id, 'Retry window exceeded');
      throw new ReminderError(`Reminder ${reminderId} exceeded retry window`, 'VALIDATION', 409);
    }

    // Render in client timezone
    const rendered = await this.renderReminder(booking, reminder);

    // Send with provider idempotency key
    const idempotencyKey = `reminder/${booking.id}/${reminder.offsetMinutes}`;

    try {
      const result = await this.sendWithProvider(rendered, idempotencyKey);
      await this.markSent(reminder.id, result.providerMessageId);
      this.logger.log(`Reminder ${reminder.id} sent: ${result.providerMessageId}`);
    } catch (err: any) {
      if (err instanceof NetworkError) {
        this.logger.error(`Network error sending reminder ${reminder.id}: ${err.message}`);
        throw err; // Let BullMQ retry with backoff
      }
      if (err instanceof ProviderError) {
        this.logger.error(`Provider error sending reminder ${reminder.id}: ${err.message}`);
        await this.markFailed(reminder.id, err.message);
        return;
      }
      throw err;
    }
  }

  // ========== Helper Methods ==========

  private async getReminder(id: string): Promise<ReminderJob | null> {
    const result = await this.db.query(
      `SELECT * FROM reminder_jobs WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) return null;
    return this.toReminderJob(result.rows[0]);
  }

  private async getBooking(id: string): Promise<any> {
    const result = await this.db.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  private async renderReminder(booking: any, reminder: ReminderJob): Promise<any> {
    // Load client info
    const client = await this.getClient(booking.client_id);
    return {
      to: client?.email ?? booking.client_timezone,
      subject: `Reminder: Appointment in ${reminder.offsetMinutes} min`,
      body: `Your appointment is at ${new Date(booking.created_at).toLocaleString(booking.client_timezone)}`,
      bookingId: booking.id,
      clientTimezone: booking.client_timezone,
    };
  }

  private async getClient(id: string): Promise<any> {
    const result = await this.db.query(
      `SELECT * FROM clients WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  private async sendWithProvider(data: any, idempotencyKey: string): Promise<{ providerMessageId: string }> {
    try {
      const result = await lastValueFrom(
        this.providerClient.send('reminder.send', { data, idempotencyKey })
      );
      return { providerMessageId: result.messageId };
    } catch (err: any) {
      if (err.code === 429 || err.code === 500 || err.code === 503) {
        throw new NetworkError(err.message || 'Provider error');
      }
      throw new ProviderError(err.message || 'Provider error');
    }
  }

  private async markSent(id: string, providerMessageId: string): Promise<void> {
    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'sent',
           sent_at = now(),
           provider_message_id = $2,
           updated_at = now()
       WHERE id = $1`,
      [id, providerMessageId]
    );
  }

  private async markFailed(id: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'failed',
           last_error = $2,
           updated_at = now()
       WHERE id = $1`,
      [id, error]
    );
  }

  private async markCancelled(id: string, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'cancelled',
           last_error = $2,
           updated_at = now()
       WHERE id = $1`,
      [id, reason]
    );
  }

  // ========== Type Conversion ==========

  private toReminderJob(row: any): ReminderJob {
    return {
      id: row.id,
      bookingId: row.booking_id,
      offsetMinutes: row.offset_minutes,
      fireAtUtc: row.fire_at_utc,
      status: row.status,
      attempts: row.attempts,
      lockedUntil: row.locked_until,
      sentAt: row.sent_at,
      providerMessageId: row.provider_message_id,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}