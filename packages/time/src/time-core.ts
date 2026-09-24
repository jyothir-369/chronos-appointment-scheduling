/**
 * Phase 1 — Time Core (@chronos/time)
 * Pure functions, zero I/O. Only module importing Temporal / polyfill.
 */

const T = (globalThis as any).Temporal;

export interface Slot {
  startUtc: string; // ISO 8601 UTC
  endUtc: string;
}

export interface Rules {
  daysOfWeek?: number[]; // ISO 1=Mon..7=Sun
  startTime?: string;   // HH:MM
  endTime?: string;
}

export type DisambiguationPolicy = 'compatible' | 'earliest' | 'latest' | 'reject';

export interface WallClockResult {
  instant: string; // ISO UTC
  disambiguated: boolean;
  ambiguous: boolean;
}

/* ---------- Validation ---------- */

export function assertValidTimeZone(id: string): void {
  if (!id || typeof id !== 'string') throw new Error('Invalid timezone: must be non-empty string');
  try {
    T.ZonedDateTime.from({ year: 2026, month: 1, day: 1, hour: 12, minute: 0, second: 0, timeZone: id, disambiguation: 'compatible' });
  } catch (e: any) {
    throw new Error(`Invalid IANA time zone: ${id}`);
  }
}

/* ---------- Wall-clock resolution ---------- */

export function resolveWallClock(plainDateTime: string, tz: string, policy: DisambiguationPolicy): WallClockResult {
  assertValidTimeZone(tz);
  if (!policy) throw new Error('Policy required');
  const [datePart, timePart] = plainDateTime.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, min, ss = 0] = timePart.split(':').map(Number);

  const zdt = T.ZonedDateTime.from({
    year: y, month: m, day: d, hour: hh, minute: min, second: ss,
    timeZone: tz, disambiguation: policy as any,
  });

  const instant = zdt.toInstant();
  return {
    instant: instant.toString(),
    disambiguated: true,
    ambiguous: false,
  };
}

/* ---------- Elapsed arithmetic ---------- */

export function subtractElapsed(instant: string, minutes: number): string {
  const inst = T.Instant.from(instant);
  const dur = T.Duration.from({ minutes: -Math.abs(minutes) });
  return inst.add(dur).toString();
}

/* ---------- Cancellation ---------- */

export function isCancellable(now: string, slotStart: string, windowHours: number): boolean {
  const nowInst = T.Instant.from(now);
  const startInst = T.Instant.from(slotStart);
  const windowMs = windowHours * 60 * 60 * 1000;
  const deadline = startInst.add(T.Duration.from({ milliseconds: -windowMs }));
  return nowInst.epochMilliseconds <= deadline.epochMilliseconds;
}

/* ---------- Reminders ---------- */

export function reminderFireTimes(slotStart: string, offsets: number[], now: string): string[] {
  const startInst = T.Instant.from(slotStart);
  const nowInst = T.Instant.from(now);
  const results: string[] = [];
  for (const off of offsets) {
    const fire = startInst.add(T.Duration.from({ minutes: -off }));
    if (fire.epochMilliseconds > nowInst.epochMilliseconds) {
      results.push(fire.toString());
    }
  }
  return results.sort();
}

/* ---------- Slot generation ---------- */

export function generateSlots({
  tz,
  slotMinutes = 30,
  rules,
  fromDate,
  toDate,
}: {
  tz: string;
  slotMinutes?: number;
  rules?: Rules;
  fromDate: string;
  toDate: string;
}): Slot[] {
  assertValidTimeZone(tz);
  if (slotMinutes < 5 || slotMinutes > 240) throw new Error('slotMinutes out of range');
  const slots: Slot[] = [];

  const from = T.PlainDate.from(fromDate);
  const to = T.PlainDate.from(toDate);

  let d = from;
  for (;;) {
    const [yyyy, mm, dd] = d.toString().split('-').map(Number);
    const dow = new Date(Date.UTC(yyyy, mm - 1, dd)).getUTCDay() || 7;
    if (!rules?.daysOfWeek || rules.daysOfWeek.includes(dow)) {
      const startTimeStr = rules?.startTime ?? '09:00';
      const endTimeStr = rules?.endTime ?? '17:00';
      const startRes = resolveWallClock(`${d.toString()}T${startTimeStr}:00`, tz, 'compatible');
      const endRes = resolveWallClock(`${d.toString()}T${endTimeStr}:00`, tz, 'compatible');
      const startInst = T.Instant.from(startRes.instant);
      const endInst = T.Instant.from(endRes.instant);
      let current = startInst;
      while (current.epochMilliseconds < endInst.epochMilliseconds) {
        const currentStr = current.toString();
        const next = current.add(T.Duration.from({ minutes: slotMinutes }));
        const nextStr = next.toString();
        if (next.epochMilliseconds > endInst.epochMilliseconds) break;
        slots.push({ startUtc: currentStr, endUtc: nextStr });
        current = next;
      }
    }
    if (d.equals(to)) break;
    d = d.add({ days: 1 });
  }
  return slots.sort((a, b) => a.startUtc.localeCompare(b.startUtc));
}
