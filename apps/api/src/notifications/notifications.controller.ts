import { Controller, Get, Post, UseGuards, Headers } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private svc: NotificationsService) {}
  @Get()
  async list(@Headers('cookie') cookie?: string) {
    const clientId = cookie?.match(/chronos_session=([^;]+)/)?.[1];
    // Provider scoping: if session represents provider, use providerId; for simplicity use clientId here
    // Real implementation uses session type; kept minimal
    if (!clientId) return { notifications: [], unread: 0 };
    const list = await this.svc.listForClient(clientId);
    const unread = list.filter((n: any) => !n.read).length;
    return { notifications: list, unread };
  }
  @Post('read-all')
  async readAll(@Headers('cookie') cookie?: string) {
    const clientId = cookie?.match(/chronos_session=([^;]+)/)?.[1];
    if (!clientId) return { read: 0 };
    const res = await this.svc.markAllReadForClient(clientId);
    return { read: res.count || 0 };
  }
}
