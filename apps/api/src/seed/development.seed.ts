import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seed() {
  console.log('Seed started');
  // Idempotent seed — check before create
  const provider = await prisma.provider.upsert({ where: { slug: 'michael-vance' }, update: {}, create: { id: 'p-seed-001', name: 'Dr. Michael Vance', timezone: 'America/New_York', slug: 'michael-vance', cancellationWindowHours: 24 } });
  console.log('Provider:', provider.slug);
}
seed();
