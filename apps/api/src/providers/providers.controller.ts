import { Controller, Get, Param, Patch, Post, Body, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

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

  @Post('me/avatar')
  async uploadAvatar(@Body() body: any) {
    // Multipart handled by external middleware or direct file save; here using base64/filepath from FormData adapter
    // For this repo architecture, a simple file-save endpoint with manual validation is sufficient
    const devId = process.env.DEV_PROVIDER_ID || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    // If using raw multipart via middleware, file object arrives at body.file; otherwise handle base64
    const fileName = body.fileName || `avatar-${devId}.png`;
    const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9_.-]/g, '');
    const uploadDir = path.resolve('apps/public/uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    if (body.fileData) {
      fs.writeFileSync(filePath, Buffer.from(body.fileData, 'base64'));
    }
    const url = `/uploads/${safeName}`;
    const res = await this.pool.query('UPDATE providers SET avatar_url = $1, updated_at = now() WHERE id = $2 RETURNING *', [url, devId]);
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
