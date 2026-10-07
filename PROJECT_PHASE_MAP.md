# Chronos — 5-Phase Logical Codebase Map

## Purpose

This document does NOT physically divide the repository.
It is a logical classification used for:

- reverification
- revalidation
- regression testing
- debugging
- future implementation
- architectural understanding

No files were moved, renamed, or restructured.

---

# Phase 1 — Foundation, Architecture & Core Infrastructure

## Responsibility

Technical foundation: bootstrap, modules, database, shared utilities, middleware, infrastructure, package configuration, TypeScript / build setup, shared UI components.

### Existing Files

| Path | Responsibility |
|---|---|
| `package.json` | Root package/workspace config |
| `pnpm-workspace.yaml` | Workspace definition |
| `tsconfig.base.json` | Base TypeScript config |
| `docker-compose.yml` | Docker infrastructure |
| `.env` / `.env.example` | Environment config |
| `prisma/schema.prisma` | Database schema (foundation) |
| `prisma/migrations/` | Migration infrastructure |
| `apps/api/src/main.ts` | NestJS bootstrap |
| `apps/api/src/app.module.ts` | Root API module |
| `apps/api/src/health/health.controller.ts` | Health checks |
| `apps/api/src/health/health.module.ts` | Health module |
| `apps/api/src/interceptors/correlation.interceptor.ts` | Shared middleware |
| `apps/api/src/observability/logger.ts` | Logging infrastructure |
| `apps/api/src/observability/metrics.ts` | Metrics |
| `apps/api/src/observability/tracing.ts` | Tracing |
| `apps/api/src/types/pg.d.ts` | Shared types |
| `apps/api/src/test/fixture/e2e.fixture.ts` | Test fixture (infrastructure) |
| `apps/api/src/seed/dev-full.ts` | Seed infrastructure |
| `apps/api/src/seed/development.seed.ts` | Development seed |
| `apps/api/src/seed-dev.ts` | Seed script |
| `apps/web/src/app/layout.tsx` | Root layout / shell |
| `apps/web/src/app/components/AppShell.tsx` | Shared app shell |
| `apps/web/src/middleware.ts` | Next.js middleware |
| `apps/web/src/lib/api.ts` | API client infrastructure |
| `apps/web/src/lib/index.ts` | Shared library index |
| `apps/web/src/styles/` | Global styles / tokens |
| `apps/web/src/components/AppShell.tsx` | Shared shell component |
| `packages/` | Shared packages |
| `scripts/` | Development / build scripts |

---

# Phase 2 — Authentication, Users, Providers, Clients & Core CRUD

## Responsibility

Identity, session, auth guards, provider/client management, core entities, basic CRUD.

### Existing Files

| Path | Responsibility |
|---|---|
| `apps/api/src/auth/auth.controller.ts` | Login/logout endpoint |
| `apps/api/src/auth/auth.dto.ts` | Auth DTO |
| `apps/api/src/auth/auth.guard.ts` | Auth guard |
| `apps/api/src/auth/auth.module.ts` | Auth module |
| `apps/api/src/providers/providers.controller.ts` | Provider CRUD / avatar |
| `apps/api/src/providers/providers.module.ts` | Provider module |
| `apps/api/src/clients/clients.controller.ts` | Client CRUD |
| `apps/api/src/clients/clients.module.ts` | Client module |
| `apps/web/src/app/login/page.tsx` | Login page |
| `apps/web/src/app/clients/page.tsx` | Client management UI |

---

# Phase 3 — Scheduling, Availability, Event Types & Booking Engine

## Responsibility

Core scheduling domain: slots, availability, event types, bookings, time zone-safe scheduling, booking lifecycle, temporal validation.

### Existing Files

