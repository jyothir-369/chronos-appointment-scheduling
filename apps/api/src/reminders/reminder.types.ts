import { z } from 'nestjs-zod/z';
import { createZodDto } from 'nestjs-zod';

// Import shared contracts
import { ErrorCodes, ErrorCode, type UUID, type Timezone, type ISO8601UTC, type BookingStatus, type ReminderJobStatus } from '@chronos/contracts';

// ========== Reminder Job Types ==========

export const ReminderJobStatusSchema = z.nativeEnum({
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  FAILED: 'failed',
});

export type ReminderJobStatus = z.infer<typeof ReminderJobStatusSchema>;

// ========== Reminder Job Database Model ==========

export interface ReminderJob {
  id: UUID;
  bookingId: UUID;
  offsetMinutes: number;
  fireAtUtc: ISO8601UTC;
  status: ReminderJobStatus;
  attempts: number;
  lockedUntil?: ISO8601UTC | null;
  sentAt?: ISO8601UTC | null;
  providerMessageId?: string | null;
  lastError?: string | null;
  createdAt: ISO8601UTC;
  updatedAt: ISO8601UTC;
}

// ========== Reminder Job Creation ==========

export const createReminderJobSchema = z.object({
  bookingId: z.string().uuid(),
  offsetMinutes: z.number().int(),
  fireAtUtc: z.string().datetime(),
});

export type CreateReminderJobDto = z.infer<typeof createReminderJobSchema>;

// ========== Worker Claim ==========

export interface WorkerClaim {
  id: UUID;
  bookingId: UUID;
  offsetMinutes: number;
  fireAtUtc: ISO8601UTC;
  status: 'scheduled' | 'sending';
  attempts: number;
  lockedUntil: ISO8601UTC;
}

// ========== Reminder Operation Results ==========

export interface ClaimResult {
  success: boolean;
  reminder?: ReminderJob;
  error?: string;
}

export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: {
    code: 'transient' | 'permanent';
    message: string;
  };
}

export interface CompleteResult {
  success: boolean;
  reminder?: ReminderJob;
  error?: string;
}

// ========== BullMQ Job Types ==========

export interface BullMQJob {
  id?: string;
  data: {
    reminderId: UUID;
  };
  opts: {
    delay?: number;
    attempts?: number;
    backoff?: {
      type: 'exponential';
      delay: number;
    } | {
      type: 'fixed';
      delay: number;
    };
    removeOnComplete?: number;
    removeOnFail?: number;
    jobId?: string;
  };
}

// ========== Error Types ==========

export class ReminderError extends Error {
  constructor(
    message: string,
    public code: 'TRANSIENT' | 'PERMANENT' | 'VALIDATION' | 'NOT_FOUND',
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ReminderError';
  }
}

export class DuplicateReminderError extends ReminderError {
  constructor(reminderId: UUID) {
    super(`Reminder ${reminderId} already exists or was sent`, 'VALIDATION', 409);
    this.name = 'DuplicateReminderError';
  }
}

export class ReminderNotFoundError extends ReminderError {
  constructor(reminderId: UUID) {
    super(`Reminder ${reminderId} not found`, 'NOT_FOUND', 404);
    this.name = 'ReminderNotFoundError';
  }
}

export class ProviderError extends ReminderError {
  constructor(
    message: string,
    public providerMessageId?: string
  ) {
    super(message, 'PERMANENT', 400);
    this.name = 'ProviderError';
  }
}

export class NetworkError extends ReminderError {
  constructor(message: string) {
    super(message, 'TRANSIENT', 503);
    this.name = 'NetworkError';
  }
}