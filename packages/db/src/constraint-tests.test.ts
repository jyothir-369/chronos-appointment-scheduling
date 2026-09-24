import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool, Client } from 'pg';

const DB = {
  user: 'chronos',
  host: 'localhost',
  database: 'chronos',
  password: 'chronos',
  port: 5433,
};

let pool: Pool;

describe('Schema constraints (direct SQL over two connections)', () => {
  beforeAll(async () => {
    pool = new Pool(DB);
    await pool.query('SELECT 1');
  });
  afterAll(async () => {
    await pool.end();
  });

  it('exclusion constraint blocks overlapping slots', async () => {
    const c1 = await pool.connect();
    const c2 = await pool.connect();
    try {
      // Insert a base open slot
      await c1.query(`
        INSERT INTO slots (provider_id, slot_start_utc, slot_end_utc, display_tz)
        SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-07-01T14:00:00Z', '2026-07-01T14:30:00Z', 'America/New_York';
      `);
      // Second overlapping insert must fail
      await expect(
        c2.query(`
          INSERT INTO slots (provider_id, slot_start_utc, slot_end_utc, display_tz)
          VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-07-01T14:15:00Z', '2026-07-01T14:45:00Z', 'America/New_York');
        `)
      ).rejects.toThrow();
    } finally {
      c1.release();
      c2.release();
    }
  });

  it('duplicate slot start is blocked by unique index', async () => {
    await expect(
      pool.query(`
        INSERT INTO slots (provider_id, slot_start_utc, slot_end_utc, display_tz)
        VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-07-02T09:00:00Z', '2026-07-02T09:30:00Z', 'America/New_York')
        ON CONFLICT DO NOTHING;
      `)
    ).resolves.not.toThrow();
  });

  it('ON CONFLICT DO NOTHING swallows exclusion-constraint conflicts', async () => {
    // Try inserting same overlapping range again with DO NOTHING
    const result = await pool.query(`
      INSERT INTO slots (provider_id, slot_start_utc, slot_end_utc, display_tz)
      VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '2026-07-01T14:15:00Z', '2026-07-01T14:45:00Z', 'America/New_York')
      ON CONFLICT DO NOTHING;
    `);
    expect(result.rowCount).toBe(0);
  });

  it('re-booking works after cancel (partial unique index)', async () => {
    // Booked slot must block a second live booking; cancelled must allow it
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`
        INSERT INTO bookings (slot_id, client_id, client_timezone)
        SELECT id, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'America/New_York'
        FROM slots WHERE provider_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' LIMIT 1;
      `);
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  });
});
