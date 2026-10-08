import { Controller, Post, Body, Res, Req, UnauthorizedException } from '@nestjs/common';
import { AdminSessionService } from './admin-session.service.js';
import { PasswordService } from './password.service.js';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

@Controller('auth/admin')
export class AdminAuthController {
  private prisma = new PrismaClient();
  private sessionService = new AdminSessionService();
  private passwordService = new PasswordService();

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }, @Res() res: any) {
    const { email, password } = body || {};
    if (!email || !password) throw new UnauthorizedException('Credentials required');
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await this.passwordService.verifyPassword(password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const rawToken = randomBytes(32).toString('base64');
    await this.sessionService.createSession(admin.id, rawToken);
    res.cookie('chronos_admin_session', rawToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });
    return res.send({ ok: true, adminId: admin.id, email: admin.email, name: admin.name });
  }

  @Post('logout')
  async logout(@Req() req: any, @Res() res: any) {
    const cookie = req.headers?.cookie || '';
    const match = cookie.match(/chronos_admin_session=([^;]+)/);
    if (match) await this.sessionService.revokeSession(match[1]);
    res.clearCookie('chronos_admin_session', { path: '/' });
    return res.send({ ok: true });
  }
}
