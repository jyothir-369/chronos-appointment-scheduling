import { Controller, Get, Query } from '@nestjs/common';
import { Pool } from 'pg';
@Controller('availability')
export class AvailabilityController {
  private pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chronos' });
  @Get()
  async list(@Query('provider_id') providerId?: string, @Query('date') date?: string) {
    const startOfDay = date ? `${date}T00:00:00Z` : new Date().toISOString().split('T')[0] + 'T00:00:00Z';
    const endOfDay = date ? `${date}T23:59:59Z` : new Date().toISOString().split('T')[0] + 'T23:59:59Z';
    const result = await this.pool.query(
      `SELECT id, slot_start_utc, status, provider_id FROM slots WHERE status = 'open' AND slot_start_utc >= $1 AND slot_start_utc < $2 ${providerId ? 'AND provider_id = $3' : ''} ORDER BY slot_start_utc ASC`,
      providerId ? [startOfDay, endOfDay, providerId] : [startOfDay, endOfDay]
    );
    return {
      provider_id: providerId || null,
      date: date || new Date().toISOString().split('T')[0],
      timezone: 'UTC',
      slots: result.rows.map((r) => ({ id: r.id, slot_start_utc: r.slot_start_utc, status: r.status, provider_id: r.provider_id })),
    };
  }
}
