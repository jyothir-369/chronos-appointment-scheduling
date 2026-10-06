import { Controller, Get, Headers } from '@nestjs/common';
import { ActivityService } from './activity.service.js';

@Controller('activity')
export class ActivityController {
  constructor(private svc: ActivityService) {}
  @Get()
  async list(@Headers('cookie') cookie?: string) {
    const clientId = cookie?.match(/chronos_session=([^;]+)/)?.[1];
    if (!clientId) return { activities: [], total: 0 };
    const list = await this.svc.listByClient(clientId);
    return { activities: list, total: list.length };
  }
}
