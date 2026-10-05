# ER-DIAGRAM (from DB 5433, 11 tables)

erDiagram
    PROVIDERS ||--o{ SLOTS : owns
    PROVIDERS ||--o{ AVAILABILITY_RULES : defines
    PROVIDERS ||--o{ BLOCKED_PERIODS : blocks
    PROViders ||--o{ BOOKINGS : receives
    SLOTS ||--o{ BOOKINGS : booked
    CLIENTS ||--o{ BOOKINGS : makes
    EVENT_TYPES ||--o{ BOOKINGS : typed
    SERVICES ||--o{ BOOKINGS : billed
    BOOKINGS ||--o{ WAITLIST_ENTRIES : waitlisted
    BOOKINGS ||--o{ IDEMPOTENCY_KEYS : guarded
    REMINDER_JOBS ||--o{ BOOKINGS : reminds
