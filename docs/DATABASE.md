# Chronos — Database

Schema: prisma/schema.prisma (Phase 1)

Core entities:
- Provider (id UUID, name, timezone IANA, slug unique, cancellationWindowHours)
- AvailabilityRule (providerId FK, dayOfWeek, startTime/endTime, active)
- Slot (providerId FK, slotStartUtc, slotEndUtc, status enum, UNIQUE(providerId, slotStartUtc))
- Booking (slotId UNIQUE, providerId, clientId, status, version, notes/clientNotes)
- Client (email unique, name, company, phone, avatarUrl)
- EventType (providerId FK, title, durationMinutes, price, slug unique, active)
- ReminderJob (bookingId FK, offsetType enum, sentAt nullable, status, UNIQUE(bookingId, offsetType))

Constraints implemented at DB level: unique constraints, FKs, indexes.
No SELECT-then-INSERT double-booking protection; rely on DB unique.
