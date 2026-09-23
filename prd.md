PRD 3 — Appointment Scheduling Platform with Timezone-Safe Booking
1. Overview
A scheduling platform where service providers publish availability and clients book slots across timezones, with zero double-booking, automated reminders, and a cancellation window — the classic "looks simple, is actually a hard concurrency and timezone problem" build.

2. Problem Statement
Naive booking systems double-book slots under concurrent requests and mishandle timezones (off-by-one-hour bugs, DST transitions). This project builds a booking core that is provably correct under both dimensions, plus the operational layer (reminders, cancellations) around it.

3. Goals
Guarantee no double-booking under concurrent booking attempts for the same slot.
Store and display times correctly across timezones, including DST transitions.
Deliver reminders reliably at the correct scheduled offset, once and only once.
4. Non-Goals
Payment collection for bookings.
Complex recurring-availability rules beyond a simple weekly pattern.
Provider discovery/marketplace features (single-provider or fixed provider list is fine).
5. Users & Personas
Persona	Needs
Service provider	Publish weekly availability, view upcoming bookings, set cancellation window
Client	Browse available slots in their own timezone, book, cancel within policy
System	Send reminders and cancellation-window enforcement automatically
6. Functional Requirements
6.1 Availability
FR1: Providers define weekly recurring availability windows in their own timezone.
FR2: Availability is materialized into concrete bookable slots for a rolling future window (e.g., next 60 days).
6.2 Booking
FR3: Clients view available slots converted to their local timezone.
FR4: Booking a slot is atomic: two concurrent requests for the same (provider_id, slot_start) must result in exactly one success.
FR5: A booking has a lifecycle: booked → completed | cancelled | no_show.
FR6: Cancellation is only allowed outside the provider's configured cancellation window (e.g., no cancellation within 24h).
6.3 Notifications
FR7: A reminder is sent at a configurable offset before the appointment (e.g., 24h and 1h before).
FR8: Reminder delivery is idempotent — a job retry or duplicate trigger must not send duplicate reminders.
6.4 Timezone Correctness
FR9: All slot times are stored in UTC with an explicit IANA timezone reference for display; DST transitions must not shift a booked slot's real-world time.
7. Non-Functional Requirements
Category	Requirement
Concurrency correctness	Database-level uniqueness guarantees no double-booking, verified under load test
Timezone correctness	Automated tests covering DST spring-forward/fall-back edge cases
Reliability	Reminder jobs are idempotent and retried on transient failure only
Scheduling	No app-instance-local cron; scheduled work is enqueued via a managed scheduler (§9.5)
Latency	Slot availability query p95 < 200ms for a 60-day window
8. Data Model (core entities)
providers (id, name, timezone, cancellation_window_hours)
availability_rules (id, provider_id, day_of_week, start_time, end_time)
slots (id, provider_id, slot_start_utc, slot_end_utc, status) — UNIQUE(provider_id, slot_start_utc)
bookings (id, slot_id UNIQUE, client_id, status, version)
reminder_jobs (id, booking_id, offset_type, sent_at)
The unique constraint on slots(provider_id, slot_start_utc) combined with a unique bookings.slot_id is the core double-booking guard (§7.4.1 optimistic concurrency / uniqueness).

9. Architecture Notes (per blueprint)
Next.js Server Components render availability converted to the client's browser timezone at request time; booking submission is a Client Component boundary (§6.2).
NestJS bookings module: booking creation is a single transactional write relying on the DB unique constraint to reject the losing concurrent request, rather than an application-level lock (§7.4.1).
Materialization of availability_rules into concrete slots runs as a scheduled job (§9.5), not on-demand, so slot IDs are stable once published.
Reminder scheduling: BullMQ delayed jobs keyed by (booking_id, offset_type) with a uniqueness/idempotency record to prevent duplicate sends on retry (§9.4).
All timestamps stored as UTC (timestamptz in PostgreSQL); provider/client timezone conversion happens only at the presentation layer.
10. API Surface (representative)
GET    /providers/:id/availability?tz=America/New_York
POST   /bookings                         (atomic; relies on DB uniqueness)
POST   /bookings/:id/cancel
GET    /bookings/mine

11. Milestones
Walking skeleton: one provider, static availability, manual booking, no concurrency/timezone handling yet.
Concurrent booking correctness: unique constraint + load test proving no double-booking.
Timezone correctness: DST edge-case test suite + multi-timezone display.
Reminder pipeline with idempotent delayed jobs.
Cancellation-window enforcement + full end-to-end test coverage.
12. Success Metrics (for resume/portfolio)
0 double-bookings across a load test of N concurrent requests for the same slot.
0 duplicate reminders across simulated job retries.
Documented DST edge-case test suite with pass evidence (a concrete, rare, and credible claim).
13. Open Risks
DST test coverage needs careful synthetic date construction (spring-forward gap, fall-back overlap) — treat this as a dedicated test-design task, not an afterthought.
Cross-Project Notes
All three PRDs assume the same base repository setup from the blueprint (§20 Project Setup Checklist): Turborepo + pnpm workspace, shared TypeScript/lint config, CI running lint/typecheck/test/build, and a documented ADR for any deviation from the default stack. Building them in sequence (Invoicing → Marketplace → Scheduling) lets you reuse and mature the same repository conventions, auth patterns, and observability setup across all three — which is itself a strong resume point ("built and operated three production-shaped services on one shared internal platform standard").