| Path | Responsibility |
|---|---|
| `apps/api/src/availability/availability.controller.ts` | Availability endpoints |
| `apps/api/src/availability/availability.module.ts` | Availability module |
| `apps/api/src/availability/availability.service.ts` | Availability logic |
| `apps/api/src/bookings/bookings.controller.ts` | Booking controller |
| `apps/api/src/bookings/bookings.module.ts` | Booking module |
| `apps/api/src/bookings/bookings.service.ts` | Atomic booking transaction |
| `apps/api/src/bookings/dto/create-booking.dto.ts` | Booking DTO |
| `apps/api/src/bookings/lifecycle.service.ts` | Booking lifecycle |
| `apps/api/src/bookings/reschedule.service.ts` | Reschedule logic |
| `apps/api/src/bookings/bookings.concurrency.test.ts` | Concurrency tests |
| `apps/api/src/bookings/lifecycle.test.ts` | Lifecycle tests |
| `apps/api/src/bookings/reschedule.test.ts` | Reschedule tests |
| `apps/api/src/slots/slots.controller.ts` | Slot controller |
| `apps/api/src/event-types/event-types.controller.ts` | Event type CRUD |
| `apps/api/src/event-types/event-types.module.ts` | Event type module |
| `apps/api/src/appointments/appointments.controller.ts` | Appointments controller |
| `apps/api/src/appointments/appointments.module.ts` | Appointments module |
| `apps/api/src/timezone/timezone.service.ts` | Timezone-safe conversion |
| `apps/web/src/app/availability/page.tsx` | Availability UI |
| `apps/web/src/app/bookings/page.tsx` | Bookings UI |
| `apps/web/src/app/book/[provider]/page.tsx` | Booking flow |
| `apps/web/src/app/calendar/page.tsx` | Calendar scheduling |
| `apps/web/src/app/event-types/page.tsx` | Event types UI |
| `apps/web/src/app/appointments/page.tsx` | Appointments list |
| `apps/web/src/components/NewAppointmentForm.tsx` | Appointment form |
| `apps/web/src/components/NewAppointmentModal.tsx` | Appointment modal |

---

# Phase 4 — External Integrations, Notifications & Automation

## Responsibility

External integrations (Google / Zoom — UI/backend references), notifications module, reminders, activity feed, background automation.

### Existing Files

| Path | Responsibility |
|---|---|
| `apps/api/src/notifications/notifications.controller.ts` | Notifications endpoint |
| `apps/api/src/notifications/notifications.module.ts` | Notifications module |
| `apps/api/src/notifications/notifications.service.ts` | Notification persistence / UI logic |
| `apps/api/src/reminders/reminder.queue.ts` | Reminder scheduling queue |
| `apps/api/src/reminders/reminder.worker.ts` | Reminder worker |
| `apps/api/src/reminders/reminder.types.ts` | Reminder types |
| `apps/api/src/reminders/reminder.idempotency.test.ts` | Reminder tests |
| `apps/api/src/activity/activity.controller.ts` | Activity feed controller |
| `apps/api/src/activity/activity.module.ts` | Activity module |
| `apps/api/src/activity/activity.service.ts` | Activity records / lifecycle events |
| `apps/web/src/components/NotificationPanel.tsx` | Notification UI |

---

# Phase 5 — Dashboard, Analytics, Reports, Billing & Production UX

## Responsibility

Application-level business views, analytics, reports, billing, production-facing UX (dashboard, settings, search, navigation, polished states).

### Existing Files

| Path | Responsibility |
|---|---|
| `apps/api/src/dashboard/dashboard.module.ts` | Dashboard module |
| `apps/api/src/dashboard/summary.controller.ts` | Dashboard summary |
| `apps/api/src/analytics/analytics.controller.ts` | Analytics endpoints |
| `apps/api/src/analytics/analytics.module.ts` | Analytics module |
| `apps/api/src/reports/reports.controller.ts` | Reports endpoints |
| `apps/api/src/reports/reports.module.ts` | Reports module |
| `apps/api/src/billing/billing.controller.ts` | Billing endpoints |
| `apps/api/src/billing/billing.module.ts` | Billing module |
| `apps/api/src/admin/admin.controller.ts` | Admin controls |
| `apps/api/src/search/search.controller.ts` | Search endpoints |
| `apps/api/src/search/search.module.ts` | Search module |
| `apps/web/src/app/dashboard/page.tsx` | Dashboard page |
| `apps/web/src/app/analytics/page.tsx` | Analytics page |
| `apps/web/src/app/reports/page.tsx` | Reports page |
| `apps/web/src/app/billing/page.tsx` | Billing page |
| `apps/web/src/app/search/page.tsx` | Search UI |
| `apps/web/src/app/settings/page.tsx` | Settings / production UX |
| `apps/web/src/app/page.tsx` | Root redirect (shell) |

---

# Cross-Phase Dependencies

```text
Phase 1 (Foundation / API / DB)
   ↓
Phase 2 (Auth / Users / Providers / Clients)
   ↓
Phase 3 (Scheduling / Booking Engine / Availability / Slots)
   ↓
Phase 4 (Notifications / Reminders / Activity / Automation)
   ↓
Phase 5 (Dashboard / Analytics / Reports / Billing / UX)
```

