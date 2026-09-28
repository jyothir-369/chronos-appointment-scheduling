import { describe, it, expect } from 'vitest';
import { Pool } from 'pg';

const DB = {
  user: 'chronos',
  host: 'localhost',
  database: 'chronos',
  password: 'chronos',
  port: 5433,
};

describe('Phase 4 — Concurrent booking proof', () => {
  it(
    'exactly one booking succeeds for concurrent requests on same open slot',
    async () => {
      const pool = new Pool(DB);

      try {
        const open = await pool.query(`
          SELECT id
          FROM slots
          WHERE status = 'open'
            AND slot_start_utc > now()
          ORDER BY slot_start_utc
          LIMIT 1
        `);

        expect(open.rowCount).toBe(1);

        const slotId = open.rows[0].id;

        await pool.query('DELETE FROM bookings WHERE slot_id = $1', [slotId]);
        await pool.query(
          `UPDATE slots SET status = 'open' WHERE id = $1`,
          [slotId],
        );

        const clients = await Promise.all(
          Array.from({ length: 5 }, () => pool.connect()),
        );

        try {
          const results = await Promise.all(
            clients.map(async (client) => {
              try {
                await client.query('BEGIN');

                const locked = await client.query(
                  `SELECT id
                   FROM slots
                   WHERE id = $1
                     AND status = 'open'
                     AND slot_start_utc > now()
                   FOR UPDATE`,
                  [slotId],
                );

                if (locked.rowCount !== 1) {
                  await client.query('ROLLBACK');
                  return 'conflict';
                }

                const updated = await client.query(
                  `UPDATE slots
                   SET status = 'booked'
                   WHERE id = $1
                     AND status = 'open'
                     AND slot_start_utc > now()
                   RETURNING id`,
                  [slotId],
                );

                if (updated.rowCount !== 1) {
                  await client.query('ROLLBACK');
                  return 'conflict';
                }

                await client.query('COMMIT');
                return 'success';
              } catch (error) {
                await client.query('ROLLBACK').catch(() => {});
                throw error;
              }
            }),
          );

          const successes = results.filter(
            (result) => result === 'success',
          );

          const conflicts = results.filter(
            (result) => result === 'conflict',
          );

          expect(successes.length).toBe(1);
          expect(conflicts.length).toBe(4);

          const invariant = await pool.query(
            `SELECT slot_id, COUNT(*)
             FROM bookings
             WHERE status <> 'cancelled'
               AND slot_id = $1
             GROUP BY slot_id
             HAVING COUNT(*) > 1`,
            [slotId],
          );

          expect(invariant.rowCount).toBe(0);
        } finally {
          for (const client of clients) {
            client.release();
          }
        }
      } finally {
        await pool.end();
      }
    },
    30000,
  );
});
