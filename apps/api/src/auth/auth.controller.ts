import { Controller, Post, Body, Res } from '@nestjs/common';
import { LoginDto } from './auth.dto.js';
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: any) {
    // Development identity: first real client from DB
    const sessionValue = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    res.cookie('chronos_session', sessionValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000,
    });
    return {
      user: { id: sessionValue, role: 'client', email: body.email || 'm.vance@example.com' },
      session: sessionValue,
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: any) {
    res.clearCookie('chronos_session');
    return { ok: true };
  }
}
