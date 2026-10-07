/**
 * Phase 6 — Reminder Worker
 * Idempotent, claims via DB, sends with provider idempotency key,
 * handles transient vs permanent errors, implements backoff.
 *
 * BullMQ job payload = { reminderId } only — never trusts payload for content.
 */
import { clock } from '@chronos/time';
const T = (globalThis as any).Temporal;

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import pg from 'pg';
import { REMINDER_DB } from './reminder.db.js';
import { EmailGateway, EmailError } from '../email/email.gateway.js';
import { renderReminderEmail } from '../email/email.templates.js';
import { signToken } from '../email/unsubscribe.token.js';

import { ReminderJobStatus, ReminderJob } from './reminder.types.js';
import { ReminderError, NetworkError, ProviderError } from './reminder.types.js';

const RETRY_BACKOFF = {
  type: 'exponential',
  delay: 60000, // 1 min base
} as const;

const MAX_ATTEMPTS = 5;
const RETRY_WINDOW_MS = 24 * 60 * 60 * 1000 - 1; // Just under provider 24h retention
const LOCK_DURATION_MS = 2 * 60 * 1000; // 2 min lock

@Processor("reminders")
@Injectable()
export class ReminderWorker extends WorkerHost {
  private readonly logger = new Logger(ReminderWorker.name);

  constructor(
    @Inject(REMINDER_DB) private readonly db: ReturnType<typeof pg.Pool>,
    private readonly emailGateway: EmailGateway
  ) {
    super();
  }

  /**
   * Claim the next due reminder job.
   * Atomically moves it to 'sending' state with lock.
   */
  async claimDue(): Promise<ReminderJob | null> {
    const now = clock.now().toString();
    const lockUntil = new Date(Date.now() + LOCK_DURATION_MS).toISOString();

    const result = await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'sending',
           attempts = attempts + 1,
           locked_until = $1
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
  async process(job: Job): Promise<void> {
    const reminderId = (job?.data as any)?.reminderId;
    if (!reminderId) throw new Error('Missing reminderId in BullMQ payload');
    // Atomic claim for exactly this reminder from scheduled → sending
    const claimRes = await this.db.query(
      `UPDATE reminder_jobs SET status = 'sending', attempts = attempts + 1, locked_until = $1
       WHERE id = $2 AND status = 'scheduled' RETURNING *`,
      [new Date(Date.now() + LOCK_DURATION_MS).toISOString(), reminderId]
    );
    if (claimRes.rowCount === 0) {
      // Already claimed/processed or not scheduled — skip duplicate
      const check = await this.getReminder(reminderId);
      if (check && check.status === 'sending') {
        // Already sending — verify not past retry window, then proceed
        await this.processReminder(reminderId);
      } else {
        this.logger.warn(`Reminder ${reminderId} not in scheduled state (status=${check?.status}) — skipping`);
        return;
      }
    } else {
      await this.processReminder(reminderId);
    }
  }

  async handleJob(job?: Job): Promise<void> {
    const reminderId = (job?.data as any)?.reminderId || job?.data?.reminderId;
    if (!reminderId) throw new Error('Missing reminderId in BullMQ payload');
    await this.processReminder(reminderId);
  }

  async processReminder(reminderId: string): Promise<void> {
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
    const now = new Date().getTime();
    if (now - fireTime > RETRY_WINDOW_MS) {
      await this.markFailed(reminder.id, 'Retry window exceeded');
      throw new ReminderError(`Reminder ${reminderId} exceeded retry window`, 'VALIDATION', 409);
    }

    const client = await this.getClient(booking.client_id);
    if (!client?.email) {
      this.logger.warn(`Client ${booking.client_id} has no email for booking ${booking.id}`);
      throw new Error(`Client email not available for booking ${booking.id}`);
    }

    // Check unsubscribe preference before sending
    if (client?.reminders_opt_out) {
      this.logger.log(`Reminder ${reminder.id} suppressed: client ${client.id} opted out`);
      await this.markSuppressed(reminder.id, 'Client opted out of reminder emails');
      return;
    }

    // Send with provider idempotency key
    const idempotencyKey = `reminder/${booking.id}/${reminder.offsetMinutes}`;

    try {
      const result = await this.sendWithProvider(booking, reminder, idempotencyKey);
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

  private async getClient(id: string): Promise<any> {
    const result = await this.db.query(
      `SELECT * FROM clients WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  private async sendWithProvider(
    booking: any,
    reminder: ReminderJob,
    idempotencyKey: string
  ): Promise<{ providerMessageId: string }> {
    try {
      const rendered = await this.renderReminderEmail(booking, reminder);
      const result = await this.emailGateway.send(rendered, idempotencyKey);
      return { providerMessageId: result.providerMessageId };
    } catch (err: any) {
      if (err instanceof EmailError) {
        if (err.code === 'transient') {
          throw new NetworkError(err.message);
        }
        throw new ProviderError(err.message, err.providerMessageId);
      }
      throw err;
    }
  }

  private async renderReminderEmail(booking: any, reminder: ReminderJob): Promise<any> {
    const client = await this.getClient(booking.client_id);
    if (!client?.email) {
      this.logger.warn(`Client ${booking.client_id} has no email for booking ${booking.id}`);
      throw new Error(`Client email not available for booking ${booking.id}`);
    }

    const provider = await this.getProvider(booking.providerId);

    const unsubscribeUrl = `${process.env.CHRONOS_PUBLIC_URL || 'http://localhost:3001'}/unsubscribe/reminders?token=${signToken(client.id)}`;

    const rendered = renderReminderEmail({
      to: client.email,
      clientName: client.name || client.email,
      providerName: provider?.name || 'Service Provider',
      appointmentDate: booking.slot_start_utc,
      appointmentTime: new Date(booking.slot_start_utc).toLocaleString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: booking.client_timezone,
      }),
      clientTimezone: booking.client_timezone,
      offsetMinutes: reminder.offsetMinutes,
      bookingId: booking.id,
      unsubscribeUrl: unsubscribeUrl,
    });

    return {
      to: client.email,
      subject: `Reminder: Appointment with ${provider?.name || 'Service Provider'} in ${reminder.offsetMinutes} min`,
      html: rendered.html,
      text: rendered.text, // never undefined from template
      bookingId: booking.id,
      clientId: client.id,
      clientTimezone: booking.client_timezone,
    };
  }

  private async getProvider(providerId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT * FROM providers WHERE id = $1`,
      [providerId]
    );
    return result.rows[0] ?? null;
  }

  private async markSent(id: string, providerMessageId: string): Promise<void> {
    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'sent',
           sent_at = now(),
           provider_message_id = $2
       WHERE id = $1`,
      [id, providerMessageId]
    );
  }

  private async markSuppressed(id: string, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'suppressed',
           last_error = $2
       WHERE id = $1`,
      [id, reason]
    );
  }

  private async markFailed(id: string, error: string): Promise<void> {
    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'failed',
           last_error = $2
       WHERE id = $1`,
      [id, error]
    );
  }

  private async markCancelled(id: string, reason: string): Promise<void> {
    await this.db.query(
      `UPDATE reminder_jobs
       SET status = 'cancelled',
           last_error = $2
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
      updatedAt: (row.updated_at || null) as string,
    };
  }
}