# Chronos: Post-Audit Enhancement Plan

**From "code exists but unverified" to a demoable, trustworthy, good-looking product**
Based on: `Chronos Complete Codebase Audit` (2026-09-25) · Companion to `chronos-implementation-plan.md`

---

## 0. How to read this document

The audit's core finding isn't "the code is bad" — it's **"nothing has been proven to run."** Every fix below is graded by whether it closes a *correctness* gap (the thing could silently corrupt data or leak access) or a *polish* gap (the thing looks unfinished). Correctness gaps are fixed first, always, regardless of how good the UI plan looks. A beautiful booking calendar sitting on top of a stub `AppModule` is a worse deliverable than an ugly one that actually books.

Severity tags reused from the audit: **CRITICAL / HIGH / MEDIUM / LOW / INFO**.

---

## 1. Immediate correctness recovery (before any feature work)

These map directly to the audit's Critical/High findings. Nothing in §2–§5 should start until this section is green, because the audit's "PASS" claims in `docs/evidence/` are currently unverifiable and several load-bearing modules may not even be wired into the running app.

### 1.1 C1 — Restore the real `AppModule`

`app.module.ts` was overwritten to a stub that only imports `HealthController`. `BookingsModule` still exists on disk with real controllers but is not imported anywhere the server boots from.

