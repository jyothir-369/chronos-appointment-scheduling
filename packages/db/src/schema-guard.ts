/* Phase 2 Schema Guard — asserts exclusion constraints + partial indexes exist */
export async function schemaGuard(client: any): Promise<boolean> {
  const res = await client.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'slots'::regclass AND contype = 'x'
  `);
  const hasOverlap = res.rows.some((r: any) => r.conname === 'slots_no_overlap');

  const idx = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'slots' AND indexname = 'slots_open_idx'
  `);
  const hasOpenIdx = idx.rowCount > 0;

  const partial = await client.query(`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'bookings' AND indexname = 'bookings_one_live_per_slot'
  `);
  const hasPartial = partial.rowCount > 0;

  return hasOverlap && hasOpenIdx && hasPartial;
}
