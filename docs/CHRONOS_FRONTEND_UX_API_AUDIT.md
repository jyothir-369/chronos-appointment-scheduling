# Chronos Frontend + UX + API Integration Audit
Audit-only. Zero mutations.

Executive Summary
- Next.js 16.3 / ESM / Tailwind v4.3 / workspace
- Pages mapped: analytics, appointments, availability, billing, book, bookings, calendar, clients, dashboard, event-types, reports, settings
- API: lib/api.ts uses mock-data (USE_MOCK) in dev; credentials: include
- Timezone: dashboard uses provider timezone; bookings page UTC; client_timezone hardcoded

## Critical Findings
- [CRITICAL] Mock data masks production errors
- [HIGH] Client timezone hardcoded both layers
- [HIGH] 401 retry uses empty POST to /auth/login
- [MEDIUM] Dashboard filter relies on browser Date parsing

Status: Audit complete; zero mutations; SlotStatus rename deferred; DB unchanged.
