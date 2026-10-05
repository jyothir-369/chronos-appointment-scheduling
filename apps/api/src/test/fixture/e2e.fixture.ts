/**
 * E2E Fixture — isolated, explicitly invoked, never auto-executed.
 * Usage: node dist/test/fixture/e2e.fixture.js (after build) or tsx src/test/fixture/e2e.fixture.ts
 * Creates only test records; records IDs; provides explicit cleanup.
 * Does NOT alter production startup; does NOT seed on build/dev.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export interface FixtureIds {
  providerId: string;
  eventTypeId: string;
  clientId: string;
  slotId: string;
  bookingId?: string;
  slotId2?: string;
}

export const FIXTURE_TAG = 'e2e-fixture';

export async function buildFixture(): Promise<FixtureIds> {
  // Use deterministic test identifiers to avoid collisions with real data
  const provider = await prisma.provider.create({
    data: {
      name: `E2E Provider (${FIXTURE_TAG})`,
      timezone: 'America/New_York',
      slug: `e2e-provider-${Date.now()}`,
      cancellationWindowHours: 24,
    },
  });

  const eventType = await prisma.eventType.create({
    data: {
      providerId: provider.id,
      title: `E2E Event (${FIXTURE_TAG})`,
      durationMinutes: 30,
      price: 100.0,
      location: 'video',
      slug: `e2e-event-${Date.now()}`,
      description: 'Fixture event type',
      active: true,
    },
  });

  const client = await prisma.client.create({
    data: {
      email: `e2e-client-${Date.now()}@fixture.test`,
      name: `E2E Client (${FIXTURE_TAG})`,
    },
  });

  const now = new Date();
  const startUtc = new Date(now.getTime() + 3600000); // 1 hour ahead
  const endUtc = new Date(startUtc.getTime() + 30 * 60000);

  // NOTE: DB column `display_tz` is legacy/additive NOT NULL (not mapped in Prisma Slot).
  // Fixture creates slots via raw SQL to satisfy DB constraint without altering Prisma schema.
  // Prisma $executeRaw with RETURNING returns row count (number), not rows array.
  // Query separately to retrieve the inserted id.
  await prisma.$executeRaw`
    INSERT INTO slots (id, provider_id, slot_start_utc, slot_end_utc, status, display_tz)
    VALUES (gen_random_uuid(), ${provider.id}::uuid, ${startUtc}::timestamptz, ${endUtc}::timestamptz, 'open', 'America/New_York')
  `;
  const slotIdRow = await prisma.$queryRaw`SELECT id FROM slots WHERE provider_id = ${provider.id}::uuid ORDER BY created_at DESC LIMIT 1`;
  const slotId = (slotIdRow as any)[0]?.id;

  // Second slot for reschedule/conflict scenarios
  const startUtc2 = new Date(startUtc.getTime() + 2 * 3600000);
  const endUtc2 = new Date(startUtc2.getTime() + 30 * 60000);
  await prisma.$executeRaw`
    INSERT INTO slots (id, provider_id, slot_start_utc, slot_end_utc, status, display_tz)
    VALUES (gen_random_uuid(), ${provider.id}::uuid, ${startUtc2}::timestamptz, ${endUtc2}::timestamptz, 'open', 'America/New_York')
  `;
  const slotId2Row = await prisma.$queryRaw`SELECT id FROM slots WHERE provider_id = ${provider.id}::uuid AND slot_start_utc = ${startUtc2}::timestamptz LIMIT 1`;
  const slotId2 = (slotId2Row as any)[0]?.id;

  return {
    providerId: provider.id,
    eventTypeId: eventType.id,
    clientId: client.id,
    slotId: slotId,
    slotId2: slotId2,
  };
}

export async function cleanupFixture(ids: FixtureIds): Promise<void> {
  // Dependency-safe order: bookings -> reminder_jobs -> slots -> clients/providers/eventTypes
  // Only delete IDs created by this fixture (never broad TRUNCATE/DELETE)
  try {
    await prisma.booking.deleteMany({ where: { id: ids.bookingId || '' } });
  } catch { /* may not exist */ }
  try {
    await prisma.reminderJob.deleteMany({ where: { bookingId: ids.bookingId || '' } });
  } catch { /* may not exist */ }
  try {
    await prisma.slot.deleteMany({ where: { id: { in: [ids.slotId, ids.slotId2 || ''].filter(Boolean) } } });
  } catch { /* may not exist */ }
  try {
    await prisma.eventType.delete({ where: { id: ids.eventTypeId } });
  } catch { /* may not exist */ }
  try {
    await prisma.provider.delete({ where: { id: ids.providerId } });
  } catch { /* may not exist */ }
  try {
    await prisma.client.delete({ where: { id: ids.clientId } });
  } catch { /* may not exist */ }
}

export async function recordBeforeCounts() {
  const bookings = await prisma.booking.count();
  const clients = await prisma.client.count();
  const providers = await prisma.provider.count();
  return { bookings, clients, providers };
}
