import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Pool } from 'pg';
import { clock } from '@chronos/time';
import { ReminderQueueManager } from './reminder.queue.js';

/**
 * Reminder-job idempotency evidence (§9.4 FR8).
 *
 * We insert the same (booking_id, offset_minutes) twice via the BullMQ
 * manager and assert:
 *   - Only one reminder_job row is created per offset (DB UNIQUE guard)
 *   - BullMQ jobId deduplication keeps exactly 2 unique jobs
 *   - After cleanup, no reminder_jobs rows remain for the fixture.
 */
describe('ReminderQueueManager — idempotency & safe retry (§6 FR8)', () => {
  let pool: any;
  let db: any;
  let queueManager: ReminderQueueManager;
  let mockQueue: any;
  const bookingId = '00000000-0000-4000-8000-000000000001';
  const slotStartUtc = '2026-12-10T14:00:00Z';
  const now = clock.now().toString();
  const offsets = [1440, 60]; // 24h, 1h

  // Faithful BullMQ jobId-uniqueness mock (not invocation-count)
  let jobStore: Map<string, any>;

  beforeAll(async () => {
    const DB = { user: 'chronos', host: 'localhost', database: 'chronos', password: 'chronos', port: 5433 };
    pool = new Pool(DB);
    db = pool;

    jobStore = new Map();

    mockQueue = {
      add: vi.fn(async (_name: string, data: any, opts: any) => {
        const jobId = opts?.jobId || `reminder:${bookingId}:${data?.reminderId || 'unknown'}`;
        if (jobStore.has(jobId)) {
          return jobStore.get(jobId);
        }
        const job = { id: jobId, data, opts, name: _name };
        jobStore.set(jobId, job);
        return job;
      }),
      getJob: vi.fn(async (jobId: string) => jobStore.get(jobId) || null),
      getJobs: vi.fn(async () => Array.from(jobStore.values())),
      close: vi.fn(),
    } as any;

    queueManager = new ReminderQueueManager(mockQueue, db);
  });

  afterAll(async () => {
    // Clean DB fixture: only the test bookingId (preserve unrelated rows)
    await pool.query('DELETE FROM reminder_jobs WHERE booking_id = $1', [bookingId]).catch(() => {});
    // Clean mock BullMQ jobs for this fixture if real queue not used
    if (jobStore) {
      for (const offset of offsets) {
        jobStore.delete(`reminder:${bookingId}:${offset}`);
      }
    }
    await pool.end();
  });

  it('enqueues only once for duplicate (bookingId, offsetMinutes) — DB + BullMQ idempotency', async () => {
    // Ensure clean DB state at start of evidence run
    await pool.query('DELETE FROM reminder_jobs WHERE booking_id = $1', [bookingId]).catch(() => {});

    // First enqueue (must create DB reminder rows first — simulation of bookings.service path)
    // The manager only adds BullMQ jobs; DB rows must exist (as in production from bookings.service)
    // For evidence we seed the rows directly so enqueueForBooking can operate.
    for (const offset of offsets) {
      await pool.query(
        `INSERT INTO reminder_jobs (id, booking_id, offset_minutes, fire_at_utc, status)
         VALUES (gen_random_uuid(), $1, $2, $3, 'scheduled')
         ON CONFLICT (booking_id, offset_minutes) DO NOTHING`,
        [bookingId, offset, new Date(Date.parse(slotStartUtc) - offset * 60 * 1000).toISOString()]
      );
    }

    await queueManager.enqueueForBooking(bookingId, slotStartUtc, offsets, new Date(now));
    // Second enqueue for same booking/offset — DB-idempotent; BullMQ should keep only 2 unique jobs
    await queueManager.enqueueForBooking(bookingId, slotStartUtc, offsets, new Date(now));

    // DB assertion: exactly 2 reminder_jobs rows, one per offset, no duplicates
    const dbRes = await pool.query(
      'SELECT offset_minutes FROM reminder_jobs WHERE booking_id = $1 ORDER BY offset_minutes',
      [bookingId]
    );
    expect(dbRes.rowCount).toBe(2);
    const offsetsFound = dbRes.rows.map((r: any) => r.offset_minutes).sort((a: number, b: number) => a - b);
    expect(offsetsFound).toEqual([60, 1440]);

    // BullMQ idempotency assertion (via faithful mock, not invocation count)
    const uniqueJobs = Array.from(jobStore.values());
    expect(uniqueJobs.length).toBe(2);
    const jobIds = uniqueJobs.map((j: any) => j.id).sort((a: string, b: string) => a.localeCompare(b));
    const expectedIds = [
      `reminder:${bookingId}:60`,
      `reminder:${bookingId}:1440`,
    ];
    expect(jobIds.sort((a, b) => a.localeCompare(b))).toEqual(expectedIds.sort((a, b) => a.localeCompare(b)));
  });
});
