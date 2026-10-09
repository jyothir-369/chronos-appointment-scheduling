import { CanActivate, ExecutionContext, UnauthorizedException, Injectable } from '@nestjs/common';
import { AdminSessionService } from './admin-session.service.js';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private sessionService: AdminSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookie = req.headers?.cookie || '';
    const match = cookie.match(/chronos_admin_session=([^;]+)/);
    if (!match) throw new UnauthorizedException('Admin session required');
    const sessionToken = match[1];
    const session = await this.sessionService.findByToken(sessionToken);
    if (!session || new Date() > session.expiresAt) {
      throw new UnauthorizedException('Admin session invalid or expired');
    }
    req.admin = session.admin;
    return true;
  }
}
