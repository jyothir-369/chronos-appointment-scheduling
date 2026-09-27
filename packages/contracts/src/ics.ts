/**
 * .ics calendar export (§2.6) — static file derived from booking data
 * Out of scope: two-way Google/Outlook sync (§2.6 stretch explicitly excluded)
 */
export function generateICS(booking: { id: string; slotStartUtc: string; slotEndUtc: string; clientTimezone?: string; status: string }) {
  const start = booking.slotStartUtc.replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  const end = booking.slotEndUtc.replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chronos//Appointment//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@chronos`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    'SUMMARY:Chronos Appointment',
    `STATUS:${booking.status.toUpperCase()}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
