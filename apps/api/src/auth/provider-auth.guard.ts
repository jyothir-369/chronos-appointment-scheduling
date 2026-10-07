import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ProviderSessionService } from './provider-session.service.js';

@Injectable()
export class ProviderAuthGuard implements CanActivate {
  constructor(private sessionService: ProviderSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookie = req.headers?.cookie || '';
    const match = cookie.match(/chronos_provider_session=([^;]+)/);
    if (!match) throw new UnauthorizedException('Provider authentication required');
    const rawToken = decodeURIComponent(match[1]);
    const tokenHash = await (this.sessionService as any).hashToken(rawToken);
    const result = await this.sessionService.findProviderByTokenHash(tokenHash);
    if (!result) throw new UnauthorizedException('Provider authentication required');
    req.provider = result.provider;
    return true;
  }
}
