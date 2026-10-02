import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg'; // Pool class
const DB = { user:'chronos', host:'localhost', database:'chronos', password:'chronos', port:5433 };
describe('Phase 4 — Concurrent booking proof (DB authority, strict)', () => {
  let slotId: string;

  let pool: any;
  beforeAll(async () => {
    pool = new Pool(DB);
    // Create deterministic open slot in a transaction
    await pool.query('BEGIN');
    const r = await pool.query("INSERT INTO slots (id, provider_id, slot_start_utc, slot_end_utc, status, display_tz) SELECT gen_random_uuid(), (SELECT id FROM providers WHERE name='Dr. Chronos'), '2026-12-10 14:00:00+00', '2026-12-10 15:00:00+00', 'open', 'America/New_York' RETURNING id");
    slotId = r.rows[0].id;
    await pool.query('COMMIT');
  });

  afterAll(async () => {
    // Cleanup: delete bookkeeping rows for this slot only
    await pool.query("DELETE FROM bookmark_keys WHERE request_hash LIKE '%'+$1+'%'", [slotId]).catch(()=>{});
    await pool.query("DELETE FROM reminder_jobs WHERE booking_id IN (SELECT id FROM bookings WHERE slot_id=$1)", [slotId]).catch(()=>{});
    await pool.query("DELETE FROM bookings WHERE slot_id=$1", [slotId]).catch(()=>{});
    await pool.query("UPDATE slots SET status='open' WHERE id=$1", [slotId]).catch(()=>{});
    await pool.end();
  });

  it('exactly 1 booking succeeds and exactly 1 DB row exists (20 iterations to expose races)', async () => {
    for (let iter = 0; iter < 20; iter++) {
      // Ensure slot open at start of each iteration
      await pool.query("UPDATE slots SET status='open', slot_start_utc='2026-12-10 14:00:00+00', slot_end_utc='2026-12-10 15:00:00+00' WHERE id=$1", [slotId]);
      await pool.query("DELETE FROM bookings WHERE slot_id=$1", [slotId]);
      
      const clients = await Promise.all(Array.from({length:5}, () => pool.connect()));
      const promises = clients.map(async (c: any) => {
        try {
          await c.query('BEGIN');
          await c.query("UPDATE slots SET status='booked' WHERE id=$1 AND status='open' AND slot_start_utc > '2026-01-01' RETURNING id", [slotId]);
          await c.query("INSERT INTO bookings (slot_id, client_id, status) VALUES ($1, 'concurrent', 'booked') RETURNING id", [slotId]);
          await c.query('COMMIT');
          return { status: 201, bookingId: 'created' };
        } catch (e: any) {
          await c.query('ROLLBACK').catch(() => {});
          // 23505 = unique violation = already booked
          if (e.code === '23505' || e.code === '23P01') return { status: 409, error: 'slot_unavailable' };
          return { status: 400, error: e.message || 'bad_request' };
        }
      });
      const results = await Promise.all(promises);
      clients.forEach(c => c.release());
      
      const successes = results.filter((r: any) => r.status === 201);
      const conflicts = results.filter((r: any) => r.status === 409);
      
      // Verify DB state
      const dbCount = await pool.query("SELECT COUNT(*) FROM bookings WHERE slot_id=$1", [slotId]);
      const liveBookings = parseInt(dbCount.rows[0].count);
      
      // Strict assertions: exactly 1 success, exactly 1 live booking
      expect(successes.length).toBe(1);
      expect(liveBookings).toBe(1);
      expect(conflicts.length).toBe(4);
      
      // Roll back for next iteration: release slot, delete booking
      await pool.query("UPDATE slots SET status='open', slot_start_utc='2026-12-10 14:00:00+00', slot_end_utc='2026-12-10 15:00:00+00' WHERE id=$1", [slotId]);
      await pool.query("DELETE FROM bookings WHERE slot_id=$1", [slotId]);
    }
  });
});
