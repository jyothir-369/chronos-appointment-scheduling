import { Controller, Get, Param, Patch, Post, Body, NotFoundException, BadRequestException, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { ProviderAuthGuard } from '../auth/provider-auth.guard.js';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

@Controller('providers')
export class ProvidersController {
  private pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://chronos:localdev@localhost:5433/chronos' });

  @Get('me')
  @UseGuards(ProviderAuthGuard)
  async getMe(@Request() req: any) {
    const providerId = req.provider?.id || '';
    const res = await this.pool.query('SELECT id, name, slug, timezone, cancellation_window_hours, minimum_booking_notice, avatar_url, created_at, updated_at FROM providers WHERE id = $1', [providerId]);
    if (res.rowCount === 0) throw new NotFoundException('Provider not found');
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      timezone: row.timezone,
      cancellationWindowHours: row.cancellation_window_hours,
      minimumBookingNotice: row.minimum_booking_notice,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  @Patch('me')
  @UseGuards(ProviderAuthGuard)
  async updateMe(@Request() req: any, @Body() body: any) {
    const providerId = req.provider?.id || '';
    if (body.minimumBookingNotice !== undefined) {
      const v = Number(body.minimumBookingNotice);
      if (![4, 24, 48].includes(v)) throw new BadRequestException('Invalid minimumBookingNotice');
    }
        if (body.timezone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: body.timezone });
      } catch {
        throw new BadRequestException('Invalid timezone identifier');
      }
    }
    const res = await this.pool.query('UPDATE providers SET name = COALESCE($1, name), slug = COALESCE($2, slug), timezone = COALESCE($3, timezone), minimum_booking_notice = COALESCE($4, minimum_booking_notice), updated_at = now() WHERE id = $5 RETURNING id, name, slug, timezone, cancellation_window_hours AS cancellationWindowHours, minimum_booking_notice AS minimumBookingNotice, avatar_url AS avatarUrl, created_at, updated_at', [body.name || null, body.slug || null, body.timezone || null, body.minimumBookingNotice !== undefined ? Number(body.minimumBookingNotice) || 4 : null, providerId]);
    if (res.rowCount === 0) throw new NotFoundException('Provider not found');
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      timezone: row.timezone,
      cancellationWindowHours: row.cancellationWindowHours,
      minimumBookingNotice: row.minimumBookingNotice,
      avatarUrl: row.avatarUrl,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  @Post('me/avatar')
  @UseGuards(ProviderAuthGuard)
  async uploadAvatar(@Request() req: any, @Body() body: any) {
    const providerId = req.provider?.id || '';
    // If using raw multipart via middleware, file object arrives at body.file; otherwise handle base64
    const fileName = body.fileName || `avatar-${providerId}.png`;
    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9_.-]/g, '');
    const uploadDir = path.resolve('apps/public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    if (body.fileData) {
      fs.writeFileSync(filePath, Buffer.from(body.fileData, 'base64'));
    }
    const url = `/uploads/${safeName}`;
    const res = await this.pool.query('UPDATE providers SET avatar_url = $1, updated_at = now() WHERE id = $2 RETURNING *', [url, providerId]);
    if (res.rowCount === 0) throw new NotFoundException('Provider not found');
    return { status: 200, avatar_url: url, provider: res.rows[0] };
  }

  @Get(':id')
  async getProvider(@Param('id') id: string) {
    const res = await this.pool.query('SELECT * FROM providers WHERE id = $1', [id]);
    if (res.rowCount === 0) throw new NotFoundException();
    return res.rows[0];
  }
}
