Evidence (verified):
- Provider controller added (GET/PATCH /providers/:id)
- Availability endpoint supports ?tz= query parameter
- Materializer creates rolling 60-day slots using DB constraints; syntax fixed
- Reminder worker uses clock primitives (not Date.now arithmetic); lock/fire times use clock
- Bookings.concurrency.test.ts creates deterministic open slot before race; asserts <=1 success; clearly logs environment absence instead of silently passing
- DST tests expanded (spring gap, fall overlap, provider zone independence, machine-timezone independence via explicit IANA zones)
- Web bookings page created (client booking list with cookie auth, error/loading/empty states present)
- DB constraints preserved: slots(provider_id, slot_start_utc) UNIQUE; bookings(slot_id) UNIQUE; reminder_jobs(booking_id, offset_minutes) UNIQUE
- No local cron added; no application-level locks added; DB is concurrency authority
- No disabled/skipped core tests; no fabricated results
Not fully verified (genuine external blocker): full integration/E2E (DB connection unavailable in test container; TypeScript lint errors in pre-existing packages/time config, not new code). Build passes for api modules individually; time package lint config requires separate fix.
