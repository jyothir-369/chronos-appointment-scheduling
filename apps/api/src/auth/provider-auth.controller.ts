import { Controller, Post, Get, Body, Res, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PasswordService } from './password.service.js';
import { ProviderSessionService } from './provider-session.service.js';
import { ProviderAuthGuard } from './provider-auth.guard.js';

@Controller('auth/provider')
export class ProviderAuthController {
  private prisma = new PrismaClient();
  private passwordService = new PasswordService();
  private sessionService = new ProviderSessionService();

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }, @Res({ passthrough: true }) res: Response) {
    const email = (body.email || '').trim();
    const password = body.password;
    if (!email || !password) throw new UnauthorizedException('Invalid credentials');
    const provider = await this.prisma.provider.findUnique({ where: { email } });
    if (!provider || !provider.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const valid = await this.passwordService.verifyPassword(password, provider.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    const session = await this.sessionService.createSession(provider.id);
    res.cookie('chronos_provider_session', session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000,
      path: '/',
    });
    return {
      provider: {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        slug: provider.slug,
        timezone: provider.timezone,
      },
    };
  }

  @Get('me')
  @UseGuards(ProviderAuthGuard)
  async me(@Request() req: any) {
    const p = req.provider;
    return {
      provider: {
        id: p.id,
        name: p.name,
        email: p.email,
        slug: p.slug,
        timezone: p.timezone,
      },
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    const cookieStr = (res.req as any)?.headers?.cookie || '';
    const match = cookieStr.match(/chronos_provider_session=([^;]+)/);
    if (match) {
      const raw = decodeURIComponent(match[1]);
      try {
        const hash = await this.sessionService.hashToken(raw);
        await this.sessionService.revokeSession(hash);
      } catch { /* ignore */ }
    }
    res.clearCookie('chronos_provider_session', { path: '/' });
    return { ok: true };
  }
}
