import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
@Controller('notifications')
export class NotificationsController {
  @Get()
  async list() {
    return { notifications: [], unread: 0 };
  }
  @Post('read-all')
  async readAll() {
    return { read: 0 };
  }
}
