# PROJECT CONTEXT — Chronos

Documented only. No files modified except this report.

## 1. Project overview
- Product: Timezone-safe appointment scheduling platform (Chronos)
- Users: Providers, clients, workspace admins
- Goals: Schedule/book across timezones; manage slots/availability/bookings
- Status: UI redesign complete (dark Chronos dashboard); backend DB/config discovered; DB server not running

## 2. Tech stack
- Frontend: Next.js 16.3 / React / TypeScript / Tailwind CSS v4 / Lucide icons / Inter font / dark theme
- Backend: NestJS / PostgreSQL / Prisma (schema exists) / pg Pool (availability)
- Package manager: pnpm (v12.6.0)
- Scripts: dev (next dev), build, test, lint, typecheck
- Env (names only): DATABASE_URL, REDIS_URL, NODE_VERSION, NO_REAL_AUTH
- Run web: pnpm --filter chronos-web dev (from apps/web)
- Run API: pnpm --filter @chronos/api dev (from apps/api)

## 3. Folder structure (root = /c/Users/raghava/OneDrive/Desktop/Chronos — Timezone-Safe Appointment Scheduling Platform)
.
apps/api/           — NestJS backend
apps/web/           — Next.js frontend
packages/db/        — SQL migrations + seed
packages/config/    — shared config
packages/contracts/ — shared contracts
packages/time/      — timezone utilities
packages/types/     — shared types
packages/ui/        — UI kit
prisma/             — Prisma schema (FOUND at root)
docs/               — docs/ADR

## 4. Frontend inventory
Routes (in apps/web/src/app/):
- / (page.tsx) — landing
- /dashboard/page.tsx — dashboard (rebuild in dark Chronos)
- /book/[provider]/page.tsx — booking page (rebuild)
- /appointments/page.tsx — appointments
- /calendar/page.tsx
- /clients/page.tsx
- /settings/page.tsx
- /availability/page.tsx
- /event-types/page.tsx
Layout: RootLayout (layout.tsx) + AppShell + Sidebar + Topbar
Components: Sidebar, Topbar, AppShell, BookingConfirmation, BookingSuccess, SkeletonRow, AvailabilityError, EmptyAvailability, TimeDisplay, EmptyState, PageShell
Design: dark (#080D18), navy cards (#0F172A), purple accent (#6366F1), thin borders, Inter font
State: local useState; no global store visible; server data via fetch/api.ts
Forms: BookingForm (exists but rebuilt page uses slot buttons)

## 5. Backend inventory
- PostgreSQL (docker-compose.yml: postgres:16-alpine, port 5433, DB chronos)
- Prisma schema: prisma/schema.prisma (Found — was missed earlier due to CWD confusion)
- Bookings controller: apps/api/src/bookings/bookings.controller.ts (uses PrismaClient, compare-and-set)
- Availability: apps/api/src/availability/availability.controller.ts (created — uses pg Pool, reads slots table)
- DB migrations: packages/db/migrations/ (001-006 SQL + tests + seed)
- Seed file: packages/db/migrations/003_seed_data.sql
- Key models from schema: Provider, AvailabilityRule, Slot, Booking, Client, EventType, ReminderJob

## 6. Contracts / mismatches
- Bookings controller uses Prisma (tx.slot.findUnique); availability controller uses pg Pool directly
- No shared API client/types file visible for booking/availability
- Frontend uses apiFetch (lib/api.ts) to backend at NEXT_PUBLIC_API_URL

## 7. Work in progress / git
- Branch: work (current)
- Uncommitted: many deleted/modified files (design rebuild + availability + build fixes)
- Recent commits: dependency updates, timezone fixes, booking enhancements
- Design pass complete; backend DB not yet running

## 8. Quality / build
- Web build: COMPILLED successfully after rm -rf .next + pnpm install (Next 16.3.0)
- Previous failure: .next chunk proxy error (environment, fixed by clean + reinstall)
- API build: Not fully verified (workspace type errors from @nestjs imports)
- Type errors: Pre-existing in api (bookings.controller implicit any, missing @prisma/client in some envs)
- Lint: Not fully run
- Tests: Not run

## 9. Open questions
- Where is the actual seed/run command for database? (packages/db/scripts?)
- Is docker-compose intended to start DB, or is PostgreSQL meant to run locally?
- Why does .env DATABASE_URL (localhost:5432) differ from docker-compose (5433 / user chronos)?
- Where is the generated Prisma client after generation attempt?
- Should availability controller use Prisma instead of raw pg Pool?

## 10. Suggested rebuild order (backend changing in parallel)
1. Start DB (docker-compose or local Postgres) — BLOCKED
2. Run migrations + seed — BLOCKED
3. Generate Prisma client from existing schema — ATTEMPTED (verify location)
4. Verify booking transaction with real DB — BLOCKED
5. Verify availability endpoint with real slots — BLOCKED
6. Connect frontend dashboard to real bookings data — BLOCKED until DB live

## 11. Files to read in full (10-15)
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/book/[provider]/page.tsx
- apps/web/src/components/AppShell.tsx
- apps/web/src/components/Sidebar.tsx
- apps/api/src/bookings/bookings.controller.ts
- apps/api/src/bookings/bookings.module.ts
- apps/api/src/availability/availability.controller.ts
- apps/api/src/availability/availability.module.ts
- prisma/schema.prisma
- packages/db/migrations/003_seed_data.sql
- apps/web/src/lib/api.ts
- apps/web/src/components/BookingConfirmation.tsx
- docs/DATABASE.md
