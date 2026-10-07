import {
  Controller,
  Post,
  Body,
  Res,
  UnauthorizedException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoginDto } from './auth.dto.js';

@Controller('auth')
export class AuthController implements OnModuleDestroy {
  private readonly prisma = new PrismaClient();

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const email = body.email?.trim();

    if (!email) {
      throw new UnauthorizedException('Email required');
    }
    const client = await this.prisma.client.findUnique({
      where: { email },
    });

    if (!client) {
      throw new UnauthorizedException('Invalid email');
    }

    const sessionValue = client.id;

    res.cookie('chronos_session', sessionValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 86400000,
    });

    return {
      user: {
        id: client.id,
        role: 'client',
        email: client.email,
      },
      session: sessionValue,
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: any) {
    res.clearCookie('chronos_session');
    return { ok: true };
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
