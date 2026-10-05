import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function seed() {
  console.log('=== FULL SEED ===');
  const p1 = await prisma.provider.upsert({ where: { slug: 'michael-vance' }, update: {}, create: { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Dr. Michael Vance', timezone: 'America/New_York', slug: 'michael-vance', cancellationWindowHours: 24 } });
  const p2 = await prisma.provider.upsert({ where: { slug: 'elena-rossi' }, update: {}, create: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', name: 'Dr. Elena Rossi', timezone: 'Europe/Rome', slug: 'elena-rossi', cancellationWindowHours: 12 } });
  const c1 = await prisma.client.upsert({ where: { email: 'alice.martinez@example.com' }, update: {}, create: { id: 'c1d2e3f4-a5b6-7890-cdef-123456789012', name: 'Alice Martinez', email: 'alice.martinez@example.com', company: 'Acme', phone: '+1-555-0101' } });
  const c2 = await prisma.client.upsert({ where: { email: 'bob.jenkins@example.com' }, update: {}, create: { id: 'c2d3e4f5-b6a7-8901-def2-234567890123', name: 'Bob Jenkins', email: 'bob.jenkins@example.com', company: 'Globex', phone: '+1-555-0102' } });
  const c3 = await prisma.client.upsert({ where: { email: 'carla.nguyen@example.com' }, update: {}, create: { id: 'c3d4e5f6-c7a8-9012-ef33-345678901234', name: 'Carla Nguyen', email: 'carla.nguyen@example.com', company: 'Initech', phone: '+1-555-0103' } });
  const c4 = await prisma.client.upsert({ where: { email: 'david.patel@example.com' }, update: {}, create: { id: 'c4d5e6f7-d8a9-0123-f044-456789012345', name: 'David Patel', email: 'david.patel@example.com', company: 'Umbrella', phone: '+1-555-0104' } });
  const et1 = await prisma.eventType.upsert({ where: { slug: 'consult-30' }, update: {}, create: { id: 'e1f2a3b4-c5d6-7890-ab12-567890123456', providerId: p1.id, title: '30-min Consultation', durationMinutes: 30, price: 75, slug: 'consult-30', active: true } });
  const et2 = await prisma.eventType.upsert({ where: { slug: 'therapy-60' }, update: {}, create: { id: 'e2f3b4c5-d6e7-8901-bc23-678901234567', providerId: p2.id, title: '60-min Therapy', durationMinutes: 60, price: 150, slug: 'therapy-60', active: true } });
  // Insert seed bookings with reliable IDs to avoid unique conflicts on slot
  try {
    await prisma.booking.create({ data: { id: 'b1d2e3f4-a5b6-7890-cdef-123456789012', slotId: 'slot-seed-booked', providerId: p1.id, clientId: c1.id, eventTypeId: et1.id, status: 'booked', notes: 'Seed', clientNotes: '' } });
  } catch (e: any) { console.log('Booking b-seed-001 already exists or slot missing', e.code || e.message); }
  try {
    await prisma.booking.create({ data: { id: 'b2d3e4f5-b6a7-8901-def2-234567890123', slotId: 'slot-seed-hist', providerId: p1.id, clientId: c2.id, eventTypeId: et2.id, status: 'completed', notes: 'Completed', clientNotes: '' } });
  } catch (e: any) { console.log('Booking b-seed-002 already exists', e.code || e.message); }
  try {
    await prisma.booking.create({ data: { id: 'b3d4e5f6-c7a8-9012-ef33-345678901234', slotId: 'slot-seed-cancel', providerId: p2.id, clientId: c3.id, eventTypeId: et2.id, status: 'cancelled', notes: 'Cancelled', clientNotes: '' } });
  } catch (e: any) { console.log('Booking b-seed-003 already exists', e.code || e.message); }
  // Reminders
  try { await prisma.reminderJob.create({ data: { id: 'r1d2e3f4-a5b6-7890-cdef-123456789012', bookingId: 'b-seed-001', offsetMinutes: 1440, fireAtUtc: new Date('2026-10-11T14:00:00Z'), status: 'scheduled' } }); } catch (e: any) { console.log('rem-seed-001 exists'); }
  try { await prisma.reminderJob.create({ data: { id: 'r2d3e4f5-b6a7-8901-def2-234567890123', bookingId: 'b-seed-001', offsetMinutes: 60, fireAtUtc: new Date('2026-10-12T13:00:00Z'), status: 'scheduled' } }); } catch (e: any) { console.log('rem-seed-002 exists'); }
  // Activity
  try { await prisma.activity.create({ data: { id: 'a1d2e3f4-a5b6-7890-cdef-123456789012', action: 'booking.created', bookingId: 'b-seed-001', providerId: p1.id, clientId: c1.id, metadata: '{}' } }); } catch (e: any) { console.log('act-001 exists'); }
  try { await prisma.activity.create({ data: { id: 'a2d3e4f5-b6a7-8901-def2-234567890123', action: 'booking.completed', bookingId: 'b-seed-002', providerId: p1.id, clientId: c2.id, metadata: '{}' } }); } catch (e: any) { console.log('act-002 exists'); }
  try { await prisma.activity.create({ data: { id: 'a3d4e5f6-c7a8-9012-ef33-345678901234', action: 'reminder.scheduled', bookingId: 'b-seed-001', providerId: p1.id, clientId: c1.id, metadata: '{}' } }); } catch (e: any) { console.log('act-003 exists'); }
  // Notifications
  try { await prisma.notification.create({ data: { id: 'n1d2e3f4-a5b6-7890-cdef-123456789012', type: 'reminder', providerId: p1.id, clientId: c1.id, bookingId: 'b-seed-001', title: 'Reminder', message: 'Tomorrow', read: false } }); } catch (e: any) { console.log('not-001 exists'); }
  try { await prisma.notification.create({ data: { id: 'n2d3e4f5-b6a7-8901-def2-234567890123', type: 'booking_confirmed', providerId: p1.id, clientId: c1.id, bookingId: 'b-seed-001', title: 'Confirmed', message: 'Booked', read: true } }); } catch (e: any) { console.log('not-002 exists'); }
  try { await prisma.notification.create({ data: { id: 'n3d4e5f6-c7a8-9012-ef33-345678901234', type: 'cancellation', providerId: p2.id, clientId: c3.id, bookingId: 'b-seed-003', title: 'Cancelled', message: 'Cancelled', read: false } }); } catch (e: any) { console.log('not-003 exists'); }
  // Idempotency
  try { await prisma.idempotencyKey.create({ data: { id: 'i1d2e3f4-a5b6-7890-cdef-123456789012', clientId: c1.id, key: 'seed-key-001', requestHash: '{}', responseStatus: 201, responseBody: '{"bookingId":"b-seed-001"}' } }); } catch (e: any) { console.log('ik-001 exists'); }
  // Slots (create if not exists)
  const slotIds = ['slot-seed-booked','slot-seed-hist','slot-seed-cancel'];
  const starts = ['2026-10-12T14:00:00Z','2026-09-01T09:00:00Z','2026-09-05T11:00:00Z'];
  const providers = [p1.id, p1.id, p2.id];
  for (let i=0;i<slotIds.length;i++) {
    try { await prisma.slot.create({ data: { id: slotIds[i], providerId: providers[i], slotStartUtc: new Date(starts[i]), slotEndUtc: new Date(new Date(starts[i]).getTime()+3600000), status: i===0?'booked':'open' } }); } catch (e: any) { console.log('slot', slotIds[i], 'exists'); }
  }
  console.log('=== FULL SEED DONE ===');
}
seed().catch((e)=>console.error(e));
