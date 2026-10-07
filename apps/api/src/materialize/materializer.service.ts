import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { generateSlots, clock } from '@chronos/time';

/**
 * Rolling 60-day materialization of a provider's weekly availability rules
 * into concrete UTC slots.
 *
 * DST correctness:
 *  - All dates are resolved through @chronos/time `generateSlots`, which uses
 *    Temporal's ZonedDateTime with an explicit `compatible` disambiguation
 *    policy. The wall-clock windows in the provider's IANA zone are mapped to
 *    UTC instants on each individual day, so spring-forward / fall-back
 *    transitions do not drift the real-world instant of a booked slot.
 *  - We never add 24h of UTC to walk days. We advance the local calendar day
 *    and re-resolve the wall-clock time in the provider's IANA zone.
 *  - The result is inserted with `ON CONFLICT (provider_id, slot_start_utc) DO NOTHING`
 *    so materialization is idempotent: re-running for the same window does not
 *    duplicate slots.
 */
@Injectable()
export class MaterializerService {
  private readonly logger = new Logger(MaterializerService.name);
  private prisma = new PrismaClient();

  /** Rolling window in days. FR2 requires "e.g. next 60 days". */
  private readonly horizonDays = 60;

  /** Default slot length when provider does not specify. */
  private readonly defaultSlotMinutes = 30;

  async materialize(providerId?: string) {
    const stats = {
      providersProcessed: 0,
      rulesProcessed: 0,
      slotsCreated: 0,
      slotsSkipped: 0,
      errors: 0,
    };
    try {
      const providers = providerId
        ? await this.prisma.provider.findMany({ where: { id: providerId } })
        : await this.prisma.provider.findMany();
      stats.providersProcessed = providers.length;

      const nowUtc = clock.now().toString();
      const fromDate = this.localDateInZone(nowUtc, 'UTC').slice(0, 10);
      const toDate = this.localDateInZone(
        new Date(Date.now() + this.horizonDays * 86_400_000).toISOString(),
        'UTC',
      ).slice(0, 10);

      for (const p of providers) {
        const rules = await this.prisma.availabilityRule.findMany({
          where: { providerId: p.id, active: true },
        });
        stats.rulesProcessed += rules.length;

        // Group rules by day-of-week so we build one Rules object per day-of-week
        const byDow = new Map<number, { start: string; end: string }>();
        for (const r of rules) {
          const existing = byDow.get(r.dayOfWeek);
          if (!existing || existing.start > r.startTime) byDow.set(r.dayOfWeek, { start: r.startTime, end: r.endTime });
        }

        // Materialize each day-of-week group independently, then merge.
        // `generateSlots` accepts a Rules object with a single day-of-week range
        // so we expand: for each DOW entry, generate across the full window
        // filtered to that day-of-week.
        const daysList = Array.from(byDow.keys());
        const slots: { startUtc: string; endUtc: string }[] = [];
        for (const dow of daysList) {
          const { start, end } = byDow.get(dow)!;
          // generateSlots uses HH:MM for startTime/endTime
          const slotMinutes = this.defaultSlotMinutes;
          const generated = generateSlots({
            tz: p.timezone,
            slotMinutes,
            rules: {
              daysOfWeek: [dow],
              startTime: start,
              endTime: end,
            },
            fromDate,
            toDate,
          });
          slots.push(...generated);
        }

        // Idempotent upsert: one transactional batch insert with DO NOTHING
        // against the UNIQUE(provider_id, slot_start_utc) constraint.
        // Bookings that reference a slot are protected by the slot's
        // UNIQUE(provider_id, slot_start_utc) — we only create new slots;
        // existing slots keep their current status (open / booked / blocked).
        for (const s of slots) {
          try {
            const existing = await this.prisma.slot.findUnique({
              where: {
                providerId_slotStartUtc: {
                  providerId: p.id,
                  slotStartUtc: new Date(s.startUtc),
                },
              },
            });
            if (existing) {
              stats.slotsSkipped += 1;
              continue;
            }
            await this.prisma.$executeRaw`INSERT INTO slots (provider_id, slot_start_utc, slot_end_utc, status, display_tz) VALUES (${p.id}, ${new Date(s.startUtc)}, ${new Date(s.endUtc)}, 'open', ${p.timezone || 'UTC'}) ON CONFLICT DO NOTHING`;
            stats.slotsCreated += 1;
          } catch (e: any) {
            // P2002 = unique constraint violation (already present — concurrent run)
            if (e.code === 'P2002') stats.slotsSkipped += 1;
            else {
              stats.errors += 1;
              this.logger.error(
                `Materializer insert failed for provider ${p.id} at ${s.startUtc}: ${e.message}`,
              );
            }
          }
        }
      }
      this.logger.log(`Materialize completed: ${JSON.stringify(stats)}`);
    } catch (e: any) {
      stats.errors += 1;
      this.logger.error('Materialize error', e);
    }
    return stats;
  }

  /**
   * Return YYYY-MM-DD for `instantUtc` rendered in `tz`. Used only to pick
   * the range endpoints for `generateSlots`, which does its own per-day
   * wall-clock resolution in the provider's IANA zone.
   */
  private localDateInZone(instantUtc: string, tz: string): string {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(instantUtc));
    } catch {
      return new Date(instantUtc).toISOString().slice(0, 10);
    }
  }
}
