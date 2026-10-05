## 3. Appointment Scheduling Platform with Timezone-Safe Booking
**Problem:** Service providers publish availability; clients book slots across timezones with no double-booking, plus reminder notifications and cancellation windows.
**Blueprint patterns exercised:** Idempotent booking writes under retry (§7.3), scheduled work via managed scheduler → enqueued job, not app-level cron (§9.5), optimistic concurrency (ETags/version fields) to prevent double-booking races (§7.4.1).
**Stack:** Next.js Server Components for availability display, NestJS `bookings` module, PostgreSQL unique constraint on `(provider_id, slot_start)`, BullMQ for reminder emails/SMS at scheduled offsets.
**What makes it resume-worthy:** Timezone + concurrency correctness is a genuinely hard, well-understood class of bug — solving it visibly signals real engineering judgment.
