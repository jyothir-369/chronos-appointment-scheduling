/**
 * Shared contracts for Chronos: Zod schemas + error codes + type definitions
 * Syncs with the data model in packages/db/migrations and business logic in apps/api
 */

import { z } from 'zod';

// ========== Error Codes ==========

export const ErrorCodes = {
  // Booking errors
  SLOT_UNAVAILABLE: 'slot_unavailable',
  IDEMPOTENCY_KEY_REUSE: 'idempotency_key_reuse',
  VERSION_MISMATCH: 'version_mismatch',
  WINDOW_EXPIRED: 'window_expired',
  INVALID_TRANSITION: 'invalid_transition',
  NOT_OWNER: 'not_owner',

  // Validation errors
  INVALID_TIMEZONE: 'invalid_timezone',
  INVALID_DATE_TIME: 'invalid_date_time',
  INVALID_RULES: 'invalid_rules',
  INVALID_SLOT: 'invalid_slot',

  // System errors
  CONFLICT: 'conflict',
  NOT_FOUND: 'not_found',
  FORBIDDEN: 'forbidden',
  BAD_REQUEST: 'bad_request',
  UNPROCESSABLE_ENTITY: 'unprocessable_entity',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ========== Common Types ==========

export type UUID = string;
export type Timezone = string;
export type ISO8601UTC = string;
export type TimeRange = [ISO8601UTC, ISO8601UTC];

// Booking status enum (must match DB constraint)
export const BookingStatus = {
  BOOKED: 'booked',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

// Slot status enum
export const SlotStatus = {
  OPEN: 'open',
  BOOKED: 'booked',
  BLOCKED: 'blocked',
} as const;

export type SlotStatus = typeof SlotStatus[keyof typeof SlotStatus];

// Reminder job status enum
export const ReminderJobStatus = {
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped',
  FAILED: 'failed',
} as const;

export type ReminderJobStatus = typeof ReminderJobStatus[keyof typeof ReminderJobStatus];

// ========== Validation Schemas ==========

// Timezone validation (IANA)
export const timezoneSchema = z.string().refine(
  (id) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: id });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid IANA timezone' }
);

// ISO UTC validation
export const isoUTCStringSchema = z.string().refine(
  (s) => {
    try {
      new Date(s);
      return s.endsWith('Z') || s.includes('+00:00') || s.includes('-00:00');
    } catch {
      return false;
    }
  },
  { message: 'Must be valid ISO 8601 UTC' }
);

// UUID validation
export const uuidSchema = z.string().uuid();

// Provider schema (partial from DB)
export const providerSchema = z.object({
  id: uuidSchema,
  name: z.string().min(1),
  timezone: timezoneSchema,
  slotMinutes: z.number().int().min(5).max(240),
  cancellationWindowHours: z.number().int().min(0),
  reminderOffsetsMinutes: z.array(z.number().int()).min(1),
});

// Client schema (partial from DB)
export const clientSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  name: z.string().min(1),
});

// Booking schema (partial, excludes system fields)
export const bookingSchema = z.object({
  id: uuidSchema,
  slotId: uuidSchema,
  clientId: uuidSchema,
  clientTimezone: timezoneSchema,
  status: z.nativeEnum(BookingStatus),
  version: z.number().int().positive(),
  createdAt: isoUTCStringSchema,
  cancelledAt: isoUTCStringSchema.nullable(),
});

// Slot schema (partial)
export const slotSchema = z.object({
  id: uuidSchema,
  providerId: uuidSchema,
  slotStartUtc: isoUTCStringSchema,
  slotEndUtc: isoUTCStringSchema,
  displayTz: timezoneSchema,
  status: z.nativeEnum(SlotStatus),
});

// Reminder job schema (partial)
export const reminderJobSchema = z.object({
  id: uuidSchema,
  bookingId: uuidSchema,
  offsetMinutes: z.number().int(),
  fireAtUtc: isoUTCStringSchema,
  status: z.nativeEnum(ReminderJobStatus),
  attempts: z.number().int().min(0),
  lockedUntil: isoUTCStringSchema.nullable(),
  sentAt: isoUTCStringSchema.nullable(),
  providerMessageId: z.string().optional(),
  lastError: z.string().optional(),
});

// Availability rule schema (partial)
export const availabilityRuleSchema = z.object({
  id: uuidSchema,
  providerId: uuidSchema,
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

// ========== API Request Schemas ==========

// Booking request
export const bookingRequestSchema = z.object({
  slotId: uuidSchema,
  clientId: uuidSchema,
  clientTimezone: timezoneSchema,
  idempotencyKey: z.string().min(1).max(255).optional(),
});

// Cancel request
export const cancelRequestSchema = z.object({
  bookingId: uuidSchema,
  version: z.number().int().positive(),
  ifMatch: z.number().int().positive(), // alias for version
  nowUtc: isoUTCStringSchema,
  cancellationWindowHours: z.number().int().min(0),
  slotStartUtc: isoUTCStringSchema,
});

// Provider update
export const providerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  timezone: timezoneSchema.optional(),
  slotMinutes: z.number().int().min(5).max(240).optional(),
  cancellationWindowHours: z.number().int().min(0).optional(),
  reminderOffsetsMinutes: z.array(z.number().int()).min(1).optional(),
});

// Client update
export const clientUpdateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
});

// Availability rule creation
export const availabilityRuleCreateSchema = z.object({
  providerId: uuidSchema,
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  check() {
    if (this.startTime >= this.endTime) {
      throw new Error('endTime must be after startTime');
    }
    return this;
  },
});

// ========== Result Types ==========

export interface ApiResponse<T> {
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: ISO8601UTC;
    requestId?: string;
  };
}

export interface ValidationError {
  field: string;
  code: ErrorCode;
  message: string;
}

// ========== Constants ==========

export const DEFAULT_SLOT_MINUTES = 30;
export const DEFAULT_CANCELLATION_WINDOW_HOURS = 24;
export const DEFAULT_REMINDER_OFFSETS = [1440, 60]; // 24h, 1h
export const MAX_CANCELLATION_WINDOW_HOURS = 168; // 7 days
export const MAX_SLOT_MINUTES = 240; // 4 hours
export const DEFAULT_PROVIDER_RULES = {
  startTime: '09:00',
  endTime: '17:00',
  daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
} as const;

// ========== Helper Functions ==========

export function validateUuid(id: string): void {
  if (!uuidSchema.safeParse(id).success) {
    throw new Error(`Invalid UUID: ${id}`);
  }
}

export function validateTimezone(tz: string): void {
  if (!timezoneSchema.safeParse(tz).success) {
}
  throw new Error('Invalid timezone: ' + id);
}
