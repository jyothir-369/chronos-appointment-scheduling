/**
 * Phase 3 — Materializer (idempotent slot generation)
 * Uses @chronos/time generateSlots; DB is source of truth.
 */
import { generateSlots } from '@chronos/time';

export async function materializeProvider(db: any, providerId: string, fromDate: string, toDate: string, providerTz: string = 'UTC') {
  const slots = generateSlots({ tz: providerTz, slotMinutes: 30, fromDate, toDate, rules: { startTime: '09:00', endTime: '17:00' } });
  for (const s of slots) {
    await db.query(`INSERT INTO slots (provider_id, slot_start_utc, slot_end_utc, display_tz, status) VALUES ($1,$2,$3,$4,'open') ON CONFLICT DO NOTHING`,
      [providerId, s.startUtc, s.endUtc, providerTz]);
  }
}
