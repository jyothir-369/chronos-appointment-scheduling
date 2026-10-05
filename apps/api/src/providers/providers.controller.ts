import { Controller, Get, Param, Patch, Body, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';

@Controller('providers')
export class ProvidersController {
  private pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chronos:localdev@localhost:5433/chronos' });

  @Get('me')
  async getMe() {
    const devId = process.env.DEV_PROVIDER_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const res = await this.pool.query('SELECT * FROM providers WHERE id = $1', [devId]);
    if (res.rowCount === 0) throw new NotFoundException('Provider not found');
    return res.rows[0];
  }

  @Patch('me')
  async updateMe(@Body() body: any) {
    const devId = process.env.DEV_PROVIDER_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const res = await this.pool.query('UPDATE providers SET name = COALESCE($1, name), slug = COALESCE($2, slug), updated_at = now() WHERE id = $3 RETURNING *', [body.name || null, body.slug || null, devId]);
    if (res.rowCount === 0) throw new NotFoundException('Provider not found');
    return res.rows[0];
  }

  @Get(':id')
  async getProvider(@Param('id') id: string) {
    const res = await this.pool.query('SELECT * FROM providers WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFoundException();
    return res.rows[0];
  }
}
