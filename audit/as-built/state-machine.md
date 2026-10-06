# BOOKING STATE MACHINE (recovered from code + empty DB)

States (from code): PENDING, CONFIRMED, CANCELLED, COMPLETED (or inferred from service logic).
Transitions allowed by code (bookings.service, reschedule.service):
- create -> PENDING/CONFIRMED
- cancel (if not cancelled) -> CANCELLED (with window check)
- reschedule (if confirmed) -> reschedules slot (must not double-book)
DB constraint: bookings has provider_id + slot_id combination (double-booking prevention); no history table for status changes.
UI states not held by DB: any intermediate/reschedule-pending state not stored.
