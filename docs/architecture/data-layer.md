# Data Layer — Ground Truth
Used: pg (Pool) via TypeORM-style queries in bookings.module/controller; DB is PostgreSQL 16 (docker).
Why: bookings.controller uses `Pool({connectionString: process.env.DATABASE_URL})`; PrismaClient imports (TS2305) fail because schema.prisma is missing.
Where migrations live: none (folder empty); schema is in DB (10 tables); reproducible from pg_dump.
Not used: Prisma (no schema); TypeORM entities (no entity files found).
