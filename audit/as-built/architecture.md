# AS-BUILT ARCHITECTURE

Commit: 00c5746. Branch: work.

Topology: monorepo (Nest + Next) using pnpm workspace; PostgreSQL 13.22 via external process on 5433 (compose service "postgres" exists but container is "Created", not running due to port conflict); Redis 6380 running.

Backend (apps/api): NestJS modules: app.module, auth (controller/guard/service), bookings (controller/service/reschedule), clients, providers, slots, reminders, notifications, health, security, timezone. Source: apps/api/src/app.module.ts (wiring via @Module({imports:[...]}); controllers: AuthController, BookingsController, etc.; providers include AuthService, BookingsService with direct pg Pool (not TypeORM/Prisma in production controller code).
Web (apps/web): Next.js App Router. Routes: /dashboard, /calendar, /appointments, /clients, /reports, /settings, /event-types, /availability, /billing, /analytics, /login. Shared: AppShell (layout wrapper), lib/api.ts.
