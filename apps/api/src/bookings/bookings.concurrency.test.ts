import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg'; // Pool class
const DB = { user:'chronos', host:'localhost', database:'chronos', password:'chronos', port:5433 };
describe('Phase 4 — Concurrent booking proof (DB authority, strict)', () => {
  let slotId: string;
  let clientId: string;

  let pool: any;
  beforeAll(async () => {
    pool = new Pool(DB);
    // Dynamically find an isolated future test timestamp that does not collide
    // with any existing (provider_id, slot_start_utc) slot for 'Dr. Chronos'.
    const providerRes = await pool.query("SELECT id FROM providers WHERE name='Dr. Chronos'");
    const providerId = providerRes.rows[0].id;
    (globalThis as any).__providerId = providerId;
    // Probe a future isolated window; stop when a slot_start_utc with no collision is found.
    const baseTime = new Date('2026-12-20T10:00:00Z'); // clearly isolated from production data
    let fixtureStart = new Date(baseTime);
    let found = false;
    while (!found) {
      const startStr = fixtureStart.toISOString().replace('T', ' ').replace('Z', '+00');
      const endStr = new Date(fixtureStart.getTime() + 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '+00');
      const collision = await pool.query(
        "SELECT 1 FROM slots WHERE provider_id = $1 AND slot_start_utc = $2 LIMIT 1",
        [providerId, startStr]
      );
      const overlap = await pool.query(
        "SELECT 1 FROM slots WHERE provider_id = $1 AND tstzrange(slot_start_utc, slot_end_utc, '[)') && tstzrange($2, $3, '[)') LIMIT 1",
        [providerId, startStr, endStr]
      );
      if (collision.rowCount === 0 && overlap.rowCount === 0) {
        found = true;
        break;
      }
      fixtureStart = new Date(fixtureStart.getTime() + 30 * 60 * 1000); // advance 30 min
    }
    const startStr = fixtureStart.toISOString().replace('T', ' ').replace('Z', '+00');
    const endStr = new Date(fixtureStart.getTime() + 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '+00');
    // Persist selected fixture strings for reuse across iterations and cleanup.
    (globalThis as any).__fixtureStartStr = startStr;
    (globalThis as any).__fixtureEndStr = endStr;
    await pool.query('BEGIN');
    const r = await pool.query(
      "INSERT INTO slots (id, provider_id, slot_start_utc, slot_end_utc, status, display_tz) SELECT gen_random_uuid(), $1, $2, $3, 'open', 'America/New_York' RETURNING id",
      [providerId, startStr, endStr]
    );
    slotId = r.rows[0].id;
    await pool.query('COMMIT');
    // Resolve a real UUID client to satisfy bookings.client_id (uuid, not text)
    const clientRes = await pool.query("SELECT id FROM clients WHERE email = 'client@example.com' LIMIT 1");
    if (!clientRes.rows[0]) throw new Error('Fixture client client@example.com not found — cannot run concurrency proof');
    clientId = clientRes.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup: delete bookkeeping rows for this slot only
    await pool.query("DELETE FROM bookmark_keys WHERE request_hash LIKE '%'+$1+'%'", [slotId]).catch(()=>{});
    await pool.query("DELETE FROM reminder_jobs WHERE booking_id IN (SELECT id FROM bookings WHERE slot_id=$1)", [slotId]).catch(()=>{});
    await pool.query("DELETE FROM bookings WHERE slot_id=$1", [slotId]).catch(()=>{});
    await pool.query("DELETE FROM slots WHERE id=$1", [slotId]).catch(()=>{});
    await pool.end();
  });

  it('exactly 1 booking succeeds and exactly 1 DB row exists (20 iterations to expose races)', async () => {
    for (let iter = 0; iter < 20; iter++) {
      // Ensure slot open at start of each iteration
      const fixtureStartStr = (globalThis as any).__fixtureStartStr || '2026-12-20 10:00:00+00';
      const fixtureEndStr = (globalThis as any).__fixtureEndStr || '2026-12-20 11:00:00+00';
      await pool.query("UPDATE slots SET status='open', slot_start_utc=$1, slot_end_utc=$2 WHERE id=$3", [fixtureStartStr, fixtureEndStr, slotId]);
      await pool.query("DELETE FROM bookings WHERE slot_id=$1", [slotId]);
      
      const clients = await Promise.all(Array.from({length:5}, () => pool.connect()));
      const promises = clients.map(async (c: any) => {
        try {
          await c.query('BEGIN');
          await c.query("UPDATE slots SET status='booked' WHERE id=$1 AND status='open' AND slot_start_utc > '2026-01-01' RETURNING id", [slotId]);
          await c.query("INSERT INTO bookings (slot_id, client_id, client_timezone, status, provider_id, version) VALUES ($1, $2, 'America/New_York', 'booked', $3, 1) RETURNING id", [slotId, clientId, (globalThis as any).__providerId || '00000000-0000-0000-0000-000000000000']);
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
      const fixtureStartStrLoop = (globalThis as any).__fixtureStartStr || '2026-12-20 10:00:00+00';
      const fixtureEndStrLoop = (globalThis as any).__fixtureEndStr || '2026-12-20 11:00:00+00';
      await pool.query("UPDATE slots SET status='open', slot_start_utc=$1, slot_end_utc=$2 WHERE id=$3", [fixtureStartStrLoop, fixtureEndStrLoop, slotId]);
      await pool.query("DELETE FROM bookings WHERE slot_id=$1", [slotId]);
    }
  });
});
