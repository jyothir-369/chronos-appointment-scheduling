import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '../email/unsubscribe.token.js';

@Controller('unsubscribe')
export class UnsubscribeController {
  private readonly prisma = new PrismaClient();

  @Get('reminders')
  async unsubscribeReminders(@Query('token') token?: string) {
    if (!token || typeof token !== 'string') {
      throw new HttpException('Invalid unsubscribe request.', HttpStatus.BAD_REQUEST);
    }
    const payload = verifyToken(token);
    if (!payload) {
      throw new HttpException('Invalid or expired unsubscribe link.', HttpStatus.BAD_REQUEST);
    }
    const client = await this.prisma.client.findUnique({ where: { id: payload.sub } });
    if (!client) {
      throw new HttpException('Client not found.', HttpStatus.NOT_FOUND);
    }
    await this.prisma.$executeRaw`UPDATE clients SET reminders_opt_out = true WHERE id = ${payload.sub}`;
    return { success: true, message: 'You have been unsubscribed from appointment reminders.' };
  }
}
