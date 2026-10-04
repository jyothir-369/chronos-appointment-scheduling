import { Controller, Post, Body, Res } from '@nestjs/common';
import { LoginDto } from './auth.dto.js';
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: any) {
    // Development identity: first real client from DB
    const sessionValue = '11111111-1111-1111-1111-111111111111';
    res.cookie('chronos_session', sessionValue, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400000,
    });
    return {
      user: { id: sessionValue, role: 'client', email: body.email || 'm.vance@example.com' },
      session: sessionValue,
    };
  }
}