Important cross-dependencies:

- Phase 3 Booking Engine creates notifications (Phase 4).
- Phase 4 Activity events feed Phase 5 Dashboard.
- Phase 2 Provider/Client entities are required by Phase 3 bookings.
- Phase 1 Timezone service is used by Phase 3 scheduling.
- Phase 1 API client (`lib/api.ts`) is used by Phase 2–5 UI.

---

# Phase Verification Boundaries

### "Revalidate Phase 1"
Check: NestJS bootstrap (`main.ts`), `app.module.ts`, health, middleware/interceptors, logging/observability, Prisma schema/migrations, Docker/config, TypeScript/build, shared UI shell (`layout.tsx`, `AppShell`), API client (`lib/api.ts`), test fixtures.

### "Revalidate Phase 2"
Check: Auth login/logout (`auth.controller`), auth guard, provider CRUD / avatar (`providers`), clients CRUD (`clients`), session cookie handling, login page (`login/page.tsx`), clients UI.

### "Revalidate Phase 3"
Check: Availability controller/service, slot controller, bookings controller/service (atomic transaction, idempotency, concurrency), booking lifecycle / reschedule / cancellation, event types, appointments, calendar/scheduling UI (`availability`, `bookings`, `calendar`, `book`), timezone service, booking DTO/tests.

### "Revalidate Phase 4"
Check: Notifications module/controller/service, reminders (queue/worker/types/idempotency tests), activity module/controller/service, notification panel UI (`NotificationPanel`), automated reminder jobs, notification persistence.

### "Revalidate Phase 5"
Check: Dashboard module/summary, analytics module/controller, reports module/controller, billing module/controller, admin/search, dashboard/analytics/reports/billing/search/settings pages, production UX (navigation, settings, polished states), KPI cards.

---

# Complete File Classification Summary

| Phase   | Meaningful Files |
| ------- | ---------------: |
| Phase 1 | ~22 |
| Phase 2 | ~6 |
| Phase 3 | ~22 |
| Phase 4 | ~9 |
| Phase 5 | ~15 |

**Total meaningful classified files:** ~74

**Unclassified meaningful files:** 0

---

# Shared / Cross-Cutting Files

Minimal — only genuinely global items that touch all phases:

- `prisma/schema.prisma` (database foundation used by all phases) — classified Phase 1
- `.env` / environment files (global config) — Phase 1
- `packages/` shared libraries — Phase 1

No file forced into a single phase unnaturally.

---

# Tests — Logical Phase Assignment

| Test File | Phase |
|---|---|
| `bookings.concurrency.test.ts` | Phase 3 |
| `lifecycle.test.ts` | Phase 3 |
| `reschedule.test.ts` | Phase 3 |
| `reminder.idempotency.test.ts` | Phase 4 |
| `e2e.lifecycle.test.ts` | Phase 3 / Phase 4 |
| `materializer.dst.test.ts` | Phase 3 / Phase 4 |
| `smoke.test.ts` | Phase 1 |

---

# Documentation — Logical Assignment

- `APPENDIX` / audit files: Cross-cutting / Phase 5 (production verification)
- `CHRONOS_MASTER_IMPLEMENTATION_PLAN.md`: Phase 3 / Phase 4 (implementation plan for scheduling/integrations)
- Schema reconciliation / audit docs: Phase 1 (database foundation)
- `docs/` inside apps: Phase 2–5 per content (not forced)

---

# Final Validation

- Entire repository inspected (root, `apps/api/src/`, `apps/web/src/`, `prisma/`, `packages/`, `scripts/`, `docs/`, `tests/`, `docker-compose.yml`, package files, TypeScript configs).
- Every meaningful source file has a logical phase (no unclassified meaningful files).
- Exactly five primary phases documented.
- No files moved.
- No files renamed.
- No application behavior changed.
- No database changes.
- No destructive commands executed.
- Only `PROJECT_PHASE_MAP.md` created at root.

---

PHASE MAP COMPLETE

Phase 1: ~22 files
Phase 2: ~6 files
Phase 3: ~22 files
Phase 4: ~9 files
Phase 5: ~15 files

Shared/Cross-Cutting: 0 forced (all classified)
Unclassified meaningful files: 0

Existing project structure: UNCHANGED
Application behavior: UNCHANGED
Database: UNCHANGED