- Diff `app.module.ts` against git history; re-import `ProvidersModule`, `AvailabilityModule`, `BookingsModule`, `NotificationsModule`, `HealthModule` (per the README's own architecture diagram).
- Add a **boot-time module inventory check**: on startup, log every controller path Nest actually registered (`app.getHttpAdapter()` route list or `HttpAdapterHost`), and fail CI if the list doesn't match an expected route manifest. This turns "the module got silently dropped" into a CI failure instead of a 3-week-later audit finding.
- Add a smoke test in CI: boot the app, `curl` every documented route, assert non-404. This is the single highest-leverage test in the whole plan — it would have caught C1 in seconds.

### 1.2 C2 / M5 — Kill every hardcoded ID; wire real auth

`BookingForm.tsx` posts a fixed `clientId`; `listBookings` ignores its header and queries a fixed `client_id` literal; `/providers/:id/availability` has no ownership check.

- Replace the stub `x-chronos-client-id` header trust with a real session: magic-link email auth (Resend, already in the stack) issuing a signed, httpOnly session cookie. NestJS guard reads the session, not a client-supplied header.
- `listBookings`: bind `client_id` from the authenticated session, never from query/header/hardcoded literal. Add an authorization test: client A cannot see or cancel client B's booking (403/404, not data leak).
- `BookingForm.tsx`: derive `clientId` from the session context, not a literal; derive `providerId` from the route/page params, not a hardcoded fallback.
- Add an IDOR test suite (this is the audit's §15 gap) covering: list bookings cross-client, cancel cross-client, provider dashboard cross-provider.

### 1.3 H2 — Finish the Temporal migration (I3 is currently false)

Three call sites still use `new Date()` where the invariant claims pure `@chronos/time`/`Temporal.Instant` math: reminder-offset arithmetic in `bookings.service.ts`, `lifecycle.service.ts`'s cancellation-window check, and (acceptably, per audit) day-of-week in `generateSlots()`.

- Move `nowUtc` computation to the injected `Clock` (already specified in the original plan, apparently not consistently used) everywhere except true day-of-week bucketing.
- Add an ESLint rule (already planned, apparently not enforced) that fails the build on `new Date(` / `Date.now()` outside `packages/time` and the one documented day-of-week line, with an inline `// eslint-disable-next-line chronos/no-raw-date -- day-of-week bucketing only` comment required to whitelist it. A silent exception is how this drifted in the first place.
- Re-run `dst-matrix.test.ts` and the property tests; until they execute in CI, "DST matrix pass" is a claim, not a fact — treat it as unverified per the audit and re-earn the badge.

### 1.4 H3 / H4 — Security module cleanup

`security.ts` imports `express-rate-limit`/`express` into a NestJS app (framework mismatch — breaks if the app ever runs on Fastify, and bypasses Nest's guard/interceptor pipeline for observability). CORS is `origin: true, credentials: true`, i.e. reflects any origin while allowing credentialed requests — a textbook CSRF/credential-leak setup.

- Replace with `@nestjs/throttler` (the framework-native package; supports Express and Fastify, GraphQL, WS; per-route and global limits; pluggable Redis storage so limits survive restarts and work across multiple API instances).
- Fix CORS to an explicit allow-list read from config (`https://app.chronos.example`, plus `http://localhost:3000` in dev only); never `origin: true` with `credentials: true` together.
- Add a CI check that fails the build if `origin: true` and `credentials: true` co-occur in any config file (cheap regex guard; catches regressions).

### 1.5 M1/M2 — Small correctness/config fixes bundled here since they're one-line

- Fix `API_URL` (3003 → 3001, or centralize in one `.env`-driven config consumed by both apps so this class of bug can't recur).
- Replace `Date.now() + Math.random()` idempotency-key generation with `crypto.randomUUID()`.
- Add a `vitest.config.ts` (the audit found it missing, which means "tests exist" was never actually "tests ran").

### 1.6 Execution gate

Before touching any feature in §2–§5, run and record, per the original plan's evidence format:

- `bookings.concurrency.test.ts` against a live DB → confirm exactly 1 success per slot across N concurrent attempts.
- `lifecycle.test.ts`, `constraint-tests.test.ts`, `dst-matrix.test.ts`.
- A reminder worker end-to-end run (enqueue → claim → fake-provider send → `sent`), including the Redis `FLUSHALL` recovery case.
- Full `docs/evidence/*` regenerated from actual CI runs, each file stamped with the CI run URL/commit hash so a future audit can distinguish "we ran this" from "we wrote this down."

**Exit criteria for §1:** the smoke test passes, no hardcoded identity strings remain in `apps/web` or `apps/api`, the ESLint raw-`Date` rule is enforced in CI, `@nestjs/throttler` is live, CORS is allow-listed, and every `docs/evidence/*.md` file has a corresponding green CI run.

---

## 2. Feature roadmap (multi-feature expansion)

Ordered by dependency and by how much they change the product's competitive shape. Each feature includes the schema/API delta and the new invariant it must not violate.

### 2.1 Multi-service, variable-duration bookings

Today one provider has one fixed slot length — fine for a portfolio piece, thin for a real product.

- **Schema:** add `services (id, provider_id, name, duration_minutes, buffer_minutes, price_cents nullable)`; `slots` gains `service_id` (nullable = "generic", or generate one slot set per service).
- **Materializer:** generate slots per `(provider, service)` pair; the exclusion constraint becomes `EXCLUDE USING gist (provider_id WITH =, tstzrange(...) WITH &&)` — unchanged, since it's provider-time-based, not service-based, so a provider still can't be double-booked across services at overlapping times.
- **Buffer time:** extend the excluded range by `buffer_minutes` on each side so back-to-back bookings of different durations always leave a gap.
- **UI:** service picker before the calendar (a "which service?" step feeds duration into slot rendering).

### 2.2 Reschedule (atomic cancel+rebook)

Currently a reschedule is "cancel, then hope the new slot is still open" — two round trips, two chances to fail halfway.

- New endpoint `POST /bookings/:id/reschedule { newSlotId, idempotencyKey }`. Single transaction: validate old booking ownership + version, validate cancellation-window rule doesn't block reschedule (product decision: reschedule can have a *different*, usually shorter, notice requirement — configurable per provider), compare-and-set the new slot to `booked`, reopen the old slot, update `bookings.slot_id`, re-point `reminder_jobs` at the new `fire_at_utc`, bump `version`.
- Reuses the exact compare-and-set + partial-unique-index machinery from booking creation — no new concurrency primitive needed, just a wider transaction.
- **UI:** "Reschedule" button on the client's booking card opens the same slot picker pre-filtered to the same service/provider.

### 2.3 Waitlist for fully booked days

- `waitlist_entries (id, provider_id, client_id, desired_date, desired_service_id, notified_at)`.
- On cancellation, a Job Scheduler tick (or an immediate post-commit hook) checks the waitlist for that provider/date, notifies the earliest unnotified match via the existing notification adapter, and gives them a short claim window (e.g., 15 minutes) before moving to the next entry — implemented as a `reminder_jobs`-style claim row so it inherits the same idempotency and reconciler pattern rather than inventing a new one.

### 2.4 Provider blocked time / time off

- `blocked_periods (id, provider_id, range tstzrange, reason)`, itself under an `EXCLUDE USING gist` against `slots` open status via a trigger, or simpler: materializer treats blocked periods as a subtraction pass before generating slots, and a reconcile step cancels+notifies any already-booked slot that a new blocked period retroactively covers (should be rare, but must not be silently swallowed).
- **UI:** provider dashboard gets a "block time off" action directly on the weekly calendar, drag-to-select.

### 2.5 SMS channel (stretch, per original plan)

- Add `NotificationChannel` implementations behind the existing provider-adapter interface (already designed for this in Phase 6 of the base plan); Twilio-class provider with its own idempotency key format mapped through the same `reminder_jobs` claim row. No schema change beyond a `channel` column on `reminder_jobs` and a per-client channel preference.

### 2.6 Calendar export (.ics) and external calendar sync

- `.ics` generation on booking confirmation and reminder emails (static file, computed from the stored UTC instant + `display_tz`, no new invariant risk since it's read-only derived data).
- Stretch: two-way sync via a connected calendar (Google/Outlook) is a large surface (OAuth, webhook freshness, write conflicts) — explicitly out of scope for this round; call it out as a future ADR rather than half-building it.

### 2.7 Provider analytics dashboard

- Booking volume, cancellation rate, no-show rate, fill rate by day-of-week/time-of-day, all computed from existing tables (no new invariant). This is a good "impressive but cheap" feature: it's read-only aggregation and pairs well with the UI polish in §3 (a nice chart is a strong resume/demo signal for very little correctness risk).

---

## 3. UI/UX overhaul (making it look and feel like a real product)

The audit notes real accessibility groundwork already exists (`aria-live`, `role="status"`) but flags no focus management, no loading boundaries, hardcoded API URLs bleeding into UX, and no visual design direction mentioned anywhere. Treat this as a from-scratch design pass, not a patch.

### 3.1 Design system foundation

- Adopt **shadcn/ui** (Radix/Base UI primitives + Tailwind) as the component base — it's the current default recommendation for Next.js/TypeScript projects and ships production-ready calendar and date-picker patterns instead of hand-rolled ones, which removes a whole class of "did we handle keyboard nav / disabled dates / range selection correctly" bugs.
- Establish a small **design token set** up front (spacing scale, radius, one accent color, semantic color roles for success/warning/danger/info) rather than ad hoc Tailwind classes scattered per component — this is what separates "looks like a template" from "looks intentional."
- Pick **one distinctive typographic choice** (a good variable font pairing — one for numerals/times since a scheduling app displays a lot of them, one for body text) instead of the default system stack; this alone makes a huge perceived-quality difference for very little effort.
- Dark mode from day one (token-based, not an afterthought retrofit) — trivial with shadcn's CSS-variable approach, expected by any technical reviewer.

### 3.2 The booking flow (the product's hero moment)

This is what a portfolio reviewer or a real user will actually click through, so it gets the most design attention:

- **Two-pane scheduler**: calendar/date picker on one side, scrollable time-slot list on the other, in one card — this pattern (already available as a ready-made shadcn block) is the industry-standard shape for appointment booking because it matches the mental model "pick a day, then pick a time" without a page reload.
- **Slot list**, not a grid of every theoretical time: only real open slots render, grouped by morning/afternoon/evening, each showing the local time **and** the zone abbreviation/offset (per the timezone-correctness work — never show a bare "9:00 AM" with no zone context).
- **Optimistic but honest submission state**: disable the button and show a named loading state ("Reserving your slot…") the instant the request fires — never a silent double-clickable button, since that's exactly the race the backend is built to reject, and a 409 after a lazy click is a worse experience than a button that's visibly "thinking."
- **Explicit conflict recovery**: if the compare-and-set loses the race (409), don't show a generic error — refresh the slot list in place, highlight that the chosen slot just became unavailable, and let them pick again in the same view. This turns the concurrency guarantee into a *visible* feature instead of an invisible backend detail — worth calling out on a portfolio, since "we handle races gracefully in the UI too" is a stronger signal than the guarantee alone.
- **Confirmation state** with the booking's local time, an `.ics` download (§2.6), and a clear cancellation-window disclosure ("Free cancellation until Tue 9:00 AM IST").

### 3.3 Cross-cutting UI fixes (closing the audit's Low/Medium findings properly, not just patching)

- **Loading boundaries:** wrap the availability fetch in a Suspense boundary with a skeleton slot-list (matching the eventual layout, not a generic spinner) — the audit specifically flagged this as missing.
- **Focus management:** on booking confirmation and on error states, move focus to the confirmation/error region and announce via the existing `aria-live` regions — the ARIA attributes already exist, they're just not wired to actual focus movement, which is the part that matters for keyboard/screen-reader users.
- **Error taxonomy in the UI, not just the API:** the audit found no `422` (idempotency-key reuse) handling in the UI. Build one small shared "API error → user message" mapper covering `409 slot_unavailable`, `412 version_conflict`, `403 cancellation_window_passed`, `422 idempotency_key_reuse`, each with a distinct, actionable message (not a generic toast).
- **Timezone affordance:** a small, always-visible "Times shown in {zone} · change" control near the calendar (reading/writing the same `tz` cookie the server already respects) — makes the app's core selling point visible instead of buried in a cookie.
- **Provider dashboard:** weekly availability editor as a visual grid (click-drag to toggle windows) rather than a form with day/start/end fields — this is the single highest-effort/highest-payoff UI investment for the provider side, since a form-based rule editor is what makes scheduling tools feel like 2015 software.
- **Mobile-first pass:** the audit notes a responsive grid exists but wasn't deeply reviewed; do a real pass on the booking flow specifically at 375px width, since that's the realistic usage pattern for "client books an appointment."

### 3.4 Motion and micro-interactions (cheap, high perceived-quality)

- Slot selection: subtle scale/highlight on hover and selection, not just a color change.
- Panel transitions between "pick date" → "pick time" → "confirm" as a lightweight animated step transition rather than a hard reload — reinforces the two-pane flow as one continuous action.
- Skeleton-to-content fade on slot list load, keyed off the actual data shape so it doesn't jump/reflow.

Keep all of this restrained — a scheduling tool should feel calm and fast, not flashy. The goal is "obviously well-made," not "obviously animated."

---

## 4. Observability, security, and ops follow-through

Carrying forward the audit's Medium/Low findings that aren't pure UI:

- Replace `console.log(JSON.stringify(...))` with a real structured logger (Pino is the common NestJS pairing) emitting to stdout in JSON, with a correlation/request ID propagated from an interceptor through to the reminder worker logs — the audit specifically noted no correlation IDs exist, which makes debugging a cross-service reminder failure very hard.
- Wire the existing but unverified `metrics.ts`/`tracing.ts` into an actual OpenTelemetry exporter; add the metrics the base plan already named (`booking_conflicts_total`, reminder lag, materializer horizon) as real counters, not aspirational names in a file nobody reads from.
- Alert on `reminder_jobs.status = 'failed'` and on materializer horizon dropping below the configured floor — both were called out as gaps.
- Remove `.kilo/worktrees/` artifacts from the repo (hygiene, but cheap to fix and a low-signal file explains why a reviewer might see it and wonder what else is stale).

---

## 5. Sequencing

| Stage | Content | Gate to move on |
|---|---|---|
| **A — Recovery** | §1 in full | Smoke test + concurrency test + DST suite all green in CI, no hardcoded IDs remain |
| **B — Foundation** | §3.1 design system, §4 logging/correlation IDs | Design tokens in place; every log line has a request ID |
| **C — Hero flow** | §3.2, §3.3 (booking flow + cross-cutting fixes) | Full book → confirm → cancel journey passes Playwright in 3 time zones with the new UI |
| **D — Feature depth** | §2.1 (services), §2.2 (reschedule) | New flows pass the same concurrency/idempotency test pattern as the original booking flow |
| **E — Differentiators** | §2.3–2.7, §3.4 motion pass | Each new feature has its own invariant test before merging, no exceptions |

Do not let Stage E start before Stage A is fully closed — that's exactly the trap this audit caught: attractive-sounding claims (reschedule! waitlist! analytics!) sitting on top of a booking core that was never confirmed to run.

---

## 6. Sources consulted (checked 25 Sep 2026)

- `@nestjs/throttler` (framework-native rate limiting, Express/Fastify/GraphQL/WS support, pluggable storage): https://github.com/nestjs/throttler
- shadcn/ui calendar and appointment-picker patterns (production-ready booking-flow components, two-pane date+time selection as the standard shape): https://reui.io/components/calendar , https://dev.to/wrap-pixel/shadcn-date-picker-38dh , https://21st.dev/@ruixen.ui/components/calendar-scheduler
- Prior research on NestJS 12 / Node 26 / Temporal / BullMQ / Postgres exclusion constraints: see `chronos-implementation-plan.md` §12, unchanged and still applicable to this enhancement round.
