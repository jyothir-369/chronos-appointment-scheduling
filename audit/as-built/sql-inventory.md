# SQL INVENTORY (from source + DB at 00c5746)

Source query patterns: apps/api/src/bookings/bookings.controller.ts uses direct pg Pool (
query: 'SELECT ... FROM bookings WHERE provider_id = $1', parameterized with $1). 
No ORM/interceptor for query construction; validation via DTO (create-booking.dto) only.
Tables touched: bookings, slots, providers, clients, event_types, services, availability_rules.
Tenant filter: provider_id parameter present in listing and detail; not enforced by DB row-level security.
Parameterized: yes (Pool.query with params array).
Unbounded: list endpoint has no pagination parameter enforced at SQL layer.
