import { Controller, Get, Post, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { AdminAuthGuard } from '../auth/admin-auth.guard.js';
import { AdminSessionService } from '../auth/admin-session.service.js';
import { PasswordService } from '../auth/password.service.js';
import { PrismaClient } from '@prisma/client';

@Controller('admin')
export class AdminController {
  private prisma = new PrismaClient();
  constructor(private sessionService: AdminSessionService, private passwordService: PasswordService) {}


  @Post('logout')
  @UseGuards(AdminAuthGuard)
  async logout(@Request() req: any) {
    const cookie = req.headers?.cookie || '';
    const match = cookie.match(/chronos_admin_session=([^;]+)/);
    if (match) await this.sessionService.revokeSession(match[1]);
    return { ok: true };
  }

  @Get('status')
  @UseGuards(AdminAuthGuard)
  async status(@Request() req: any) {
    return { authenticated: true, adminId: req.admin?.id, email: req.admin?.email, name: req.admin?.name };
  }
}
